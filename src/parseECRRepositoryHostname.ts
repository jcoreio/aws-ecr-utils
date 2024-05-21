export default function parseECRRepositoryHostname(hostname: string): {
  registryId: string
  region: string
  repositoryName: string
} {
  const match = /^([^.]+)\.dkr\.ecr\.([^.]+)\.amazonaws\.com\/([^:]+)/.exec(
    hostname
  )
  if (!match) throw new Error(`invalid ECR repository hostname: ${hostname}`)
  const [, registryId, region, repositoryName] = match
  return { registryId, region, repositoryName }
}
