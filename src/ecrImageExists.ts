import AWS from 'aws-sdk'

export default async function ecrImageExists({
  ecr,
  awsConfig,
  imageUri,
  registryId,
  repositoryName,
  imageTag,
}: {
  ecr?: AWS.ECR
  awsConfig?: AWS.ConfigurationOptions
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
  if (!ecr) ecr = new AWS.ECR({ ...awsConfig, region })

  if (!repositoryName || !imageTag) {
    throw new Error(`missing repositoryName/imageTag or imageUri`)
  }
  return await ecr
    .describeImages({
      registryId,
      repositoryName,
      imageIds: [{ imageTag }],
    })
    .promise()
    .then(
      () => true,
      () => false
    )
}
