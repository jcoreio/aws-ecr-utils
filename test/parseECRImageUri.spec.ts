import { describe, it } from 'mocha'
import { expect } from 'chai'

import { parseECRImageUri } from '../src'

describe(`parseECRImageUri`, function () {
  it(`works`, async function () {
    expect(
      parseECRImageUri(
        `0000000000.dkr.ecr.us-west-2.amazonaws.com/repoName:tag`
      )
    ).to.deep.equal({
      registryId: '0000000000',
      repositoryName: 'repoName',
      region: 'us-west-2',
      imageTag: 'tag',
    })
    for (const uri of [
      `.dkr.ecr.us-west-2.amazonaws.com/repoName:tag`,
      `000000000000.dkr.ecr.us-west-2.amazonaws.com/repoName:`,
    ]) {
      expect(() => parseECRImageUri(uri)).to.throw(`invalid imageUri: ${uri}`)
    }
  })
})
