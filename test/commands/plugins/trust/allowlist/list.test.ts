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

import fs from 'node:fs';
import { expect } from 'chai';
import sinon from 'sinon';

import { Config } from '@oclif/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { stubMethod } from '@salesforce/ts-sinon';
import { TestContext } from '@salesforce/core/testSetup';

import { AllowListList } from '../../../../../src/commands/plugins/trust/allowlist/list.js';

describe('plugins trust allowlist list', () => {
  let sandbox: sinon.SinonSandbox;
  const $$ = new TestContext();
  let readFileStub: sinon.SinonStub;
  const config = new Config({ root: import.meta.url });

  before(async () => {
    await config.load();
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    readFileStub = stubMethod(sandbox, fs.promises, 'readFile');
  });

  afterEach(() => {
    $$.restore();
    readFileStub.restore();
  });

  it('prints a table of plugins when the allow list has entries', async () => {
    readFileStub.resolves(JSON.stringify(['plugin-a', 'plugin-b', '@scope/plugin-c']));
    const tableStub = $$.SANDBOX.stub(SfCommand.prototype, 'table');

    const result = await new AllowListList([], config).run();

    expect(result).to.deep.equal([{ Plugin: 'plugin-a' }, { Plugin: 'plugin-b' }, { Plugin: '@scope/plugin-c' }]);
    expect(tableStub.calledOnce).to.eq(true);
    expect(tableStub.args[0][0]).to.deep.eq({
      data: [{ Plugin: 'plugin-a' }, { Plugin: 'plugin-b' }, { Plugin: '@scope/plugin-c' }],
    });
  });

  it('logs a message and returns empty array when the allow list is empty', async () => {
    readFileStub.resolves(JSON.stringify([]));
    const logStub = $$.SANDBOX.stub(SfCommand.prototype, 'log');
    $$.SANDBOX.stub(SfCommand.prototype, 'table');

    const result = await new AllowListList([], config).run();

    expect(result).to.deep.equal([]);
    expect(logStub.calledOnce).to.eq(true);
    expect(logStub.args[0][0]).to.contain('No plugins');
  });

  it('logs a message and returns empty array when the allow list file does not exist', async () => {
    const err = Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    readFileStub.rejects(err);
    const logStub = $$.SANDBOX.stub(SfCommand.prototype, 'log');
    $$.SANDBOX.stub(SfCommand.prototype, 'table');

    const result = await new AllowListList([], config).run();

    expect(result).to.deep.equal([]);
    expect(logStub.calledOnce).to.eq(true);
    expect(logStub.args[0][0]).to.contain('No plugins');
  });

  it('logs a message and returns empty array when file content is null', async () => {
    readFileStub.resolves(null);
    const logStub = $$.SANDBOX.stub(SfCommand.prototype, 'log');
    $$.SANDBOX.stub(SfCommand.prototype, 'table');

    const result = await new AllowListList([], config).run();

    expect(result).to.deep.equal([]);
    expect(logStub.calledOnce).to.eq(true);
  });
});
