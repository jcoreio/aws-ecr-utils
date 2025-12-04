// @flow

import {
  CreateRepositoryCommand,
  DescribeRepositoriesCommand,
  ECRClient,
  ECRClientConfig,
  Repository,
} from '@aws-sdk/client-ecr'

export default async function upsertECRRepository({
  ecr,
  awsConfig,
  repositoryName,
}: {
  ecr?: ECRClient
  awsConfig?: ECRClientConfig
  repositoryName: string
}): Promise<Repository> {
  if (!ecr) ecr = new ECRClient({ ...awsConfig })
  try {
    const { repositories } = await ecr.send(
      new DescribeRepositoriesCommand({ repositoryNames: [repositoryName] })
    )
    const repository = repositories?.[0]
    if (repository) return repository
  } catch {
    // ignore
  }

  // eslint-disable-next-line no-console
  console.error(`Creating ECR repository {bold ${repositoryName}}...`)
  const { repository } = await ecr.send(
    new CreateRepositoryCommand({ repositoryName })
  )
  if (!repository) {
    throw new Error(`repository is missing from createRepository response`)
  }
  return repository
}
