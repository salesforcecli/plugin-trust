/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'node:path';
import { expect } from 'chai';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { Messages } from '@salesforce/core';
import shelljs from 'shelljs';
import { ensureObject } from '@salesforce/ts-types';
import { NodeInfoResult } from '../../src/commands/node/info.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
describe('node info command', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'NONE' });
    //
    // ensure that this repo's version of the plugin is used and NOT the one that shipped with the CLI
    execCmd('plugins link .', {
      cwd: path.dirname(session.dir),
      ensureExitCode: 0,
      cli: 'sf',
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

  it('should return node and npx paths and verify they work', () => {
    // Get node and npx paths
    const info = ensureObject<NodeInfoResult>(
      execCmd('node info --json', {
        ensureExitCode: 0,
        // IMPORTANT: this NUT should run commands via `sf` to mimic real usage (node path being resolved from sf's rootPath)
        // Do not make it run using `./bin/run.js`.
        cli: 'sf',
      }).jsonOutput?.result
    );

    expect(info.nodePath).to.be.a('string').and.not.empty;
    expect(info.npxPath).to.be.a('string').and.not.empty;

    // Verify node path works
    const nodeHelp = shelljs.exec(`"${info.nodePath}" --help`, { silent: true });
    expect(nodeHelp.code).to.equal(0);
    expect(nodeHelp.stdout).to.contain('Usage: node');

    // Verify npx path works
    const npxHelp = shelljs.exec(`"${info.nodePath}" "${info.npxPath}" --help`, { silent: true });
    expect(npxHelp.code).to.equal(0);
    expect(npxHelp.stdout).to.contain('Run a command from a local or remote npm package');
  });
});
