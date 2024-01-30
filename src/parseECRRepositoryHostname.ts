import AWS from 'aws-sdk'

export default function parseECRRepositoryHostname(hostname: string): {
  registryId: AWS.ECR.RegistryId
  region: string
  repositoryName: AWS.ECR.RepositoryName
} {
  const match = /^([^.]+)\.dkr\.ecr\.([^.]+)\.amazonaws\.com\/([^:]+)/.exec(
    hostname
  )
  if (!match) throw new Error(`invalid ECR repository hostname: ${hostname}`)
  const [, registryId, region, repositoryName] = match
  return { registryId, region, repositoryName }
}
