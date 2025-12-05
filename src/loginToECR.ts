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
import parseECRImageUri from './parseECRImageUri'
import * as log4jcore from 'log4jcore'

const log = log4jcore.logger('@jcoreio/aws-ecr-utils/loginToECR')

export default async function loginToECR({
  ecr,
  forImages,
  awsConfig,
}: {
  ecr?: ECRClient
  forImages?: string[]
  awsConfig?: ECRClientConfig
}): Promise<void> {
  if (forImages) {
    log.debug('logging into AWS ECR for images:', forImages)
    const regions = new Set(
      forImages.flatMap((image) => {
        try {
          return [parseECRImageUri(image).region]
        } catch {
          return []
        }
      })
    )
    log.debug('parsed AWS regions from images:', regions)
    await Promise.all(
      [...regions].map(async (region) =>
        loginToECR({
          awsConfig: { ...awsConfig, region },
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
  const { authorizationToken, proxyEndpoint } = authorizationData?.[0] || {}
  log.debug('GetAuthorizationToken data:', {
    authorizationToken,
    proxyEndpoint,
  })
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
  const dockerArgs = ['login', '-u', user, '--password-stdin', proxyEndpoint]
  log.debug(
    'running: docker',
    ...dockerArgs.map((arg) =>
      /^[-_a-z0-9]+$/i.test(arg) ? arg : `'${arg.replace(/'/g, `'\\'')}'`)}'`
    )
  )
  const child = spawn('docker', dockerArgs, {
    stdio: ['pipe', 'pipe', 'inherit'],
    encoding: 'utf8',
  })
  if (!child.stdin) {
    throw new Error('expected child.stdin to be defined')
  }
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
