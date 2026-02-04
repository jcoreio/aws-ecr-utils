import {
  BatchCheckLayerAvailabilityCommand,
  BatchGetImageCommand,
  ECRClient,
  type ECRClientConfig,
  GetDownloadUrlForLayerCommand,
  GetRepositoryPolicyCommand,
  SetRepositoryPolicyCommand,
} from '@aws-sdk/client-ecr'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import parseECRImageUri from './parseECRImageUri.ts'
import { ImageManifestSchema } from './ImageManifestSchema.ts'
import { isInteractive } from './isInteractive.ts'
import inquirer from 'inquirer'
import formatECRRepositoryHostname from './formatECRRepositoryHostname.ts'

export default async function checkECRImageAccess({
  ecr,
  awsConfig,
  repoAccountAwsConfig,
  imageUri,
  log = console,
}: {
  ecr?: ECRClient
  awsConfig?: ECRClientConfig
  /**
   * Config for the AWS account containing the ECR repository.
   * Optional; if given, will prompt to add/update the policy on the
   * ECR repository, if access checks failed and the terminal is
   * interactive.
   */
  repoAccountAwsConfig?: ECRClientConfig
  imageUri: string
  log?: {
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
  }
}): Promise<boolean> {
  log.error('checking access to ECR image:', imageUri, '....ts')

  const { registryId, region, repositoryName, imageTag } =
    parseECRImageUri(imageUri)
  if (!ecr) ecr = new ECRClient({ ...awsConfig, region })

  try {
    const { images = [] } = await ecr.send(
      new BatchGetImageCommand({
        registryId,
        repositoryName,
        imageIds: [{ imageTag }],
      })
    )

    const imageManifest = images[0]?.imageManifest

    if (!imageManifest) {
      throw new Error(`imageManifest not found for: ${imageUri}`)
    }
    const { config, layers } = ImageManifestSchema.parse(
      JSON.parse(imageManifest)
    )

    await ecr.send(
      new BatchCheckLayerAvailabilityCommand({
        registryId,
        repositoryName,
        layerDigests: [config.digest, ...layers.map((l) => l.digest)],
      })
    )

    await ecr.send(
      new GetDownloadUrlForLayerCommand({
        registryId,
        repositoryName,
        layerDigest: layers[0].digest,
      })
    )

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

  if (repoAccountAwsConfig && isInteractive) {
    const { Account } = await new STSClient({
      credentials: ecr.config.credentials,
      region,
    }).send(new GetCallerIdentityCommand())
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

    const srcEcr = new ECRClient({
      ...repoAccountAwsConfig,
      region,
    })
    const { policyText } = await srcEcr
      .send(
        new GetRepositoryPolicyCommand({
          registryId,
          repositoryName,
        })
      )
      .catch((error: unknown): { policyText?: string } => {
        if (
          error &&
          typeof error === 'object' &&
          'name' in error &&
          error.name === 'RepositoryPolicyNotFoundException'
        )
          return {}
        throw error
      })

    const policy: any = JSON.parse(policyText || '{}')
    await srcEcr.send(
      new SetRepositoryPolicyCommand({
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
    )
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
