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

import { fail } from 'node:assert';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { expect, use as chaiUse, assert } from 'chai';
import Sinon from 'sinon';
import crossSpawn from 'cross-spawn';
import which from 'which';
import { stubMethod } from '@salesforce/ts-sinon';
import { SfError } from '@salesforce/core';
import SinonChai from 'sinon-chai';
import { NpmModule } from '../../src/shared/npmCommand.js';

chaiUse(SinonChai);

const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';
const MODULE_NAME = '@salesforce/plugin-source';
const MODULE_VERSION = '1.0.0';
const CACHE_PATH = '/tmp';
const SHOW_RESULT = {
  versions: ['1.0.0'],
  'dist-tags': {
    latest: '1.0.0',
  },
  sfdx: {
    publicKeyUrl: 'https://developer.salesforce.com/crt',
    signatureUrl: 'https://developer.salesforce.com/sig',
  },
  dist: {
    tarball: 'https://registry.example.com/foo.tgz',
  },
};
const PACK_RESULT = [
  {
    id: `${MODULE_NAME}@${MODULE_VERSION}`,
    name: MODULE_NAME,
    version: MODULE_VERSION,
    size: 1024,
    unpackedSize: 4096,
    shasum: 'DEADBEEF',
    integrity: 'sha512-L5/ABCDE/ABCDEFGHIJKLMNOPQRSTUVWXYZ==',
    filename: `${MODULE_NAME}-${MODULE_VERSION}.tgz`,
    files: [
      {
        path: 'README.md',
        size: 512,
        mode: 444,
      },
    ],
  },
];
const NODE_NAME = 'node';
const NODE_PATH = `/usr/local/sfdx/bin/${NODE_NAME}`;

describe('should run npm commands', () => {
  let sandbox: Sinon.SinonSandbox;
  let realpathSyncStub: Sinon.SinonStub;
  let crossSpawnSyncStub: Sinon.SinonStub;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    stubMethod(sandbox, fs, 'readFileSync').returns(JSON.stringify({ bin: { npm: 'bc' } }));

    realpathSyncStub = stubMethod(sandbox, fs, 'realpathSync').returns('node.exe');
    stubMethod(sandbox, fs, 'readdirSync').returns([{ name: 'node.exe', isDirectory: () => false }]);
    crossSpawnSyncStub = stubMethod(sandbox, crossSpawn, 'sync').callsFake((_cmd: string, args: string[]) => {
      const joined = args.join(' ');
      if (joined.includes('show')) {
        return { status: 0, stdout: Buffer.from(JSON.stringify(SHOW_RESULT)), stderr: Buffer.from('') };
      } else if (joined.includes('pack')) {
        return { status: 0, stdout: Buffer.from(JSON.stringify(PACK_RESULT)), stderr: Buffer.from('') };
      }
      throw new Error(`Unexpected test args - ${joined}`);
    });
  });

  afterEach(() => {
    realpathSyncStub.restore();
    crossSpawnSyncStub.restore();
    sandbox.restore();
  });

  it('Runs the show command', () => {
    const npmMetadata = new NpmModule(MODULE_NAME, undefined, dirname(fileURLToPath(import.meta.url))).show(
      DEFAULT_REGISTRY
    );
    expect(crossSpawnSyncStub).to.have.been.calledOnce;
    const args = crossSpawnSyncStub.firstCall.args[1] as string[];
    expect(args).to.include('show');
    expect(args).to.include(`${MODULE_NAME}@latest`);
    expect(args).to.include(`--registry=${DEFAULT_REGISTRY}`);
    expect(npmMetadata).to.deep.equal(SHOW_RESULT);
  });

  it('Runs the show command with specified version', () => {
    const npmMetadata = new NpmModule(MODULE_NAME, MODULE_VERSION, dirname(fileURLToPath(import.meta.url))).show(
      DEFAULT_REGISTRY
    );
    expect(crossSpawnSyncStub).to.have.been.calledOnce;
    const args = crossSpawnSyncStub.firstCall.args[1] as string[];
    expect(args).to.include('show');
    expect(args).to.include(`${MODULE_NAME}@${MODULE_VERSION}`);
    expect(args).to.include(`--registry=${DEFAULT_REGISTRY}`);
    expect(npmMetadata).to.deep.equal(SHOW_RESULT);
  });

  it('Runs the pack command', () => {
    new NpmModule(MODULE_NAME, MODULE_VERSION, dirname(fileURLToPath(import.meta.url))).pack(DEFAULT_REGISTRY, {
      cwd: CACHE_PATH,
    });
    expect(crossSpawnSyncStub).to.have.been.calledOnce;
    const args = crossSpawnSyncStub.firstCall.args[1] as string[];
    expect(args).to.include('pack');
    expect(args).to.include(`${MODULE_NAME}@${MODULE_VERSION}`);
    expect(args).to.include(`--registry=${DEFAULT_REGISTRY}`);
  });
});

