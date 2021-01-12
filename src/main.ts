import * as core from '@actions/core'
import AWS, {Lambda} from 'aws-sdk'

const lambda = new Lambda({
  apiVersion: '2015-03-31'
})

async function getAliasVersions(functionName: string): Promise<string[]> {
  const response = await lambda
    .listAliases({FunctionName: functionName})
    .promise()

  let versions: string[] = []

  if (response.Aliases) {
    response.Aliases.forEach(a => {
      if (a.FunctionVersion) {
        versions.push(a.FunctionVersion)
      }

      if (a.RoutingConfig && a.RoutingConfig.AdditionalVersionWeights) {
        const additionalVersions = Object.keys(
          a.RoutingConfig.AdditionalVersionWeights
        )
        core.debug(additionalVersions.join(','))
        versions = [...versions, ...additionalVersions]
      }
    })
  }
  return versions
}

async function run(): Promise<void> {
  try {
    if (core.getInput('function_name')) {
      core.debug(core.getInput('function_name'))
      const aliasVersions = await getAliasVersions(
        core.getInput('function_name')
      )
      core.debug(aliasVersions.join(','))
    }
    if (core.getInput('number_to_keep')) {
      core.debug(core.getInput('number_to_keep'))
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
