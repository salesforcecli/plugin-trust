/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect, config } from 'chai';
import sinon from 'sinon';

import { stubMethod } from '@salesforce/ts-sinon';

import { prompts } from '@salesforce/sf-plugins-core';
import { InstallationVerification, VerificationConfig } from '../../src/shared/installationVerification.js';
import { hook } from '../../src/hooks/verifyInstallSignature.js';

config.truncateThreshold = 0;

describe('plugin install hook', () => {
  let sandbox: sinon.SinonSandbox;
  let vConfig: VerificationConfig;
  let promptSpy: sinon.SinonSpy;
  let verifySpy: sinon.SinonSpy;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    vConfig = new VerificationConfig();

    vConfig.verifier = new InstallationVerification();
    verifySpy = stubMethod(sandbox, vConfig.verifier, 'verify').callsFake(async () => {
      const err = new Error();
      err.name = 'NotSigned';
      throw err;
    });
    stubMethod(sandbox, vConfig.verifier, 'isAllowListed').callsFake(async () => false);

    promptSpy = stubMethod(sandbox, prompts, 'confirm').resolves(false);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('exits by calling this.error', async () => {
    let calledError = false;
    await hook.call(
      // @ts-expect-error not a valid mock for context
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
        // @ts-expect-error not a valid mock for context
        {},
        {
          plugin: { name: 'test', type: 'repo' },
          config: {},
        }
      );
    } catch (error) {
      expect(error).to.have.property('name', 'InstallationCanceledError');
      expect(promptSpy.called).to.be.true;
    }
  });

  it('should skip signature verification for JIT plugins with matching version', async () => {
    await hook.call(
      // @ts-expect-error not a valid mock for context
      {},
      {
        plugin: { name: '@ns/test', type: 'npm', tag: '1.2.3' },
        config: { pjson: { oclif: { jitPlugins: { '@ns/test': '1.2.3' } } } },
      }
    );
    expect(promptSpy.called).to.be.false;
    expect(verifySpy.called).to.be.false;
  });
});
