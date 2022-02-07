// @flow

import AWS from 'aws-sdk'

export default async function upsertECRRepository({
  ecr,
  awsConfig,
  repositoryName,
}: {
  ecr?: AWS.ECR
  awsConfig?: AWS.ConfigurationOptions
  repositoryName: string
}): Promise<AWS.ECR.Repository> {
  if (!ecr) ecr = new AWS.ECR(awsConfig)
  try {
    const { repositories } = await ecr
      .describeRepositories({ repositoryNames: [repositoryName] })
      .promise()
    const repository = repositories?.[0]
    if (repository) return repository
  } catch (error) {
    // ignore
  }

  // eslint-disable-next-line no-console
  console.error(`Creating ECR repository {bold ${repositoryName}}...`)
  const { repository } = await ecr
    .createRepository({ repositoryName })
    .promise()
  if (!repository) {
    throw new Error(`repository is missing from createRepository response`)
  }
  return repository
}