describe('should find the node executable', () => {
  let sandbox: Sinon.SinonSandbox;
  let crossSpawnSyncStub: Sinon.SinonStub;
  let readdirSyncStub: Sinon.SinonStub;
  let whichSyncStub: Sinon.SinonStub;
  let existsSyncStub: Sinon.SinonStub;
  let realpathSyncStub: Sinon.SinonStub;
  let osTypeStub: Sinon.SinonStub;
  let accessSyncStub: Sinon.SinonStub;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    stubMethod(sandbox, fs, 'readFileSync').returns(JSON.stringify({ bin: { npm: 'bc' } }));
    crossSpawnSyncStub = stubMethod(sandbox, crossSpawn, 'sync').callsFake((_cmd: string, args: string[]) => {
      const joined = args.join(' ');
      if (joined.includes('show')) {
        return { status: 0, stdout: Buffer.from(JSON.stringify(SHOW_RESULT)), stderr: Buffer.from('') };
      } else if (joined.includes('pack')) {
        return { status: 0, stdout: Buffer.from(JSON.stringify(PACK_RESULT)), stderr: Buffer.from('') };
      }
      throw new Error(`Unexpected test args - ${joined}`);
    });
    readdirSyncStub = stubMethod(sandbox, fs, 'readdirSync').returns([{ name: NODE_NAME, isDirectory: () => false }]);
    realpathSyncStub = stubMethod(sandbox, fs, 'realpathSync').callsFake((filePath: string) => {
      expect(filePath).to.be.a('string').and.to.have.length.greaterThan(0);
      return NODE_PATH;
    });
    existsSyncStub = stubMethod(sandbox, fs, 'existsSync').callsFake((filePath: string) => {
      expect(filePath).to.be.a('string').and.to.have.length.greaterThan(0);
      return true;
    });
    accessSyncStub = stubMethod(sandbox, fs, 'accessSync').callsFake((filePath: string) => {
      expect(filePath).to.be.a('string').and.to.have.length.greaterThan(0);
      return undefined;
    });
    osTypeStub = stubMethod(sandbox, os, 'type').callsFake(() => 'Linux');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('finds node binary inside sfdx bin folder and runs npm show command', () => {
    const npmMetadata = new NpmModule(MODULE_NAME, undefined, dirname(fileURLToPath(import.meta.url))).show(
      DEFAULT_REGISTRY
    );
    expect(accessSyncStub).to.have.been.calledOnce;
    expect(existsSyncStub).to.have.been.calledTwice;
    expect(osTypeStub).to.have.been.calledOnce;
    expect(realpathSyncStub).to.have.been.calledTwice;
    expect(realpathSyncStub.firstCall.args[0]).to.include(NODE_NAME);
    expect(crossSpawnSyncStub).to.have.been.calledOnce;
    expect(readdirSyncStub).to.have.been.called;
    expect(crossSpawnSyncStub.firstCall.args[0]).to.include(NODE_NAME);
    const args = crossSpawnSyncStub.firstCall.args[1] as string[];
    expect(args).to.include('show');
    expect(args).to.include(`${MODULE_NAME}@latest`);
    expect(args).to.include(`--registry=${DEFAULT_REGISTRY}`);
    expect(npmMetadata).to.deep.equal(SHOW_RESULT);
  });

  it('finds node binary inside sfdx bin folder on windows and runs npm show command', () => {
    readdirSyncStub.returns([{ name: 'node.exe', isDirectory: () => false }]);
    osTypeStub.returns('Windows_NT');

    const npmMetadata = new NpmModule(MODULE_NAME, undefined, dirname(fileURLToPath(import.meta.url))).show(
      DEFAULT_REGISTRY
    );
    expect(accessSyncStub).to.not.have.been.called;
    expect(existsSyncStub).to.have.been.calledTwice;
    expect(osTypeStub).to.have.been.calledOnce;
    expect(realpathSyncStub).to.have.been.calledTwice;
    expect(realpathSyncStub.firstCall.args[0]).to.include(NODE_NAME);
    expect(crossSpawnSyncStub).to.have.been.calledOnce;
    expect(readdirSyncStub).to.have.been.called;
    expect(crossSpawnSyncStub.firstCall.args[0]).to.include(NODE_NAME);
    const args = crossSpawnSyncStub.firstCall.args[1] as string[];
    expect(args).to.include('show');
    expect(args).to.include(`${MODULE_NAME}@latest`);
    expect(args).to.include(`--registry=${DEFAULT_REGISTRY}`);
    expect(npmMetadata).to.deep.equal(SHOW_RESULT);
  });

  it('fails to find node binary inside sfdx bin folder and falls back to global node and runs npm show command', () => {
    realpathSyncStub.restore();
    existsSyncStub.restore();
    existsSyncStub = stubMethod(sandbox, fs, 'existsSync').callsFake((filePath: string) => {
      expect(filePath).to.be.a('string').and.to.have.length.greaterThan(0);
      return false;
    });
    whichSyncStub = stubMethod(sandbox, which, 'sync').returns(NODE_PATH);
    const npmMetadata = new NpmModule(MODULE_NAME, undefined, dirname(fileURLToPath(import.meta.url))).show(
      DEFAULT_REGISTRY
    );
    expect(existsSyncStub).to.have.been.calledTwice;
    expect(readdirSyncStub).to.not.have.been.called;
    expect(realpathSyncStub).to.not.have.been.called;
    expect(whichSyncStub).to.have.been.calledOnce;
    expect(crossSpawnSyncStub).to.have.been.calledOnce;
    expect(crossSpawnSyncStub.firstCall.args[0]).to.include(NODE_NAME);
    const args = crossSpawnSyncStub.firstCall.args[1] as string[];
    expect(args).to.include('show');
    expect(args).to.include(`${MODULE_NAME}@latest`);
    expect(args).to.include(`--registry=${DEFAULT_REGISTRY}`);
    expect(npmMetadata).to.deep.equal(SHOW_RESULT);
  });

  it('fails to find node binary and throws', () => {
    existsSyncStub.restore();
    existsSyncStub = stubMethod(sandbox, fs, 'existsSync').callsFake((filePath: string) => {
      expect(filePath).to.be.a('string').and.to.have.length.greaterThan(0);
      return false;
    });
    whichSyncStub = stubMethod(sandbox, which, 'sync').returns(null);
    try {
      const npmMetadata = new NpmModule(MODULE_NAME, undefined, dirname(fileURLToPath(import.meta.url))).show(
        DEFAULT_REGISTRY
      );
      expect(npmMetadata).to.be.undefined;
      fail('Error');
    } catch (error) {
      assert(error instanceof SfError);

      expect(error.code).to.equal('CannotFindNodeExecutable');
    }
  });
});

