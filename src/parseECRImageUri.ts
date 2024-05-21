export default function parseECRImageUri(imageUri: string): {
  registryId: string
  region: string
  repositoryName: string
  imageTag: string
} {
  const match = /(\d+)\.dkr\.ecr\.([^.]+)\.amazonaws\.com\/([^:]+):(.+)/.exec(
    imageUri
  )
  if (!match) throw new Error(`invalid imageUri: ${imageUri}`)
  const [, registryId, region, repositoryName, imageTag] = match
  return { registryId, region, repositoryName, imageTag }
}
