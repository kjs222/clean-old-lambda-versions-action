import * as core from '@actions/core'
// import AWS, {Lambda} from 'aws-sdk'

async function run(): Promise<void> {
  try {
    if (core.getInput('function_name')) {
      core.debug(core.getInput('function_name'))
    }
    if (core.getInput('number_to_keep')) {
      core.debug(core.getInput('number_to_keep'))
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
