export default function formatECRRepositoryHostname({
  registryId,
  region,
  repositoryName,
}: {
  registryId: string
  region: string
  repositoryName: string
}): string {
  return `${registryId}.dkr.ecr.${region}.amazonaws.com/${repositoryName}`
}
