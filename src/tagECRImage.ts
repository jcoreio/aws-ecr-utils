/**
 * @prettier
 */
import AWS from 'aws-sdk'
import parseECRImageUri from './parseECRImageUri'

export default async function tagECRImage({
  ecr,
  awsConfig,
  imageUri,
  tags,
}: {
  ecr?: AWS.ECR
  awsConfig?: AWS.ConfigurationOptions
  imageUri: string
  tags: string[]
}): Promise<void> {
  const { region, repositoryName, imageTag } = parseECRImageUri(imageUri)
  if (!ecr) ecr = new AWS.ECR({ ...awsConfig, region })

  const imageManifest = await ecr
    .batchGetImage({
      repositoryName,
      imageIds: [{ imageTag }],
    })
    .promise()
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
        await ecr
          .putImage({
            repositoryName,
            imageManifest,
            imageTag: tag.substring(tag.indexOf(':') + 1),
          })
          .promise()
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any)?.code !== 'ImageAlreadyExistsException') throw error
      }
    }
  }
}
