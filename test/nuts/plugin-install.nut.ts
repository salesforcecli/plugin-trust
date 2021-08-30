/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { expect } from 'chai';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { fs } from '@salesforce/core';

const SIGNED_MODULE_NAME = '@salesforce/plugin-user';
const UNSIGNED_MODULE_NAME = 'sfdx-jayree';
let session: TestSession;

describe('plugins:install commands', () => {
  before(async () => {
    session = await TestSession.create();
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  it('plugins:install signed plugin', () => {
    process.env.TESTKIT_EXECUTABLE_PATH = 'sfdx';
    const result = execCmd(`plugins:install ${SIGNED_MODULE_NAME}`, {
      ensureExitCode: 0,
    });
    expect(result.shellOutput.stdout).to.contain(`Successfully validated digital signature for ${SIGNED_MODULE_NAME}`);
  });
});

describe('plugins:install commands', () => {
  before(async () => {
    session = await TestSession.create();
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
    await session?.clean();
  });

  it('plugins:install unsigned plugin', () => {
    process.env.TESTKIT_EXECUTABLE_PATH = 'sfdx';
    const result = execCmd(`plugins:install ${UNSIGNED_MODULE_NAME}`, {
      ensureExitCode: 0,
    });
    // eslint-disable-next-line no-console
    console.log('result', result);
    expect(result.shellOutput.stdout).to.contain(
      `The plugin [${UNSIGNED_MODULE_NAME}] is not digitally signed but it is allow-listed.`
    );
  });
});
