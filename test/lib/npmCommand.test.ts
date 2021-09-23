/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { fail } from 'assert';
import { expect } from 'chai';
import Sinon = require('sinon');
import * as shelljs from 'shelljs';
import { stubMethod } from '@salesforce/ts-sinon';
import { fs } from '@salesforce/core';
import { NpmModule } from '../../src/lib/npmCommand';

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
  let sandbox: sinon.SinonSandbox;
  let shelljsExecStub: Sinon.SinonStub;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    shelljsExecStub = stubMethod(sandbox, shelljs, 'exec').callsFake((cmd: string) => {
      expect(cmd).to.be.a('string').and.not.to.be.empty;
      if (cmd.includes('show')) {
        return {
          code: 0,
          stdout: JSON.stringify(SHOW_RESULT),
        };
      } else if (cmd.includes('pack')) {
        return {
          code: 0,
          stdout: JSON.stringify(PACK_RESULT),
        };
      } else if (cmd.includes('node')) {
        return {
          code: 0,
          stdout: 'node',
        };
      } else if (cmd.includes('sfdx')) {
        return {
          code: 0,
          stdout: 'sfdx',
        };
      } else {
        throw new Error(`Unexpected test cmd - ${cmd}`);
      }
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('Runs the show command', () => {
    const npmMetadata = new NpmModule(MODULE_NAME, undefined, __dirname).show(DEFAULT_REGISTRY);
    expect(shelljsExecStub.callCount).to.equal(1);
    expect(shelljsExecStub.firstCall.args[0]).to.include(`show ${MODULE_NAME}@latest`);
    expect(shelljsExecStub.firstCall.args[0]).to.include(`--registry=${DEFAULT_REGISTRY}`);
    expect(npmMetadata).to.deep.equal(SHOW_RESULT);
  });

  it('Runs the show command with specified version', () => {
    const npmMetadata = new NpmModule(MODULE_NAME, MODULE_VERSION, __dirname).show(DEFAULT_REGISTRY);
    expect(shelljsExecStub.callCount).to.equal(1);
    expect(shelljsExecStub.firstCall.args[0]).to.include(`show ${MODULE_NAME}@${MODULE_VERSION}`);
    expect(shelljsExecStub.firstCall.args[0]).to.include(`--registry=${DEFAULT_REGISTRY}`);
    expect(npmMetadata).to.deep.equal(SHOW_RESULT);
  });

  it('Runs the pack command', () => {
    new NpmModule(MODULE_NAME, MODULE_VERSION, __dirname).pack(DEFAULT_REGISTRY, { cwd: CACHE_PATH });
    expect(shelljsExecStub.callCount).to.equal(1);
    expect(shelljsExecStub.firstCall.args[0]).to.include(`pack ${MODULE_NAME}@${MODULE_VERSION}`);
    expect(shelljsExecStub.firstCall.args[0]).to.include(`--registry=${DEFAULT_REGISTRY}`);
  });
});

