import * as core from '@actions/core'
import {Lambda} from 'aws-sdk'

const lambda = new Lambda({
  apiVersion: '2015-03-31'
})

async function getAliasedVersions(functionName: string): Promise<string[]> {
  const response = await lambda
    .listAliases({FunctionName: functionName})
    .promise()

  let versions: string[] = []

  if (response.Aliases) {
    for (const a of response.Aliases) {
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
    }
  }
  return versions
}

async function listVersions(
  functionName: string,
  marker: string | undefined
): Promise<Lambda.ListVersionsByFunctionResponse> {
  const params: Lambda.ListVersionsByFunctionRequest = {
    FunctionName: functionName
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
    const aLastModified = a.LastModified ? new Date(a.LastModified) : new Date()
    const bLastModified = b.LastModified ? new Date(b.LastModified) : new Date()
    return aLastModified.getTime() - bLastModified.getTime()
  })

  const sortedVersionNumbers = sorted.map(v => v.Version)
  return sortedVersionNumbers.filter(v => v !== undefined) as string[]
}

async function deleteVersion(
  functionName: string,
  versionNumber: string
): Promise<Promise<unknown>> {
  core.info(`Deleting version ${versionNumber} from ${functionName}`)
  return lambda
    .deleteFunction({FunctionName: functionName, Qualifier: versionNumber})
    .promise()
}

async function run(): Promise<void> {
  try {
    const functionName = core.getInput('function_name')
    const numberToKeep = parseInt(core.getInput('number_to_keep'))
    if (isNaN(numberToKeep)) {
      throw new Error('number_to_keep must be a number')
    }
    const aliasedVersions = await getAliasedVersions(functionName)
    const allVersions = await listAllVersions(functionName)

    const removableVersions = allVersions.filter(v => {
      return !aliasedVersions.includes(v) && v !== '$LATEST'
    })
    const versionsToRemove = removableVersions.slice(
      0,
      removableVersions.length - numberToKeep
    )

    core.info(`preparing to remove ${versionsToRemove.length} version(s)`)

    const deleteVersions = versionsToRemove.map(async v =>
      deleteVersion(functionName, v)
    )

    await Promise.all(deleteVersions)
  } catch (error) {
    const e = error as Error
    core.setFailed(e.message)
  }
}

run()
