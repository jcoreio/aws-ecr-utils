import AWS from 'aws-sdk'
import parseECRImageUri from './parseECRImageUri'
import { ImageManifestSchema } from './ImageManifestSchema'
import isInteractive from 'is-interactive'
import inquirer from 'inquirer'
import formatECRRepositoryHostname from './formatECRRepositoryHostname'

export default async function checkECRImageAccess({
  ecr,
  awsConfig,
  repoAccountAwsConfig,
  imageUri,
  log = console,
}: {
  ecr?: AWS.ECR
  awsConfig?: AWS.ConfigurationOptions
  /**
   * Config for the AWS account containing the ECR repository.
   * Optional; if given, will prompt to add/update the policy on the
   * ECR repository, if access checks failed and the terminal is
   * interactive.
   */
  repoAccountAwsConfig?: AWS.ConfigurationOptions
  imageUri: string
  log?: {
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
  }
}): Promise<boolean> {
  log.error('checking access to ECR image:', imageUri, '...')

  const { registryId, region, repositoryName, imageTag } =
    parseECRImageUri(imageUri)
  if (!ecr) ecr = new AWS.ECR({ ...awsConfig, region })

  try {
    const { images: [image] = [] } = await ecr
      .batchGetImage({
        registryId,
        repositoryName,
        imageIds: [{ imageTag }],
      })
      .promise()

    const imageManifest = image?.imageManifest

    if (!imageManifest) {
      throw new Error(`imageManifest not found for: ${imageUri}`)
    }
    const { config, layers } = ImageManifestSchema.parse(
      JSON.parse(imageManifest)
    )

    await ecr
      .batchCheckLayerAvailability({
        registryId,
        repositoryName,
        layerDigests: [config.digest, ...layers.map((l) => l.digest)],
      })
      .promise()

    await ecr
      .getDownloadUrlForLayer({
        registryId,
        repositoryName,
        layerDigest: layers[0].digest,
      })
      .promise()

    log.error(`ECR image is accessible: ${imageUri}`)
    return true
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'AccessDeniedException') {
      throw error
    }
  }
  log.error(`Unable to access ECR image: ${imageUri}`)

  const Action = [
    'ecr:GetDownloadUrlForLayer',
    'ecr:BatchCheckLayerAvailability',
    'ecr:BatchGetImage',
  ]

  log.error(`You may need to add a policy to the ECR repository to allow this account.

The policy should include:

  ${JSON.stringify(
    {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            AWS: ['XXXXXXXXXXXX'],
          },
          Action,
        },
      ],
    },
    null,
    2
  ).replace(/\n/gm, '\n  ')}
`)

  if (repoAccountAwsConfig && isInteractive()) {
    const { Account } = await new AWS.STS({
      credentials: ecr.config.credentials,
      region,
    })
      .getCallerIdentity()
      .promise()
    if (!Account) {
      log.error(`failed to determine AWS account`)
      return false
    }

    const { update } = await inquirer.prompt([
      {
        name: 'update',
        message: 'Do you want to add/update the policy?',
        type: 'confirm',
        default: false,
      },
    ])
    if (!update) return false

    const srcEcr = new AWS.ECR({
      ...repoAccountAwsConfig,
      region,
    })
    const { policyText } = await srcEcr
      .getRepositoryPolicy({
        registryId,
        repositoryName,
      })
      .promise()
      .catch((error): AWS.ECR.GetRepositoryPolicyResponse => {
        if (error.name === 'RepositoryPolicyNotFoundException') return {}
        throw error
      })

    const policy: any = JSON.parse(policyText || '{}')
    await srcEcr
      .setRepositoryPolicy({
        repositoryName,
        policyText: JSON.stringify(
          {
            Version: '2012-10-17',
            ...policy,
            Statement: [
              ...(policy.Statement || []),
              {
                Effect: 'Allow',
                Principal: {
                  AWS: [Account],
                },
                Action,
              },
            ],
          },
          null,
          2
        ),
      })
      .promise()
    log.info(
      `updated policy on ECR repository ${formatECRRepositoryHostname({
        registryId,
        region,
        repositoryName,
      })}`
    )
    return await checkECRImageAccess({ awsConfig, imageUri, log, ecr })
  }
  return false
}
