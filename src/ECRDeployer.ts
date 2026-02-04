import {
  BatchGetImageCommand,
  ECRClient,
  ECRClientConfig,
  PutImageCommand,
} from '@aws-sdk/client-ecr'
import { spawn } from 'promisify-child-process'
import fs from 'fs/promises'
import path from 'path'
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import { once } from './once.ts'
import loginToECR from './loginToECR.ts'
import os from 'os'

export interface ECRDeployerOptions {
  awsConfig?: ECRClientConfig
  /**
   * {@link ECRDeployer#release} will only add a version tag if the current git branch
   * is one of these branches (defaults to `['master', 'main', 'release']`)
   */
  releaseBranches?: string[]
  /**
   * The name of the ECR repository
   */
  repositoryName: string
}

/**
 * Class that implements our conventional process for deploying docker images to ECR.
 *
 * The CI build step should build the docker image (you may want to use {@link getNpmToken}
 * to pass an `NPM_TOKEN` build arg) and then call {@link push} to push the image to
 * ECR tagged with the git commit hash.
 *
 * The CI release step should call {@link release} to add tags for the git branch and
 * the `version` in your `package.json`.
 *
 * You may use the `OVERRIDE_ECR_BRANCH_TAG` and `OVERRIDE_ECR_VERSION_TAG` environment
 * variables to force specific tags for the branch and version.
 */
export class ECRDeployer {
  options: ECRDeployerOptions

  constructor(options: ECRDeployerOptions) {
    this.options = options
  }

  async getBranch() {
    return (
      process.env.OVERRIDE_ECR_BRANCH_TAG ||
      (
        await spawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
          encoding: 'utf8',
        })
      ).stdout.trim()
    )
  }

  async getCommitHash() {
    return (
      await spawn('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' })
    ).stdout.trim()
  }

  private getAWSAccountId = once(async () => {
    const sts = new STSClient(this.options.awsConfig || {})
    const { Account } = await sts.send(new GetCallerIdentityCommand())
    if (!Account) throw new Error(`failed to get AWS account id`)
    return Account
  })

  private async getRegion() {
    const ecr = new ECRClient(this.options.awsConfig || {})
    const region = await ecr.config.region()
    if (!region) {
      throw new Error(`Couldn't get AWS region.  Provide the AWS region by either:
- Setting the AWS_REGION environment variable
- Putting the region in your ~/.aws/config and setting AWS_SDK_LOAD_CONFIG=true
`)
    }
    return region
  }

  private async getECRHost() {
    return `${await this.getAWSAccountId()}.dkr.ecr.${await this.getRegion()}.amazonaws.com`
  }

  private async getProjectPackageJson() {
    const { findUp } = await import('find-up')

    const file = await findUp(async (dir) =>
      (
        !/\/node_modules\//.test(path.posix.normalize(dir)) &&
        (await fs.stat(path.join(dir, 'package.json')).then(
          (s) => s.isFile(),
          () => false
        ))
      ) ?
        path.join(dir, 'package.json')
      : undefined
    )
    if (!file) {
      throw new Error(`failed to find enclosing project package.json`)
    }
    return { file, contents: JSON.parse(await fs.readFile(file, 'utf8')) }
  }

  async getDockerTags(): Promise<{
    latest: string
    branch: string
    commitHash: string
    version?: string
  }> {
    const [commitHash, branch, packageJson] = await Promise.all([
      this.getCommitHash(),
      this.getBranch(),
      this.getProjectPackageJson(),
    ])
    const base = this.options.repositoryName
    const result: {
      latest: string
      branch: string
      commitHash: string
      version?: string
    } = {
      latest: base,
      branch: `${base}:${branch}`,
      commitHash: `${base}:${commitHash}`,
    }
    const { releaseBranches = ['master', 'main', 'release'] } = this.options
    if (releaseBranches.includes(branch)) {
      const version =
        process.env.OVERRIDE_ECR_VERSION_TAG || packageJson.contents.version
      if (typeof version !== 'string') {
        throw new Error(
          `failed to get version from ${path.relative(process.cwd(), packageJson.file)}`
        )
      }
      result.version = `${base}:${version}`
    }
    return result
  }

  async push() {
    const { awsConfig } = this.options
    const [ecrHost, { commitHash }] = await Promise.all([
      this.getECRHost(),
      this.getDockerTags(),
      loginToECR({ awsConfig }),
    ])
    try {
      await spawn('docker', ['tag', commitHash, `${ecrHost}/${commitHash}`], {
        stdio: 'inherit',
      })
    } catch {
      await spawn(
        'docker',
        ['tag', '-f', commitHash, `${ecrHost}/${commitHash}`],
        { stdio: 'inherit' }
      )
    }
    await spawn('docker', ['push', `${ecrHost}/${commitHash}`], {
      stdio: 'inherit',
    })
  }

  async release() {
    const [commitHash, ecrHost, tags] = await Promise.all([
      this.getCommitHash(),
      this.getECRHost(),
      this.getDockerTags(),
    ])
    const ecr = new ECRClient()

    const { repositoryName } = this.options

    const { images: [image] = [] } = await ecr.send(
      new BatchGetImageCommand({
        repositoryName,
        imageIds: [{ imageTag: commitHash }],
      })
    )

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const imageManifest = image?.imageManifest

    if (!imageManifest) {
      throw new Error(
        `failed to get image manifest for ${repositoryName}:${commitHash}`
      )
    }

    if (imageManifest) {
      // add other tags to ECR
      for (const key of Object.keys(tags) as (keyof typeof tags)[]) {
        if (key === 'latest' || key === 'commitHash') continue
        const tag = tags[key]?.replace(/^[^:]+:?/, '')
        if (!tag) continue
        // eslint-disable-next-line no-console
        console.error(`Adding tag ${ecrHost}/${tags[key]}`)
        try {
          await ecr.send(
            new PutImageCommand({
              repositoryName,
              imageManifest,
              imageTag: tag.substring(tag.indexOf(':') + 1),
            })
          )
        } catch (error) {
          if (
            error instanceof Object &&
            'code' in error &&
            error.code !== 'ImageAlreadyExistsException'
          ) {
            throw error
          }
        }
      }
    }
  }

  async getNpmToken(env = process.env) {
    const { NPM_TOKEN } = env
    if (NPM_TOKEN) return NPM_TOKEN
    try {
      const homedir = os.homedir()
      const npmrc = await fs.readFile(`${homedir}/.npmrc`, 'utf8')
      const match = /registry\.npmjs\.org\/:_authToken=(.+)/.exec(npmrc)
      if (match) return match[1]
    } catch {
      // ignore
    }
    throw new Error('Missing process.env.NPM_TOKEN or entry in ~/.npmrc')
  }
}
