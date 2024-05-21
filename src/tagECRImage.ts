/**
 * @prettier
 */
import {
  BatchGetImageCommand,
  ECRClient,
  ECRClientConfig,
  PutImageCommand,
} from '@aws-sdk/client-ecr'
import parseECRImageUri from './parseECRImageUri'

export default async function tagECRImage({
  ecr,
  awsConfig,
  imageUri,
  tags,
}: {
  ecr?: ECRClient
  awsConfig?: ECRClientConfig
  imageUri: string
  tags: string[]
}): Promise<void> {
  const { region, repositoryName, imageTag } = parseECRImageUri(imageUri)
  if (!ecr) ecr = new ECRClient({ ...awsConfig, region })

  const imageManifest = await ecr
    .send(
      new BatchGetImageCommand({
        repositoryName,
        imageIds: [{ imageTag }],
      })
    )
    .then((r) => r?.images?.[0]?.imageManifest)

  if (!imageManifest) {
    throw new Error(`failed to get image manifest for ${imageUri}`)
  }

  if (imageManifest) {
    // add other tags to ECR
    for (const tag of tags) {
      // eslint-disable-next-line no-console
      console.error(`Adding tag ${repositoryName}:${tag}`)
      try {
        await ecr.send(
          new PutImageCommand({
            repositoryName,
            imageManifest,
            imageTag: tag.substring(tag.indexOf(':') + 1),
          })
        )
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any)?.code !== 'ImageAlreadyExistsException') throw error
      }
    }
  }
}
