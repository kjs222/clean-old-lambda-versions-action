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

async function listVersions(
  functionName: string,
  marker: string | undefined
): Promise<Lambda.ListVersionsByFunctionResponse> {
  const params: Lambda.ListVersionsByFunctionRequest = {
    FunctionName: functionName,
    MaxItems: 2 // just for testing
  }
  if (marker) {
    params.Marker = marker
  }

  return lambda.listVersionsByFunction(params).promise()
}

async function listAllVersions(functionName: string): Promise<string[]> {
  let hasMoreVersions = true
  let versions: Lambda.FunctionConfiguration[] = []
  let marker
  while (hasMoreVersions) {
    const result: Lambda.ListVersionsByFunctionResponse = await listVersions(
      functionName,
      marker
    )
    if (!result.NextMarker) {
      hasMoreVersions = false
    } else {
      marker = result.NextMarker
    }
    if (result.Versions) {
      versions = [...versions, ...result.Versions]
    }
  }

  const sorted = versions.sort((a, b) => {
    let aLastModified = new Date()
    let bLastModified = new Date()
    if (a.LastModified) {
      aLastModified = new Date(a.LastModified)
    }
    if (b.LastModified) {
      bLastModified = new Date(b.LastModified)
    }
    return aLastModified.getTime() - bLastModified.getTime()
  })

  const sortedVersionNumbers = sorted.map(v => v.Version)
  return sortedVersionNumbers.filter(v => v !== undefined) as string[]
}

async function deleteVersion(
  functionName: string,
  versionNumber: string
): Promise<void> {
  core.info(`Deleting version ${versionNumber} from ${functionName}`)
  lambda
    .deleteFunction({FunctionName: functionName, Qualifier: versionNumber})
    .promise()
}

async function run(): Promise<void> {
  try {
    if (core.getInput('function_name')) {
      const aliasVersions = await getAliasVersions(
        core.getInput('function_name')
      )
      core.debug(aliasVersions.join(','))
      const allVersions = await listAllVersions(core.getInput('function_name'))
      core.debug(allVersions.join(','))

      const removableVersions = allVersions.filter(v => {
        return !aliasVersions.includes(v) && v !== '$LATEST'
      })
      core.debug(removableVersions.join(','))

      const versionsToRemove = removableVersions.slice(
        0,
        removableVersions.length - parseInt(core.getInput('number_to_keep'))
      )

      core.debug(versionsToRemove.join(','))
      const removePromises = versionsToRemove.map(v =>
        deleteVersion(core.getInput('function_name'), v)
      )
      await Promise.all(removePromises)
      core.info('finished')
    }
    // if (core.getInput('number_to_keep')) {
    //   core.debug(core.getInput('number_to_keep'))
    // }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
