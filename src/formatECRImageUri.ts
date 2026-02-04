import formatECRRepositoryHostname from './formatECRRepositoryHostname.ts'

export default function formatECRImageUri({
  registryId,
  region,
  repositoryName,
  imageTag,
}: {
  registryId: string
  region: string
  repositoryName: string
  imageTag: string
}): string {
  return `${formatECRRepositoryHostname({
    registryId,
    region,
    repositoryName,
  })}:${imageTag}`
}