describe('should find the node executable', () => {
  let sandbox: sinon.SinonSandbox;
  let shelljsExecStub: Sinon.SinonStub;
  let shelljsFindStub: Sinon.SinonStub;
  let shelljsWhichStub: Sinon.SinonStub;
  let existsSyncStub: Sinon.SinonStub;
  let statSyncStub: Sinon.SinonStub;
  let realpathSyncStub: Sinon.SinonStub;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    shelljsExecStub = stubMethod(sandbox, shelljs, 'exec').callsFake((cmd: string) => {
      expect(cmd).to.be.a('string').and.not.to.be.empty;
      if (cmd.includes('show')) {
        return {
          code: 0,
          stdout: JSON.stringify(SHOW_RESULT),
        };
      } else if (cmd.includes('pack')) {
        return {
          code: 0,
          stdout: JSON.stringify(PACK_RESULT),
        };
      } else if (cmd.includes('node')) {
        return {
          code: 0,
          stdout: 'node',
        };
      } else if (cmd.includes('sfdx')) {
        return {
          code: 0,
          stdout: 'sfdx',
        };
      } else {
        throw new Error(`Unexpected test cmd - ${cmd}`);
      }
    });
    shelljsFindStub = stubMethod(sandbox, shelljs, 'find').callsFake((filePaths: string[]) => {
      expect(filePaths).to.be.a('array').and.to.have.length.greaterThan(0);
      return [NODE_PATH];
    });
    statSyncStub = stubMethod(sandbox, fs, 'statSync').callsFake((filePath: string) => {
      expect(filePath).to.be.a('string').and.to.have.length.greaterThan(0);
      return {
        isDirectory() {
          return false;
        },
      };
    });
    realpathSyncStub = stubMethod(sandbox, fs, 'realpathSync').callsFake((filePath: string) => {
      expect(filePath).to.be.a('string').and.to.have.length.greaterThan(0);
      return NODE_PATH;
    });
    existsSyncStub = stubMethod(sandbox, fs, 'existsSync').callsFake((filePath: string) => {
      expect(filePath).to.be.a('string').and.to.have.length.greaterThan(0);
      return true;
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('finds node binary inside sfdx bin folder and runs npm show command', () => {
    const npmMetadata = new NpmModule(MODULE_NAME, undefined, __dirname).show(DEFAULT_REGISTRY);
    expect(existsSyncStub.callCount).to.equal(2);
    expect(shelljsFindStub.callCount).to.equal(1);
    expect(statSyncStub.callCount).to.equal(1);
    expect(realpathSyncStub.callCount).to.equal(1);
    expect(shelljsExecStub.callCount).to.equal(1);
    expect(shelljsExecStub.firstCall.args[0]).to.include(NODE_PATH);
    expect(shelljsExecStub.firstCall.args[0]).to.include(`show ${MODULE_NAME}@latest`);
    expect(shelljsExecStub.firstCall.args[0]).to.include(`--registry=${DEFAULT_REGISTRY}`);
    expect(npmMetadata).to.deep.equal(SHOW_RESULT);
  });

  it('fails to find node binary inside sfdx bin folder and falls back to global node and runs npm show command', () => {
    existsSyncStub.restore();
    existsSyncStub = stubMethod(sandbox, fs, 'existsSync').callsFake((filePath: string) => {
      expect(filePath).to.be.a('string').and.to.have.length.greaterThan(0);
      return false;
    });
    shelljsWhichStub = stubMethod(sandbox, shelljs, 'which').callsFake((filePath: string) => {
      expect(filePath).to.be.a('string').and.to.have.length.greaterThan(0).and.to.be.equal('node');
      return NODE_PATH;
    });
    const npmMetadata = new NpmModule(MODULE_NAME, undefined, __dirname).show(DEFAULT_REGISTRY);
    expect(existsSyncStub.callCount).to.equal(2);
    expect(shelljsFindStub.callCount).to.equal(0);
    expect(statSyncStub.callCount).to.equal(0);
    expect(realpathSyncStub.callCount).to.equal(0);
    expect(shelljsWhichStub.callCount).to.equal(1);
    expect(shelljsExecStub.callCount).to.equal(1);
    expect(shelljsExecStub.firstCall.args[0]).to.include(NODE_NAME);
    expect(shelljsExecStub.firstCall.args[0]).to.include(`show ${MODULE_NAME}@latest`);
    expect(shelljsExecStub.firstCall.args[0]).to.include(`--registry=${DEFAULT_REGISTRY}`);
    expect(npmMetadata).to.deep.equal(SHOW_RESULT);
  });

  it('fails to find node binary and throws', () => {
    existsSyncStub.restore();
    existsSyncStub = stubMethod(sandbox, fs, 'existsSync').callsFake((filePath: string) => {
      expect(filePath).to.be.a('string').and.to.have.length.greaterThan(0);
      return false;
    });
    shelljsWhichStub = stubMethod(sandbox, shelljs, 'which').callsFake((filePath: string) => {
      expect(filePath).to.be.a('string').and.to.have.length.greaterThan(0).and.to.be.equal('node');
      return null;
    });
    try {
      const npmMetadata = new NpmModule(MODULE_NAME, undefined, __dirname).show(DEFAULT_REGISTRY);
      expect(npmMetadata).to.be.undefined;
      fail('Error');
    } catch (error) {
      expect(error.code).to.equal('CannotFindNodeExecutable');
    }
  });
});

describe('should run npm commands with execution errors', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    stubMethod(sandbox, shelljs, 'exec').callsFake((cmd: string) => {
      expect(cmd).to.be.a('string').and.not.to.be.empty;
      if (cmd.includes('show')) {
        return {
          code: 1,
          stderr: 'command execution error',
          stdout: '',
        };
      } else if (cmd.includes('pack')) {
        return {
          code: 1,
          stderr: 'command execution error',
          stdout: '',
        };
      } else if (cmd.includes('node')) {
        return {
          code: 0,
          stdout: 'node',
        };
      } else if (cmd.includes('sfdx')) {
        return {
          code: 0,
          stdout: 'sfdx',
        };
      } else {
        throw new Error(`Unexpected test cmd - ${cmd}`);
      }
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('show command throws error', () => {
    try {
      const npmMetadata = new NpmModule(MODULE_NAME, undefined, __dirname).show(DEFAULT_REGISTRY);
      expect(npmMetadata).to.be.undefined;
      fail('Error');
    } catch (error) {
      expect(error.code).to.equal('ShellExecError');
    }
  });

  it('Runs the pack command', () => {
    try {
      new NpmModule(MODULE_NAME, MODULE_VERSION, __dirname).pack(DEFAULT_REGISTRY, { cwd: CACHE_PATH });
      fail('Error');
    } catch (error) {
      expect(error.code).to.equal('ShellExecError');
    }
  });
});

describe('should run npm commands with parse errors', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    stubMethod(sandbox, shelljs, 'exec').callsFake((cmd: string) => {
      expect(cmd).to.be.a('string').and.not.to.be.empty;
      if (cmd.includes('show')) {
        return {
          code: 0,
          stdout: 'not a json string',
        };
      } else if (cmd.includes('pack')) {
        return {
          code: 0,
          stdout: 'not a json string',
        };
      } else if (cmd.includes('node')) {
        return {
          code: 0,
          stdout: 'node',
        };
      } else if (cmd.includes('sfdx')) {
        return {
          code: 0,
          stdout: 'sfdx',
        };
      } else {
        throw new Error(`Unexpected test cmd - ${cmd}`);
      }
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('show command throws error', () => {
    try {
      const npmMetadata = new NpmModule(MODULE_NAME, MODULE_VERSION, __dirname).show(DEFAULT_REGISTRY);
      expect(npmMetadata).to.be.undefined;
      fail('Error');
    } catch (error) {
      expect(error.code).to.equal('ShellParseError');
    }
  });

  it('Runs the pack command', () => {
    try {
      new NpmModule(MODULE_NAME, MODULE_VERSION, __dirname).pack(DEFAULT_REGISTRY, { cwd: CACHE_PATH });
      fail('Error');
    } catch (error) {
      expect(error.code).to.equal('ShellParseError');
    }
  });
});
