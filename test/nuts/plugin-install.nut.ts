/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';
import { expect } from 'chai';
import { TestSession, execCmd, execInteractiveCmd, Interaction } from '@salesforce/cli-plugins-testkit';

describe('plugins:install commands', () => {
  const SIGNED_MODULE_NAME = '@salesforce/plugin-user';
  const UNSIGNED_MODULE_NAME = '@mshanemc/plugin-streaming';
  const UNSIGNED_MODULE_NAME2 = '@mshanemc/sfdx-sosl';
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'NONE' });
    await fs.promises.mkdir(path.join(session.homeDir, '.sfdx'), { recursive: true });

    const fileData: string = JSON.stringify({ acknowledged: true }, null, 2);
    await fs.promises.writeFile(path.join(session.homeDir, '.sfdx', 'acknowledgedUsageCollection.json'), fileData);

    const configDir = path.join(session.homeDir, '.config', 'sfdx');
    await fs.promises.mkdir(configDir, { recursive: true });

    const unsignedMod: string = JSON.stringify([UNSIGNED_MODULE_NAME2], null, 2);
    await fs.promises.writeFile(path.join(configDir, 'unsignedPluginAllowList.json'), unsignedMod);

    // ensure that this repo's version of the plugin is used and NOT the one that shipped with the CLI
    execCmd('plugins:link .', {
      cwd: path.dirname(session.dir),
      ensureExitCode: 0,
      cli: 'sfdx',
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
    const result = execCmd(`plugins:install ${SIGNED_MODULE_NAME}`, {
      ensureExitCode: 0,
      cli: 'sfdx',
    });
    expect(result.shellOutput.stdout).to.contain(`Successfully validated digital signature for ${SIGNED_MODULE_NAME}`);
  });

  it('plugins:install prompts on unsigned plugin (denies)', async () => {
    const result = await execInteractiveCmd(
      `plugins:install ${UNSIGNED_MODULE_NAME}`,
      { 'Continue installation': Interaction.No },
      {
        ensureExitCode: 2, // code 2 is the output code for the NO answer
        cli: 'sfdx',
      }
    );

    expect(result.stdout).to.contain('This plugin is not digitally signed and its authenticity cannot be verified.');
    expect(result.stdout).to.contain('Continue installation?');
    expect(result.stderr).to.contain('The user canceled the plugin installation');
  });

  it('plugins:install prompts on unsigned plugin (accepts)', async () => {
    const result = await execInteractiveCmd(
      `plugins:install ${UNSIGNED_MODULE_NAME}`,
      { 'Continue installation': Interaction.Yes },
      {
        ensureExitCode: 0,
        cli: 'sfdx',
      }
    );
    expect(result.stdout).to.contain('This plugin is not digitally signed and its authenticity cannot be verified.');
    expect(result.stdout).to.contain('Continue installation?');
    expect(result.stdout).to.contain('Finished digital signature check');
  });

  it('plugins:install unsigned plugin in the allow list', () => {
    expect(fs.existsSync(path.join(session.homeDir, '.config', 'sfdx'))).to.be.true;
    const result = execCmd(`plugins:install ${UNSIGNED_MODULE_NAME2}`, {
      ensureExitCode: 0,
      cli: 'sfdx',
    });
    expect(result.shellOutput.stdout).to.contain(
      `The plugin [${UNSIGNED_MODULE_NAME2}] is not digitally signed but it is allow-listed.`
    );
  });
});
