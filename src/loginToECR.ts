/**
 * @prettier
 */
import { spawn } from 'promisify-child-process'
import base64 from 'base64-js'
import {
  ECRClient,
  ECRClientConfig,
  GetAuthorizationTokenCommand,
} from '@aws-sdk/client-ecr'

export default async function loginToECR({
  ecr,
  awsConfig,
}: {
  ecr?: ECRClient
  awsConfig?: ECRClientConfig
}): Promise<void> {
  if (!ecr) ecr = new ECRClient({ ...awsConfig })
  const { authorizationData } = await ecr.send(
    new GetAuthorizationTokenCommand()
  )
  const { authorizationToken, proxyEndpoint } = authorizationData?.[0] || {}
  if (!authorizationToken) {
    throw new Error('failed to get authorizationToken from ECR')
  }
  if (!proxyEndpoint) {
    throw new Error('failed to get proxyEndpoint from ECR')
  }
  // this is silly...
  const decoded = Buffer.from(base64.toByteArray(authorizationToken)).toString(
    'utf8'
  )
  const [user, password] = decoded.split(/:/)
  const child = spawn(
    'docker',
    ['login', '-u', user, '--password-stdin', proxyEndpoint],
    {
      stdio: 'pipe',
      encoding: 'utf8',
    }
  )
  if (!child.stdin) {
    throw new Error('expected child.stdin to be defined')
  }
  child.stdin.write(password)
  child.stdin.end()
  await child
}
