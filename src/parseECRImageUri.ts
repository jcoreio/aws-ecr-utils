import AWS from 'aws-sdk'

export default function parseECRImageUri(imageUri: string): {
  registryId: AWS.ECR.RegistryId
  region: string
  repositoryName: AWS.ECR.RepositoryName
  imageTag: string
} {
  const match = /(\d+)\.dkr\.ecr\.([^.]+)\.amazonaws\.com\/([^:]+):(.+)/.exec(
    imageUri
  )
  if (!match) throw new Error(`invalid imageUri: ${imageUri}`)
  const [, registryId, region, repositoryName, imageTag] = match
  return { registryId, region, repositoryName, imageTag }
}
