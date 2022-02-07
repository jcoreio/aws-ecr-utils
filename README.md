# @jcoreio/aws-ecr-utils

[![CircleCI](https://circleci.com/gh/jcoreio/aws-ecr-utils.svg?style=svg)](https://circleci.com/gh/jcoreio/aws-ecr-utils)
[![Coverage Status](https://codecov.io/gh/jcoreio/aws-ecr-utils/branch/master/graph/badge.svg)](https://codecov.io/gh/jcoreio/aws-ecr-utils)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![npm version](https://badge.fury.io/js/%40jcoreio%2Faws-ecr-utils.svg)](https://badge.fury.io/js/%40jcoreio%2Faws-ecr-utils)

# Table of Contents

- [@jcoreio/aws-ecr-utils](#jcoreioaws-ecr-utils)
- [Table of Contents](#table-of-contents)
  - [`copyECRImage(options)`](#copyecrimageoptions)
    - [Options](#options)
      - [`options.from.imageUri`, `options.to.imageUri` (`string`, **required**)](#optionsfromimageuri-optionstoimageuri-string-required)
      - [`options.from.ecr`, `options.to.ecr` (`AWS.ECR`, _optional_)](#optionsfromecr-optionstoecr-awsecr-optional)
      - [`options.from.awsConfig`, `options.to.awsConfig` (`AWS.ConfigurationOptions`, _optional_)](#optionsfromawsconfig-optionstoawsconfig-awsconfigurationoptions-optional)
    - [Returns (`Promise<void>`)](#returns-promisevoid)
  - [`ecrImageExists(options)`](#ecrimageexistsoptions)
    - [Options](#options-1)
      - [`options.ecr` (`AWS.ECR`, _optional_)](#optionsecr-awsecr-optional)
      - [`options.awsConfig` (`AWS.ConfigurationOptions`, _optional_)](#optionsawsconfig-awsconfigurationoptions-optional)
      - [`options.imageUri` (`string`, _optional_)](#optionsimageuri-string-optional)
      - [`options.registryId` (`string`, _optional_)](#optionsregistryid-string-optional)
      - [`options.repositoryName` (`string`, _optional_)](#optionsrepositoryname-string-optional)
      - [`options.imageTag` (`string`, _optional_)](#optionsimagetag-string-optional)
    - [Returns (`Promise<boolean>`)](#returns-promiseboolean)
  - [`loginToECR(options)`](#logintoecroptions)
    - [Options](#options-2)
      - [`options.ecr` (`AWS.ECR`, _optional_)](#optionsecr-awsecr-optional-1)
      - [`options.awsConfig` (`AWS.ConfigurationOptions`, _optional_)](#optionsawsconfig-awsconfigurationoptions-optional-1)
    - [Returns (`Promise<void>`)](#returns-promisevoid-1)
  - [`parseECRImageUri(imageUri)`](#parseecrimageuriimageuri)
    - [Options](#options-3)
      - [`imageUri` (`string`, **required**)](#imageuri-string-required)
    - [Returns (`object`)](#returns-object)
  - [`tagECRImage(options)`](#tagecrimageoptions)
    - [Options](#options-4)
      - [`options.ecr` (`AWS.ECR`, _optional_)](#optionsecr-awsecr-optional-2)
      - [`options.awsConfig` (`AWS.ConfigurationOptions`, _optional_)](#optionsawsconfig-awsconfigurationoptions-optional-2)
      - [`options.imageUri` (`string`, **required**)](#optionsimageuri-string-required)
      - [`options.tags` (`string[]`, **required**)](#optionstags-string-required)
    - [Returns (`Promise<void>`)](#returns-promisevoid-2)
  - [`upsertECRRepository(options)`](#upsertecrrepositoryoptions)
    - [Options](#options-5)
      - [`options.ecr` (`AWS.ECR`, _optional_)](#optionsecr-awsecr-optional-3)
      - [`options.awsConfig` (`AWS.ConfigurationOptions`, _optional_)](#optionsawsconfig-awsconfigurationoptions-optional-3)
      - [`options.repositoryName` (`string`, **required**)](#optionsrepositoryname-string-required)
    - [Returns (`Promise<AWS.ECR.Repository>`)](#returns-promiseawsecrrepository)

## `copyECRImage(options)`

Copies an image between ECRs (potentially between accounts). Requires Docker to be installed and the `docker` command to be on your path.

### Options

#### `options.from.imageUri`, `options.to.imageUri` (`string`, **required**)

The URIs of the source and destination ECR images

#### `options.from.ecr`, `options.to.ecr` (`AWS.ECR`, _optional_)

The ECR clients to use for the source and destination images

#### `options.from.awsConfig`, `options.to.awsConfig` (`AWS.ConfigurationOptions`, _optional_)

The AWS service options to use if `options.from.ecr` and `options.to.ecr` aren't provided

### Returns (`Promise<void>`)

A promise that will resolve once the image has been pulled from the source repository and pushed to the destination repository.

## `ecrImageExists(options)`

Determines if an ECR image exists.

### Options

#### `options.ecr` (`AWS.ECR`, _optional_)

The ECR client to use

#### `options.awsConfig` (`AWS.ConfigurationOptions`, _optional_)

The AWS service options to use if `options.ecr` isn't provided

#### `options.imageUri` (`string`, _optional_)

The URI of the image to look for. You must provide either this or `options.registryId`,
`options.repositoryName`, or `imageTag`.

#### `options.registryId` (`string`, _optional_)

The ID of the ECR (same as your AWS account number?)

#### `options.repositoryName` (`string`, _optional_)

The name of the ECR repository

#### `options.imageTag` (`string`, _optional_)

The ECR image tag

### Returns (`Promise<boolean>`)

A promise that will resolve to true if the image exists and false otherwise.

## `loginToECR(options)`

Logs the local Docker client into the given ECR. Requires Docker to be installed and the `docker` command to be on your path.

### Options

#### `options.ecr` (`AWS.ECR`, _optional_)

The ECR client to use

#### `options.awsConfig` (`AWS.ConfigurationOptions`, _optional_)

The AWS service options to use if `options.ecr` isn't provided

### Returns (`Promise<void>`)

A promise that will resolve once logged in.

## `parseECRImageUri(imageUri)`

Parses the given ECR image URI.

### Options

#### `imageUri` (`string`, **required**)

The URI of the ECR image to parse.

### Returns (`object`)

An object with the following properties:

```ts
{
  registryId: string
  region: string
  repositoryName: string
  imageTag: string
}
```

## `tagECRImage(options)`

Adds additional tags to an existing ECR image.

### Options

#### `options.ecr` (`AWS.ECR`, _optional_)

The ECR client to use

#### `options.awsConfig` (`AWS.ConfigurationOptions`, _optional_)

The AWS service options to use if `options.ecr` isn't provided

#### `options.imageUri` (`string`, **required**)

The URI of the ECR image to add tags to

#### `options.tags` (`string[]`, **required**)

The tags to add to the ECR image

### Returns (`Promise<void>`)

A promise that will resolve once the tags have been added.

## `upsertECRRepository(options)`

Creates an ECR repository if it doesn't already exist.

### Options

#### `options.ecr` (`AWS.ECR`, _optional_)

The ECR client to use

#### `options.awsConfig` (`AWS.ConfigurationOptions`, _optional_)

The AWS service options to use if `options.ecr` isn't provided

#### `options.repositoryName` (`string`, **required**)

The name of the repository to upsert

### Returns (`Promise<AWS.ECR.Repository>`)

The found or created ECR repository
