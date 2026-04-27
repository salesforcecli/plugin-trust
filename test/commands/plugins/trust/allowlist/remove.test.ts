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

import { ALLOW_LIST_FILENAME } from '../../../../../src/shared/constants.js';
import { AllowListRemove } from '../../../../../src/commands/plugins/trust/allowlist/remove.js';

describe('plugins trust allowlist remove', () => {
  let sandbox: sinon.SinonSandbox;
  const $$ = new TestContext();
  let writeFileStub: sinon.SinonStub;
  let readFileStub: sinon.SinonStub;
  const config = new Config({ root: import.meta.url });

  before(async () => {
    await config.load();
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    writeFileStub = stubMethod(sandbox, fs.promises, 'writeFile').resolves();
    readFileStub = stubMethod(sandbox, fs.promises, 'readFile');
  });

  afterEach(() => {
    $$.restore();
    writeFileStub.restore();
    readFileStub.restore();
  });

  it('skips removal when the allow list file does not exist', async () => {
    const err = Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    readFileStub.rejects(err);
    const tableStub = $$.SANDBOX.stub(SfCommand.prototype, 'table');

    await new AllowListRemove(['--name', 'somepackagename'], config).run();

    expect(writeFileStub.called).to.eq(false);
    expect(tableStub.args[0][0]).to.deep.eq({ data: [{ Plugin: 'somepackagename', Status: 'skipped' }] });
  });

  it('removes a plugin present in the allow list', async () => {
    readFileStub.resolves(JSON.stringify(['somepackagename', 'otherpackage']));
    const tableStub = $$.SANDBOX.stub(SfCommand.prototype, 'table');

    await new AllowListRemove(['--name', 'somepackagename'], config).run();

    expect(writeFileStub.calledOnce).to.eq(true);
    expect(writeFileStub.args[0][0]).to.contain(ALLOW_LIST_FILENAME);
    expect(writeFileStub.args[0][1]).to.eq(JSON.stringify(['otherpackage']));
    expect(tableStub.args[0][0]).to.deep.eq({ data: [{ Plugin: 'somepackagename', Status: 'removed' }] });
  });

  it('skips a plugin not present in the allow list', async () => {
    readFileStub.resolves(JSON.stringify(['otherpackage']));
    const tableStub = $$.SANDBOX.stub(SfCommand.prototype, 'table');

    await new AllowListRemove(['--name', 'somepackagename'], config).run();

    expect(writeFileStub.called).to.eq(false);
    expect(tableStub.args[0][0]).to.deep.eq({ data: [{ Plugin: 'somepackagename', Status: 'skipped' }] });
  });

  it('removes present plugins and skips absent ones in a single invocation', async () => {
    const existingPackage = 'existingpackage';
    readFileStub.resolves(JSON.stringify([existingPackage, 'anotherexisting']));
    const tableStub = $$.SANDBOX.stub(SfCommand.prototype, 'table');

    await new AllowListRemove(['--name', existingPackage, '--name', 'notpresent'], config).run();

    expect(writeFileStub.calledOnce).to.eq(true);
    expect(writeFileStub.args[0][0]).to.contain(ALLOW_LIST_FILENAME);
    expect(writeFileStub.args[0][1]).to.eq(JSON.stringify(['anotherexisting']));
    expect(tableStub.args[0][0]).to.deep.eq({
      data: [
        { Plugin: existingPackage, Status: 'removed' },
        { Plugin: 'notpresent', Status: 'skipped' },
      ],
    });
  });

  it('does not write the file when all plugins are absent', async () => {
    readFileStub.resolves(JSON.stringify(['plugin-a', 'plugin-b']));
    $$.SANDBOX.stub(SfCommand.prototype, 'table');

    await new AllowListRemove(['--name', 'not-here', '--name', 'also-not-here'], config).run();

    expect(writeFileStub.called).to.eq(false);
  });

  it('writes an empty array when all plugins are removed', async () => {
    readFileStub.resolves(JSON.stringify(['only-plugin']));
    $$.SANDBOX.stub(SfCommand.prototype, 'table');

    await new AllowListRemove(['--name', 'only-plugin'], config).run();

    expect(writeFileStub.calledOnce).to.eq(true);
    expect(writeFileStub.args[0][1]).to.eq(JSON.stringify([]));
  });
});
