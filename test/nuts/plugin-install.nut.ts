/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
// import { /* existsSync, */ promises as fs } from 'fs';
// import { copy, remove } from 'fs-extra';
import { expect } from 'chai';
// import { expect } from '@salesforce/command/lib/test';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { fs } from '@salesforce/core';

const SIGNED_MODULE_NAME = '@salesforce/plugin-user';
const UNSIGNED_MODULE_NAME = 'sfdx-jayree';
// const PLUGIN_TRUST_REPO = 'git@github.com:salesforcecli/plugin-trust.git';
let session: TestSession;

describe.skip('plugins:install commands', () => {
  before(async () => {
    session = await TestSession.create();
    // await Promise.all([
    //   fs.mkdir(path.join(session.homeDir, 'SC_OUTPUT')),
    //   fs.mkdir(path.join(session.homeDir, 'MC_OUTPUT')),
    // ]);
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  it.skip('plugins:install signed plugin', () => {
    process.env.TESTKIT_EXECUTABLE_PATH = 'sfdx';
    const result = execCmd(`plugins:install ${SIGNED_MODULE_NAME}`, {
      ensureExitCode: 0,
    });
    // eslint-disable-next-line no-console
    console.log('result', result);
    expect(result.shellOutput.stdout).to.contain(`Successfully validated digital signature for ${SIGNED_MODULE_NAME}`);
  });

  it('plugins:install unsigned plugin', () => {
    process.env.TESTKIT_EXECUTABLE_PATH = 'sfdx';
    const result = execCmd(`plugins:install ${UNSIGNED_MODULE_NAME}`, {
      ensureExitCode: 0,
    });
    // eslint-disable-next-line no-console
    console.log('result', result);
    expect(result.shellOutput.stdout).to.contain(
      'This plugin is not digitally signed and its authenticity cannot be verified. Continue installation y/n?:'
    );
  });

  // it('plugins:trust:verify', () => {
  //   execCmd('plugins:trust:verify --npm @salesforce/plugin-user', {
  //     ensureExitCode: 0,
  //   });
  // });

  // it('plugins:trust:verify', () => {
  //   execCmd('plugins:trust:verify --npm sfdx-jayree', {
  //     ensureExitCode: 0,
  //   });
  // });
});

describe('plugins:install commands', () => {
  before(async () => {
    session = await TestSession.create();
    const configDir = path.join(session.homeDir, '.config', 'sfdx');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeJsonSync(path.join(configDir, 'unsignedPluginAllowList.json'), [UNSIGNED_MODULE_NAME]);
    // process.env.TESTKIT_EXECUTABLE_PATH = 'sfdx';
    // const pluginTrustRealPath = path.dirname(session.dir).split(path.sep).pop();
    const pluginTrustRealPath = path.dirname(session.dir);
    // eslint-disable-next-line no-console
    console.log('pluginTrustRealPath', pluginTrustRealPath);
    const pluginTrustPath = path.join(session.dir, 'plugin-trust');

    // fs.mkdirSync(pluginTrustPath, { recursive: true });
    // fs.copyFileSync(pluginTrustRealPath, pluginTrustPath);

    // eslint-disable-next-line no-console
    console.log('session.dir', session.dir);
    // process.env.TESTKIT_EXECUTABLE_PATH = 'git';
    // execCmd(`clone ${PLUGIN_TRUST_REPO}`, {
    //   cwd: session.dir,
    //   ensureExitCode: 0,
    // });
    // eslint-disable-next-line no-console
    console.log('pluginTrustPath', pluginTrustPath);
    // process.env.TESTKIT_EXECUTABLE_PATH = 'yarn';
    // execCmd('install', {
    //   cwd: pluginTrustPath,
    //   ensureExitCode: 0,
    // });
    // eslint-disable-next-line no-console
    console.log('plugins:link', pluginTrustPath);
    process.env.TESTKIT_EXECUTABLE_PATH = 'sfdx';
    execCmd('plugins:link . --dev-debug', {
      cwd: pluginTrustRealPath,
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
    // expect(result.shellOutput.stdout).to.contain();
  });
});
