export default function parseECREndpoint(endpoint: string): {
  registryId: string
  region: string
} {
  const match = /(\d+)\.dkr\.ecr\.([^.]+)\.amazonaws\.com/.exec(
    endpoint
  )
  if (!match) throw new Error(`invalid endpoint: ${endpoint}`)
  const [, registryId, region] = match
  return { registryId, region }
}
