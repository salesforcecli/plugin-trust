/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from 'node:path';
import fs from 'node:fs';
import { expect, config } from 'chai';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';

config.truncateThreshold = 0;

describe('sf doctor', () => {
  const UNSIGNED_MODULE_NAME2 = '@mshanemc/sfdx-sosl';
  let session: TestSession;
  let configDir: string;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'NONE' });
    await fs.promises.mkdir(path.join(session.homeDir, '.sf'), { recursive: true });

    const fileData: string = JSON.stringify({ acknowledged: true }, null, 2);
    await fs.promises.writeFile(path.join(session.homeDir, '.sf', 'acknowledgedUsageCollection.json'), fileData);

    configDir = path.join(session.homeDir, '.config', 'sf');
    await fs.promises.mkdir(configDir, { recursive: true });

    const unsignedMod: string = JSON.stringify([UNSIGNED_MODULE_NAME2], null, 2);
    await fs.promises.writeFile(path.join(configDir, 'unsignedPluginAllowList.json'), unsignedMod);

    // ensure that this repo's version of the plugin is used and NOT the one that shipped with the CLI
    execCmd('plugins:link .', {
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

  it('sf doctor detects potential command injection', () => {
    const result = execCmd('doctor', {
      ensureExitCode: 0,
      cli: 'sf',
      env: {
        ...process.env,
        NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org; uname -a > /tmp/proof; #',
      },
    });
    expect(result.shellOutput.stdout).to.contain(
      '* WARNING: npm registry environment variable contains invalid or potentially unsafe URL: https://registry.npmjs.org; uname -a > /tmp/proof; #'
    );
  });
});
