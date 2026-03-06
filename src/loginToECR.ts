/**
 * @prettier
 */
import { spawn } from 'promisify-child-process'
import base64 from 'base64-js'
import {
  ECRClient,
  type ECRClientConfig,
  GetAuthorizationTokenCommand,
} from '@aws-sdk/client-ecr'
import * as log4jcore from 'log4jcore'
import parseECREndpoint from './parseECREndpoint'

const log = log4jcore.logger('@jcoreio/aws-ecr-utils/loginToECR')

export default async function loginToECR({
  ecr,
  forImages,
  awsConfig,
  endpoint: endpoint,
}: {
  ecr?: ECRClient
  forImages?: string[]
  awsConfig?: ECRClientConfig
  endpoint?: string
} = {}): Promise<void> {
  if (forImages) {
    log.debug('logging into AWS ECR for images:', forImages)
    const endpoints = new Set(
      forImages.flatMap((image) => image.replace(/\/.*/, ''))
    )
    log.debug('got AWS proxy endpoints from images:', endpoints)
    await Promise.all(
      [...endpoints].map(async (proxyEndpoint) =>
        loginToECR({
          awsConfig: {
            ...awsConfig,
            region: parseECREndpoint(proxyEndpoint).region,
          },
          endpoint: proxyEndpoint,
        })
      )
    )
    return
  }
  if (!ecr) ecr = new ECRClient({ ...awsConfig })

  log.debug('logging into ECR for region:', await ecr.config.region())
  const { authorizationData } = await ecr.send(
    new GetAuthorizationTokenCommand()
  )
  const { authorizationToken, proxyEndpoint: defaultEndpoint } =
    authorizationData?.[0] || {}
  if (!endpoint) endpoint = defaultEndpoint
  log.debug('GetAuthorizationToken data:', {
    authorizationToken,
    proxyEndpoint: endpoint,
  })
  if (!authorizationToken) {
    throw new Error('failed to get authorizationToken from ECR')
  }
  if (!endpoint) {
    throw new Error('failed to get proxyEndpoint from ECR')
  }
  // this is silly...
  const decoded = Buffer.from(base64.toByteArray(authorizationToken)).toString(
    'utf8'
  )
  const [user, password] = decoded.split(/:/)
  const dockerArgs = ['login', '-u', user, '--password-stdin', endpoint]
  log.debug(
    'running: docker',
    ...dockerArgs.map((arg) =>
      /^[-_a-z0-9]+$/i.test(arg) ? arg : `'${arg.replace(/'/g, `'\\'')}'`)}'`
    )
  )
  const child = spawn('docker', dockerArgs, {
    stdio: ['pipe', 'pipe', 'inherit'] as const,
    encoding: 'utf8',
  })
  child.stdin.write(password)
  child.stdin.end()
  await child.then(
    () => log.debug('ECR login succeeded'),
    (error: unknown) => {
      if (error && typeof error === 'object') {
        if ('code' in error)
          log.debug('docker login exited with code', error.code)
        if ('signal' in error)
          log.debug('docker login was killed with signal', error.signal)
      }
      throw error
    }
  )
}
