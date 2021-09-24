/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as os from 'os';
import { expect } from 'chai';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { fs } from '@salesforce/core';

const SIGNED_MODULE_NAME = '@salesforce/plugin-user';
const UNSIGNED_MODULE_NAME = '@mshanemc/plugin-streaming';
let session: TestSession;

describe('plugins:install commands', () => {
  before(async () => {
    session = await TestSession.create();
    await fs.mkdirp(path.join(session.homeDir, '.sfdx'));
    await fs.writeJson(path.join(session.homeDir, '.sfdx', 'acknowledgedUsageCollection.json'), {
      acknowledged: true,
    });
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    try {
      await session?.clean();
    } catch (error) {
      // ignore
    }
  });

  it('plugins:install signed plugin', () => {
    process.env.TESTKIT_EXECUTABLE_PATH = 'sfdx';
    const result = execCmd(`plugins:install ${SIGNED_MODULE_NAME}`, {
      ensureExitCode: 0,
    });
    expect(result.shellOutput.stdout).to.contain(`Successfully validated digital signature for ${SIGNED_MODULE_NAME}`);
  });

  it('plugins:install prompts on unsigned plugin (denies)', () => {
    // windows does not support answering the prompt
    if (os.type() !== 'Windows_NT') {
      process.env.TESTKIT_EXECUTABLE_PATH = 'sfdx';
      const result = execCmd(`plugins:install ${UNSIGNED_MODULE_NAME}`, {
        ensureExitCode: 2, // code 2 is the output code for the NO answer
        answers: ['N'],
      });
      expect(result.shellOutput.stderr).to.contain(
        'This plugin is not digitally signed and its authenticity cannot be verified. Continue installation y/n?:'
      );
      expect(result.shellOutput.stderr).to.contain('The user canceled the plugin installation');
    }
  });

  it('plugins:install prompts on unsigned plugin (accepts)', () => {
    // windows does not support answering the prompt
    if (os.type() !== 'Windows_NT') {
      process.env.TESTKIT_EXECUTABLE_PATH = 'sfdx';
      const result = execCmd(`plugins:install ${UNSIGNED_MODULE_NAME}`, {
        ensureExitCode: 0,
        answers: ['Y'],
      });
      expect(result.shellOutput.stderr).to.contain(
        'This plugin is not digitally signed and its authenticity cannot be verified. Continue installation y/n?:'
      );
      expect(result.shellOutput.stdout).to.contain('Finished digital signature check');
    }
  });
});

describe('plugins:install commands', () => {
  before(async () => {
    session = await TestSession.create();
    await fs.mkdirp(path.join(session.homeDir, '.sfdx'));
    await fs.writeJson(path.join(session.homeDir, '.sfdx', 'acknowledgedUsageCollection.json'), {
      acknowledged: true,
    });
    const configDir = path.join(session.homeDir, '.config', 'sfdx');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeJsonSync(path.join(configDir, 'unsignedPluginAllowList.json'), [UNSIGNED_MODULE_NAME]);
    process.env.TESTKIT_EXECUTABLE_PATH = 'sfdx';
    execCmd('plugins:link . --dev-debug', {
      cwd: path.dirname(session.dir),
      ensureExitCode: 0,
    });
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    try {
      await session?.clean();
    } catch (error) {
      // ignore
    }
  });

  it('plugins:install unsigned plugin in the allow list', () => {
    process.env.TESTKIT_EXECUTABLE_PATH = 'sfdx';
    const result = execCmd(`plugins:install ${UNSIGNED_MODULE_NAME}`, {
      ensureExitCode: 0,
    });
    expect(result.shellOutput.stdout).to.contain(
      `The plugin [${UNSIGNED_MODULE_NAME}] is not digitally signed but it is allow-listed.`
    );
  });
});
