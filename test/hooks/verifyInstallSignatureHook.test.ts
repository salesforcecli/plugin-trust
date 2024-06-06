/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import fs from 'node:fs';
import { assert, expect, config as chaiConfig } from 'chai';
import sinon from 'sinon';
import { stubMethod } from '@salesforce/ts-sinon';

import { Ux, prompts } from '@salesforce/sf-plugins-core';
import { Config } from '@oclif/core';
import { InstallationVerification, VerificationConfig } from '../../src/shared/installationVerification.js';

chaiConfig.truncateThreshold = 0;

describe('plugin install hook', () => {
  let sandbox: sinon.SinonSandbox;
  let vConfig: VerificationConfig;
  let promptSpy: sinon.SinonSpy;
  let verifySpy: sinon.SinonSpy;
  let config: Config;

  before(async () => {
    config = await Config.load(import.meta.url);
  });

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
    stubMethod(sandbox, Ux.prototype, 'log').callsFake(() => {});
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('exits by calling this.error', async () => {
    try {
      await config.runHook('plugins:preinstall:verify:signature', {
        plugin: { name: 'test', type: 'npm', tag: 'latest' },
      });
      assert.fail('Expected error to be thrown');
    } catch (error) {
      expect(error).to.have.property('name', 'InstallationCanceledError');
    }
  });

  it('should prompt for repo urls that are not allowlisted', async () => {
    const result = await config.runHook('plugins:preinstall:verify:signature', {
      plugin: { url: 'https://github.com/oclif/plugin-version', type: 'repo' },
    });

    expect(result.failures).to.have.length(1);
    expect(result.failures[0].error).to.have.property('name', 'InstallationCanceledError');
    expect(promptSpy.called).to.be.true;
  });

  it('should not prompt for repo urls that are allowlisted', async () => {
    stubMethod(sandbox, fs.promises, 'readFile').resolves(JSON.stringify(['https://github.com/oclif/plugin-version']));
    const result = await config.runHook('plugins:preinstall:verify:signature', {
      plugin: { url: 'https://github.com/oclif/plugin-version', type: 'repo' },
    });

    expect(result.failures).to.have.length(0);
    expect(result.successes).to.have.length(1);
    expect(promptSpy.called).to.be.false;
  });

  it.only('should skip signature verification for JIT plugins with matching version', async () => {
    sandbox.stub(config, 'pjson').value({ oclif: { jitPlugins: { '@ns/test': '1.2.3' } } });
    await config.runHook('plugins:preinstall:verify:signature', {
      plugin: { name: '@ns/test', type: 'npm', tag: '1.2.3' },
    });
    expect(promptSpy.called).to.be.false;
    expect(verifySpy.called).to.be.false;
  });
});