describe('should run npm commands with execution errors', () => {
  let sandbox: Sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    stubMethod(sandbox, fs, 'readFileSync').returns(JSON.stringify({ bin: { npm: 'bc' } }));
    stubMethod(sandbox, fs, 'realpathSync').returns('node.exe');
    stubMethod(sandbox, fs, 'readdirSync').returns([{ name: 'node.exe', isDirectory: () => false }]);
    stubMethod(sandbox, crossSpawn, 'sync').callsFake((_cmd: string, args: string[]) => {
      const joined = args.join(' ');
      if (joined.includes('show') || joined.includes('pack')) {
        return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from('command execution error') };
      }
      throw new Error(`Unexpected test args - ${joined}`);
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('show command throws error', () => {
    try {
      const npmMetadata = new NpmModule(MODULE_NAME, undefined, dirname(fileURLToPath(import.meta.url))).show(
        DEFAULT_REGISTRY
      );
      expect(npmMetadata).to.be.undefined;
      fail('Error');
    } catch (error) {
      assert(error instanceof SfError);
      expect(error.code).to.equal('ShellExecError');
    }
  });

  it('Runs the pack command', () => {
    try {
      new NpmModule(MODULE_NAME, MODULE_VERSION, dirname(fileURLToPath(import.meta.url))).pack(DEFAULT_REGISTRY, {
        cwd: CACHE_PATH,
      });
      fail('Error');
    } catch (error) {
      assert(error instanceof SfError);
      expect(error.code).to.equal('NpmError');
    }
  });
});

describe('should run npm commands with parse errors', () => {
  let sandbox: Sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    stubMethod(sandbox, fs, 'readFileSync').returns(JSON.stringify({ bin: { npm: 'bc' } }));
    stubMethod(sandbox, fs, 'realpathSync').returns('node.exe');
    stubMethod(sandbox, fs, 'readdirSync').returns([{ name: 'node.exe', isDirectory: () => false }]);
    stubMethod(sandbox, crossSpawn, 'sync').callsFake((_cmd: string, args: string[]) => {
      const joined = args.join(' ');
      if (joined.includes('show') || joined.includes('pack')) {
        return { status: 0, stdout: Buffer.from('not a json string'), stderr: Buffer.from('') };
      }
      throw new Error(`Unexpected test args - ${joined}`);
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('show command throws error', () => {
    try {
      const npmMetadata = new NpmModule(MODULE_NAME, MODULE_VERSION, dirname(fileURLToPath(import.meta.url))).show(
        DEFAULT_REGISTRY
      );
      expect(npmMetadata).to.be.undefined;
      fail('Error');
    } catch (error) {
      assert(error instanceof SfError);
      expect(error.code).to.equal('ShellParseError');
    }
  });
});

describe('should run npm commands with npm errors', () => {
  let sandbox: Sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    stubMethod(sandbox, fs, 'readFileSync').returns(JSON.stringify({ bin: { npm: 'bc' } }));
    stubMethod(sandbox, fs, 'realpathSync').returns('node.exe');
    stubMethod(sandbox, fs, 'readdirSync').returns([{ name: 'node.exe', isDirectory: () => false }]);
    stubMethod(sandbox, crossSpawn, 'sync').callsFake((_cmd: string, args: string[]) => {
      const joined = args.join(' ');
      if (joined.includes('show')) {
        return { status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') };
      } else if (joined.includes('pack')) {
        return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from('npm err') };
      }
      throw new Error(`Unexpected test args - ${joined}`);
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('show command throws error', () => {
    try {
      new NpmModule(MODULE_NAME, MODULE_VERSION, dirname(fileURLToPath(import.meta.url))).show(DEFAULT_REGISTRY);
    } catch (error) {
      assert(error instanceof SfError);
      expect(error.code).to.equal('NpmError');
      expect(error.message).to.equal('Failed to find @salesforce/plugin-source@1.0.0 in the registry');
    }
  });

  it('pack command throws error', () => {
    try {
      new NpmModule(MODULE_NAME, MODULE_VERSION, dirname(fileURLToPath(import.meta.url))).pack(DEFAULT_REGISTRY);
    } catch (error) {
      assert(error instanceof SfError);
      expect(error.code).to.equal('NpmError');
      expect(error.message).to.equal('Failed to fetch tarball from the registry: \nnpm err');
    }
  });
});
