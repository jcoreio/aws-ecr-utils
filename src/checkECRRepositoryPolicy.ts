import AWS from 'aws-sdk'
import inquirer from 'inquirer'
import isInteractive from 'is-interactive'

/**
 * Checks if the given ECR repository has a sufficient repository
 * policy to allow the given AWS principal to access docker images.
 *
 * If not, prints a warning, and if the terminal is interactive, asks the user if they
 * would like to add/update the repository policy.
 */
export default async function checkECRRepositoryPolicy({
  ecr,
  awsConfig,
  repositoryName,
  awsPrincipal,
  Action = [
    'ecr:GetDownloadUrlForLayer',
    'ecr:BatchCheckLayerAvailability',
    'ecr:BatchGetImage',
  ],
  log = console,
}: {
  ecr?: AWS.ECR
  awsConfig?: AWS.ConfigurationOptions
  repositoryName: string
  awsPrincipal: string
  Action?: string[]
  log?: {
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
  }
}): Promise<boolean> {
  const rootUserMatch = /^arn:aws:iam::(\d+):root$/.exec(awsPrincipal)
  if (rootUserMatch) awsPrincipal = rootUserMatch[1]

  const principalAliases = /^(\d+)$/.test(awsPrincipal)
    ? [awsPrincipal, `arn:aws:iam::${awsPrincipal}:root`]
    : [awsPrincipal]

  if (!ecr) ecr = new AWS.ECR(awsConfig)
  const { policyText } = await ecr
    .getRepositoryPolicy({ repositoryName })
    .promise()
    .catch((error): AWS.ECR.GetRepositoryPolicyResponse => {
      if (error.name === 'RepositoryPolicyNotFoundException') return {}
      throw error
    })
  const policy: any = JSON.parse(policyText || '{}')
  const statementForAction = policy.Statement?.find(
    (s: any) =>
      s.Effect === 'Allow' &&
      Array.isArray(Action) &&
      Action.every((a) => s.Action?.includes(a))
  )
  const statementPrincipal = statementForAction?.Principal?.AWS

  if (
    (statementPrincipal &&
      typeof statementPrincipal === 'string' &&
      principalAliases.includes(statementPrincipal)) ||
    (Array.isArray(statementPrincipal) &&
      statementPrincipal.some((s) => principalAliases.includes(s)))
  ) {
    // eslint-disable-next-line no-console
    log.info(
      `Found policy on ECR repository ${repositoryName} to allow access for AWS Principal ${awsPrincipal}.`
    )
    return true
  }

  // eslint-disable-next-line no-console
  console.warn(`Missing policy on ECR repository ${repositoryName} to allow access for AWS Principal ${awsPrincipal}.

The policy should include:

  ${JSON.stringify(
    {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            AWS: [awsPrincipal],
          },
          Action,
        },
      ],
    },
    null,
    2
  ).replace(/\n/gm, '\n  ')}
`)
  if (isInteractive()) {
    const { update } = await inquirer.prompt([
      {
        name: 'update',
        message: 'Do you want to add/update the policy?',
        type: 'confirm',
        default: false,
      },
    ])
    if (update) {
      let finalPolicy = policy
      if (statementForAction?.Action?.length === Action.length) {
        statementForAction.Principal = {
          ...statementForAction.Principal,
          AWS: [
            ...(typeof statementPrincipal === 'string'
              ? [statementPrincipal]
              : Array.isArray(statementPrincipal)
              ? statementPrincipal
              : []),
            awsPrincipal,
          ],
        }
      } else {
        finalPolicy = {
          Version: '2012-10-17',
          ...policy,
          Statement: [
            ...(policy.Statement || []),
            {
              Effect: 'Allow',
              Principal: {
                AWS: [awsPrincipal],
              },
              Action,
            },
          ],
        }
      }
      await ecr
        .setRepositoryPolicy({
          repositoryName,
          policyText: JSON.stringify(finalPolicy, null, 2),
        })
        .promise()
      log.info(`updated policy on ECR repository ${repositoryName}`)
      return true
    }
  }
  return false
}
