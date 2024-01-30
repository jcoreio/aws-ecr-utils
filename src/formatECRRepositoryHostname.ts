export default function formatECRRepositoryHostname({
  registryId,
  region,
  repositoryName,
}: {
  registryId: AWS.ECR.RegistryId
  region: string
  repositoryName: AWS.ECR.RepositoryName
}): string {
  return `${registryId}.dkr.ecr.${region}.amazonaws.com/${repositoryName}`
}
