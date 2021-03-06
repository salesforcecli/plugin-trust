/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect } from 'chai';
import * as sinon from 'sinon';

import { stubMethod } from '@salesforce/ts-sinon';

import { InstallationVerification, VerificationConfig } from '../../src/lib/installationVerification';
import { hook, VerificationConfigBuilder } from '../../src/hooks/verifyInstallSignature';

describe('plugin install hook', () => {
  let sandbox: sinon.SinonSandbox;
  let vConfig: VerificationConfig;
  let buildFromRepoStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    vConfig = new VerificationConfig();

    vConfig.verifier = new InstallationVerification();
    stubMethod(sandbox, vConfig.verifier, 'verify').callsFake(async () => {
      const err = new Error();
      err.name = 'NotSigned';
      throw err;
    });
    stubMethod(sandbox, vConfig.verifier, 'isAllowListed').callsFake(async () => false);

    vConfig.prompt = async () => 'N';
    buildFromRepoStub = sandbox.stub().returns(vConfig);
    VerificationConfigBuilder.build = () => vConfig;

    VerificationConfigBuilder.buildForRepo = buildFromRepoStub;
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('exits by calling this.error', async () => {
    let calledError = false;
    await hook.call(
      {
        error: () => (calledError = true),
      },
      {
        plugin: { name: 'test', type: 'npm' },
        config: {},
      }
    );
    expect(calledError).to.equal(true);
  });

  it('should prompt for repo urls', async () => {
    try {
      await hook.call(
        {},
        {
          plugin: { name: 'test', type: 'repo' },
          config: {},
        }
      );
    } catch (error) {
      expect(error).to.have.property('name', 'InstallationCanceledError');
      expect(buildFromRepoStub.called).to.be.true;
    }
  });
});
