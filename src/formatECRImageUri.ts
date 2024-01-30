import formatECRRepositoryHostname from './formatECRRepositoryHostname'

export default function formatECRImageUri({
  registryId,
  region,
  repositoryName,
  imageTag,
}: {
  registryId: AWS.ECR.RegistryId
  region: string
  repositoryName: AWS.ECR.RepositoryName
  imageTag: AWS.ECR.ImageTag
}): string {
  return `${formatECRRepositoryHostname({
    registryId,
    region,
    repositoryName,
  })}:${imageTag}`
}
