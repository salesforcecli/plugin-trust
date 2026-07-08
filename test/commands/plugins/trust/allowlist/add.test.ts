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
import { SfError } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';
import { TestContext } from '@salesforce/core/testSetup';

import { ALLOW_LIST_FILENAME } from '../../../../../src/shared/constants.js';
import { AllowListAdd } from '../../../../../src/commands/plugins/trust/allowlist/add.js';

describe('plugins trust allowlist add', () => {
  let sandbox: sinon.SinonSandbox;
  const $$ = new TestContext();
  let writeFileStub: sinon.SinonStub;
  let readFileStub: sinon.SinonStub;
  let mkdirStub: sinon.SinonStub;
  const config = new Config({ root: import.meta.url });

  before(async () => {
    await config.load();
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    writeFileStub = stubMethod(sandbox, fs.promises, 'writeFile').resolves();
    readFileStub = stubMethod(sandbox, fs.promises, 'readFile');
    mkdirStub = stubMethod(sandbox, fs.promises, 'mkdir').resolves();
  });

  afterEach(() => {
    $$.restore();
    writeFileStub.restore();
    readFileStub.restore();
    mkdirStub.restore();
  });

  it('creates file successfully when ENOENT error is thrown', async () => {
    const err = Error('ENOENT: no such file or directory, open `{actual file path here}`') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    readFileStub.rejects(err);

    await new AllowListAdd(['--name', 'somepackagename'], config).run();

    expect(writeFileStub.calledOnce).to.eq(true);
    expect(writeFileStub.args[0][0]).to.contain(ALLOW_LIST_FILENAME);
    expect(writeFileStub.args[0][1]).to.eq(JSON.stringify(['somepackagename'], null, 2));
    expect(mkdirStub.calledOnce).to.eq(true);
  });

  it('adds plugin to allowlist even when no file content', async () => {
    const err = Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    readFileStub.rejects(err);
    const tableStub = $$.SANDBOX.stub(SfCommand.prototype, 'table');

    await new AllowListAdd(['--name', 'somepackagename'], config).run();
    expect(writeFileStub.calledOnce).to.eq(true);
    expect(writeFileStub.args[0][0]).to.contain(ALLOW_LIST_FILENAME);
    expect(writeFileStub.args[0][1]).to.eq(JSON.stringify(['somepackagename'], null, 2));
    expect(tableStub.calledOnce).to.eq(true);
    expect(tableStub.args[0][0]).to.deep.eq({ data: [{ Plugin: 'somepackagename', Status: 'added' }] });
    expect(mkdirStub.calledOnce).to.eq(true);
  });

  it('skips plugin already part of allowlist', async () => {
    readFileStub.resolves(JSON.stringify(['somepackagename']));
    const tableStub = $$.SANDBOX.stub(SfCommand.prototype, 'table');

    await new AllowListAdd(['--name', 'somepackagename'], config).run();

    expect(tableStub.args[0][0]).to.deep.eq({
      data: [{ Plugin: 'somepackagename', Reason: 'already within allowlist', Status: 'skipped' }],
    });
  });

  it('adds plugin to allowlist and skips plugin already added', async () => {
    const existingPackage = 'somepackagename';
    readFileStub.resolves(JSON.stringify([existingPackage]));
    const tableStub = $$.SANDBOX.stub(SfCommand.prototype, 'table');

    await new AllowListAdd(['--name', 'otherpackagename', '--name', existingPackage], config).run();

    expect(writeFileStub.calledOnce).to.eq(true);
    expect(writeFileStub.args[0][0]).to.contain(ALLOW_LIST_FILENAME);
    expect(writeFileStub.args[0][1]).to.eq(JSON.stringify([existingPackage, 'otherpackagename'], null, 2));
    expect(tableStub.calledOnce).to.eq(true);
    expect(tableStub.args[0][0]).to.deep.eq({
      data: [
        { Plugin: 'otherpackagename', Status: 'added' },
        { Plugin: existingPackage, Reason: 'already within allowlist', Status: 'skipped' },
      ],
    });
  });

  it('reports error when allowlist is malformed JSON', async () => {
    readFileStub.resolves('{}');

    let err: SfError = new SfError('');
    try {
      await new AllowListAdd(['--name', 'otherpackagename', '--name', 'someName'], config).run();
    } catch (ex) {
      err = ex as SfError;
    }

    expect(err.message).to.eq('unsignedPluginAllowList.json must contain a JSON array of strings.');
  });

  it('reports error when writing allowlist back to disk fails', async () => {
    readFileStub.resolves('["somePlugin"]');
    const axErr = Error('EACCES: permission denied, access "your/file/path"') as NodeJS.ErrnoException;
    axErr.code = 'EACCES';
    writeFileStub.rejects(axErr);

    let err: Error = new SfError('Message');
    try {
      await new AllowListAdd(['--name', 'otherpackagename', '--name', 'someName'], config).run();
    } catch (ex) {
      err = ex as SfError;
    }
    expect(err.message).to.eq(axErr.message);
  });
});
