### Clean Lambda Versions

This action deletes lambda versions, keeping the most recent versions up to the number of versions specified.
It will not attempt to delete any versions associated with an alias.

Requires the following environment variables:

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
```

Inputs:

- function_name (required)
- number_to_keep (required - keeps `number_to_keep` most recent versions not associated with an alias)

## Contributing:

Install the dependencies

```bash
$ npm install
```

Build the typescript and package it for distribution

```bash
$ npm run build && npm run package
```

## Publish to a distribution branch

Actions are run from GitHub repos so we will checkin the packed dist folder.

Then run [ncc](https://github.com/zeit/ncc) and push the results:

```bash
$ npm run package
$ git add dist
$ git commit -a -m "prod dependencies"
$ git push origin releases/v1
```

Note: We recommend using the `--license` option for ncc, which will create a license file for all of the production node modules used in your project.

Your action is now published! :rocket:

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

## Usage:

After testing you can [create a v1 tag](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md) to reference the stable and latest V1 action
