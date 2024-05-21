import {
  DescribeImagesCommand,
  ECRClient,
  ECRClientConfig,
} from '@aws-sdk/client-ecr'

export default async function ecrImageExists({
  ecr,
  awsConfig,
  imageUri,
  registryId,
  repositoryName,
  imageTag,
}: {
  ecr?: ECRClient
  awsConfig?: ECRClientConfig
  imageUri?: string
  registryId?: string
  repositoryName?: string
  imageTag?: string
}): Promise<boolean> {
  let region
  if (imageUri) {
    const match = /(\d+)\.dkr\.ecr\.(.+?)\.amazonaws\.com\/(.+?):(.+)/.exec(
      imageUri
    )
    if (!match) throw new Error(`failed to parse imageUri: ${imageUri}`)
    ;[, registryId, region, repositoryName, imageTag] = match
  }
  if (!region) region = awsConfig?.region
  if (!ecr) ecr = new ECRClient({ ...awsConfig, region })

  if (!repositoryName || !imageTag) {
    throw new Error(`missing repositoryName/imageTag or imageUri`)
  }
  return await ecr
    .send(
      new DescribeImagesCommand({
        registryId,
        repositoryName,
        imageIds: [{ imageTag }],
      })
    )
    .then(
      () => true,
      () => false
    )
}
