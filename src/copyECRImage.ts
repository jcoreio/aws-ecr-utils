import { spawn } from 'promisify-child-process'
import loginToECR from './loginToECR'
import ecrImageExists from './ecrImageExists'
import parseECRImageUri from './parseECRImageUri'
import { ECRClient, ECRClientConfig } from '@aws-sdk/client-ecr'

export default async function copyECRImage({
  from,
  to,
}: {
  from: {
    imageUri: string
    ecr?: ECRClient
    awsConfig?: ECRClientConfig
  }
  to: {
    imageUri: string
    ecr?: ECRClient
    awsConfig?: ECRClientConfig
  }
}): Promise<void> {
  if (from.imageUri === to.imageUri) return
  const srcRepositoryUri = from.imageUri.replace(/:.+/, '')
  const repositoryUri = to.imageUri.replace(/:.+/, '')

  const { region: fromRegion } = parseECRImageUri(from.imageUri)
  const {
    region: toRegion,
    repositoryName,
    imageTag,
  } = parseECRImageUri(to.imageUri)

  if (
    await ecrImageExists({
      awsConfig: { ...to.awsConfig, region: toRegion },
      ecr: to.ecr,
      repositoryName,
      imageTag,
    })
  ) {
    // eslint-disable-next-line no-console
    console.error(
      `Clarity image already exists in your ECR: ${repositoryName}:${imageTag}`
    )
  } else {
    // eslint-disable-next-line no-console
    console.error(
      `Logging into source ECR: ${srcRepositoryUri.replace(/\/.*/, '')}...`
    )

    await loginToECR({
      ecr: from.ecr,
      awsConfig: { ...from.awsConfig, region: fromRegion },
    })

    // eslint-disable-next-line no-console
    console.error(`Pulling ${from.imageUri}...`)
    await spawn('docker', ['pull', from.imageUri], { stdio: 'inherit' })

    // eslint-disable-next-line no-console
    console.error(
      `Logging into dest ECR: ${repositoryUri.replace(/\/.*/, '')}...`
    )
    await loginToECR({
      ecr: to.ecr,
      awsConfig: { ...to.awsConfig, region: toRegion },
    })

    // eslint-disable-next-line no-console
    console.error(`Pushing ${to.imageUri}...`)
    await spawn('docker', ['tag', from.imageUri, to.imageUri], {
      stdio: 'inherit',
    })
    await spawn('docker', ['push', to.imageUri], { stdio: 'inherit' })
  }
}
