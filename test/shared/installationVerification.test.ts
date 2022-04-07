/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Readable, Writable } from 'stream';
import * as fs from 'fs';
import { expect } from 'chai';
import * as request from 'request';
import * as shelljs from 'shelljs';
import { stubMethod } from '@salesforce/ts-sinon';
import { SfError } from '@salesforce/core';
import Sinon = require('sinon');
import {
  ConfigContext,
  DEFAULT_REGISTRY,
  doInstallationCodeSigningVerification,
  getNpmRegistry,
  InstallationVerification,
  IRequest,
  VerificationConfig,
  Verifier,
} from '../../src/shared/installationVerification';
import { NpmMeta, NpmModule, NpmShowResults } from '../../src/shared/npmCommand';
import { NpmName } from '../../src/shared/NpmName';
import { CERTIFICATE, TEST_DATA, TEST_DATA_SIGNATURE } from '../testCert';

const BLANK_PLUGIN = { plugin: '', tag: '' };
const MODULE_NAME = '@salesforce/plugin-source';
const MODULE_VERSION = '1.0.0';
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

const getShelljsExecStub = (
  sandbox: sinon.SinonSandbox,
  npmMetadata: NpmShowResults,
  code = 0 as number,
  stderr?: string
): Sinon.SinonStub => {
  return stubMethod(sandbox, shelljs, 'exec').callsFake((cmd: string) => {
    expect(cmd).to.be.a('string').and.not.to.be.empty;
    if (cmd.includes('show')) {
      return {
        code,
        stderr,
        stdout: JSON.stringify(npmMetadata),
      };
    } else if (cmd.includes('pack')) {
      return {
        code,
        stderr,
        stdout: JSON.stringify(PACK_RESULT),
      };
    } else if (cmd.includes('node')) {
      return {
        code: 0,
        stderr,
        stdout: 'node',
      };
    } else if (cmd.includes('sfdx')) {
      return {
        code: 0,
        stderr,
        stdout: 'sfdx',
      };
    } else {
      throw new Error(`Unexpected test cmd - ${cmd}`);
    }
  });
};

describe('getNpmRegistry', () => {
  const currentRegistry = process.env.SFDX_NPM_REGISTRY;
  after(() => {
    if (currentRegistry) {
      process.env.SFDX_NPM_REGISTRY = currentRegistry;
    }
  });
  it('set registry', () => {
    const TEST_REG = 'https://registry.example.com/';
    process.env.SFDX_NPM_REGISTRY = TEST_REG;
    const reg = getNpmRegistry();
    expect(reg.href).to.be.equal(TEST_REG);
  });
  it('default registry', () => {
    delete process.env.SFDX_NPM_REGISTRY;
    const reg = getNpmRegistry();
    expect(reg.href).to.be.equal(DEFAULT_REGISTRY);
  });
});

describe('InstallationVerification Tests', () => {
  const config: ConfigContext = {
    get dataDir() {
      return 'dataPath';
    },
    get cacheDir() {
      return 'cacheDir';
    },
    get configDir() {
      return 'configDir';
    },
    get cliRoot() {
      return __dirname;
    },
  };
  const currentRegistry = process.env.SFDX_NPM_REGISTRY;
  let fsReaddirSyncStub: Sinon.SinonStub;
  let plugin: NpmName;
  let realpathSyncStub: Sinon.SinonStub;
  let sandbox: sinon.SinonSandbox;
  let shelljsExecStub: Sinon.SinonStub;
  let shelljsFindStub: Sinon.SinonStub;
  let pollForAvailabilityStub: Sinon.SinonStub;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    fsReaddirSyncStub = stubMethod(sandbox, fs, 'readdirSync').returns([
      {
        name: 'foo-1.0.0.tgz',
        isFile() {
          return true;
        },
      },
    ]);
    realpathSyncStub = stubMethod(sandbox, fs, 'realpathSync').returns('node.exe');
    shelljsFindStub = stubMethod(sandbox, shelljs, 'find').returns(['node.exe']);
    plugin = NpmName.parse('foo');
    pollForAvailabilityStub = stubMethod(sandbox, NpmModule.prototype, 'pollForAvailability').resolves();
  });

  afterEach(() => {
    fsReaddirSyncStub.restore();
    realpathSyncStub.restore();
    shelljsFindStub.restore();
    if (shelljsExecStub) {
      shelljsExecStub.restore();
    }
    pollForAvailabilityStub.restore();
  });

  after(() => {
    if (currentRegistry) {
      process.env.SFDX_NPM_REGISTRY = currentRegistry;
    }
  });

  it('falsy engine config', () => {
    expect(() => new InstallationVerification().setConfig(null))
      .to.throw(Error)
      .and.have.property('name', 'InvalidParam');
  });

  it('Steel thread test', async () => {
    const npmMetadata: NpmShowResults = {
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

    shelljsExecStub = getShelljsExecStub(sandbox, npmMetadata);

    const iRequest: IRequest = (url: string, cb?: request.RequestCallback): void => {
      if (url.includes('sig')) {
        cb(null, { statusCode: 200 } as request.Response, TEST_DATA_SIGNATURE);
      } else if (url.includes('crt')) {
        cb(null, { statusCode: 200 } as request.Response, CERTIFICATE);
      } else {
        throw new Error(`Unexpected test url - ${url}`);
      }
    };

    const fsImpl = {
      readFile() {},
      createWriteStream() {
        return new Writable({
          write() {},
        });
      },
      createReadStream() {
        return new Readable({
          read() {
            this.push(TEST_DATA);
            this.push(null);
          },
        });
      },
      unlink() {
        throw new Error('this should still resolve.');
      },
    };

    const verification = new InstallationVerification(iRequest, fsImpl).setPluginNpmName(plugin).setConfig(config);

    return verification.verify().then((meta: NpmMeta) => {
      expect(meta).to.have.property('verified', true);
    });
  });

  it('Steel thread version - version number', async () => {
    const npmMetadata: NpmShowResults = {
      versions: ['1.0.0', '1.0.1'],
      'dist-tags': {
        latest: '1.0.1',
      },
      sfdx: {
        publicKeyUrl: 'https://developer.salesforce.com/crt',
        signatureUrl: 'https://developer.salesforce.com/sig',
      },
      dist: {
        tarball: 'https://registry.example.com/foo.tgz',
      },
    };

    shelljsExecStub = getShelljsExecStub(sandbox, npmMetadata);

    const iRequest: IRequest = (url: string, cb?: request.RequestCallback): Readable => {
      if (url.includes('foo.tgz')) {
        const reader = new Readable({
          read() {},
        });
        process.nextTick(() => {
          reader.emit('end');
        });
        return reader;
      } else if (url.includes('sig')) {
        cb(null, { statusCode: 200 } as request.Response, TEST_DATA_SIGNATURE);
      } else if (url.includes('crt')) {
        cb(null, { statusCode: 200 } as request.Response, CERTIFICATE);
      } else {
        throw new Error(`Unexpected test url - ${url}`);
      }
    };

    const fsImpl = {
      readFile() {},
      createWriteStream() {
        return new Writable({
          write() {},
        });
      },
      createReadStream() {
        return new Readable({
          read() {
            this.push(TEST_DATA);
            this.push(null);
          },
        });
      },
      unlink() {
        throw new Error('this should still resolve.');
      },
    };

    plugin.tag = '1.0.0';
    const verification = new InstallationVerification(iRequest, fsImpl).setPluginNpmName(plugin).setConfig(config);

    return verification.verify().then((meta: NpmMeta) => {
      expect(meta).to.have.property('verified', true);
    });
  });

  it('Steel thread version - tag name', async () => {
    const npmMetadata: NpmShowResults = {
      versions: ['1.0.0', '1.0.1'],
      'dist-tags': {
        latest: '1.0.1',
        gozer: '1.0.0',
      },
      sfdx: {
        publicKeyUrl: 'https://developer.salesforce.com/crt.master',
        signatureUrl: 'https://developer.salesforce.com/sig.weaver',
      },
      dist: {
        tarball: 'https://registry.example.com/foo.tgz',
      },
    };

    shelljsExecStub = getShelljsExecStub(sandbox, npmMetadata);
    const iRequest: IRequest = (url: string, cb?: request.RequestCallback) => {
      if (url.includes('sig.weaver')) {
        cb(null, { statusCode: 200 } as request.Response, TEST_DATA_SIGNATURE);
      } else if (url.includes('crt.master')) {
        cb(null, { statusCode: 200 } as request.Response, CERTIFICATE);
      } else {
        throw new Error(`Unexpected test url - ${url}`);
      }
    };

    const fsImpl = {
      readFile() {},
      createWriteStream() {
        return new Writable({
          write() {},
        });
      },
      createReadStream() {
        return new Readable({
          read() {
            this.push(TEST_DATA);
            this.push(null);
          },
        });
      },
      unlink() {
        throw new Error('this should still resolve.');
      },
    };

    plugin.tag = 'gozer';
    // For the key and signature to line up gozer must map to 1.2.3
    const verification = new InstallationVerification(iRequest, fsImpl).setPluginNpmName(plugin).setConfig(config);

    return verification.verify().then((meta: NpmMeta) => {
      expect(meta).to.have.property('verified', true);
    });
  });

  it('Steel thread version - npm registry on path', async () => {
    const TEST_REG = 'https://example.com/registry';
    process.env.SFDX_NPM_REGISTRY = TEST_REG;

    const npmMetadata: NpmShowResults = {
      versions: ['1.0.0', '1.0.1'],
      'dist-tags': {
        latest: '1.0.1',
        gozer: '1.0.0',
      },
      sfdx: {
        publicKeyUrl: 'https://developer.salesforce.com/crt.master',
        signatureUrl: 'https://developer.salesforce.com/sig.weaver',
      },
      dist: {
        tarball: 'https://example.com/registry/foo.tgz',
      },
    };

    shelljsExecStub = getShelljsExecStub(sandbox, npmMetadata);

    const iRequest: IRequest = (url: string, cb?: request.RequestCallback) => {
      if (url.includes('sig.weaver')) {
        cb(null, { statusCode: 200 } as request.Response, TEST_DATA_SIGNATURE);
      } else if (url.includes('crt.master')) {
        cb(null, { statusCode: 200 } as request.Response, CERTIFICATE);
      } else {
        throw new Error(`Unexpected test url - ${url}`);
      }
    };

    const fsImpl = {
      readFile() {},
      createWriteStream() {
        return new Writable({
          write() {},
        });
      },
      createReadStream() {
        return new Readable({
          read() {
            this.push(TEST_DATA);
            this.push(null);
          },
        });
      },
      unlink() {
        throw new Error('this should still resolve.');
      },
    };

    plugin.tag = 'gozer';
    // For the key and signature to line up gozer must map to 1.2.3
    const verification = new InstallationVerification(iRequest, fsImpl).setPluginNpmName(plugin).setConfig(config);

    return verification.verify().then((meta: NpmMeta) => {
      expect(meta).to.have.property('verified', true);
    });
  });

  it('InvalidNpmMetadata', async () => {
    const npmMetadata = {} as unknown as NpmShowResults;

    shelljsExecStub = getShelljsExecStub(sandbox, npmMetadata);

    const iRequest: IRequest = (url: string, cb?: request.RequestCallback) => {
      if (url.includes('sig')) {
        cb(null, { statusCode: 200 } as request.Response, TEST_DATA_SIGNATURE);
      } else if (url.includes('key')) {
        cb(null, { statusCode: 200 } as request.Response, CERTIFICATE);
      } else {
        throw new Error(`Unexpected test url - ${url}`);
      }
    };

    const fsImpl = {
      readFile() {},
      unlink() {},
    };

    const verification = new InstallationVerification(iRequest, fsImpl).setPluginNpmName(plugin).setConfig(config);

    return verification
      .verify()
      .then(() => {
        throw new Error("This shouldn't happen. Failure expected");
      })
      .catch((err: Error) => {
        expect(err).to.have.property('name', 'InvalidNpmMetadata');
      });
  });

  it('Not Signed', async () => {
    const npmMetadata: NpmShowResults = {
      versions: ['1.0.0', '1.0.1'],
      'dist-tags': {
        latest: '1.0.1',
        gozer: '1.0.0',
      },
      dist: {
        tarball: 'https://example.com/registry/foo.tgz',
      },
    };

    shelljsExecStub = getShelljsExecStub(sandbox, npmMetadata);

    const iRequest: IRequest = (url: string, cb?: request.RequestCallback) => {
      if (url.includes('sig')) {
        cb(null, { statusCode: 200 } as request.Response, TEST_DATA_SIGNATURE);
      } else if (url.includes('key')) {
        cb(null, { statusCode: 200 } as request.Response, CERTIFICATE);
      } else {
        throw new Error(`Unexpected test url - ${url}`);
      }
    };

    const fsImpl = {
      readFile() {},
      unlink() {},
    };

    const verification = new InstallationVerification(iRequest, fsImpl).setPluginNpmName(plugin).setConfig(config);

    return verification
      .verify()
      .then(() => {
        throw new Error("This shouldn't happen. Failure expected");
      })
      .catch((err: Error) => {
        expect(err).to.have.property('name', 'NotSigned');
      });
  });

  it('NpmCommand Meta Request Error', async () => {
    shelljsExecStub = getShelljsExecStub(sandbox, {} as NpmShowResults, 1, 'command execution error');

    const iRequest: IRequest = (url: string, cb?: request.RequestCallback) => {
      if (url.includes('sig')) {
        cb(null, { statusCode: 200 } as request.Response, TEST_DATA_SIGNATURE);
      } else if (url.includes('key')) {
        cb(null, { statusCode: 200 } as request.Response, CERTIFICATE);
      } else if (url.endsWith(plugin.name)) {
        const err = new Error();
        err.name = 'NPMMetaError';
        cb(err, { statusCode: 500 } as request.Response, {});
      } else {
        throw new Error(`Unexpected test url - ${url}`);
      }
    };

    const fsImpl = {
      readFile() {},
      unlink() {},
    };

    const verification = new InstallationVerification(iRequest, fsImpl).setPluginNpmName(plugin).setConfig(config);

    return verification
      .verify()
      .then(() => {
        throw new Error("This shouldn't happen. Failure expected");
      })
      .catch((err: Error) => {
        expect(err).to.have.property('name', 'ShellExecError');
      });
  });

  it.skip('server error', async () => {
    let returnCode = 404;
    const iRequest: IRequest = (url: string, cb?: request.RequestCallback): Readable => {
      if (url.includes('foo.tgz')) {
        const reader = new Readable({
          read() {},
        });
        process.nextTick(() => {
          reader.emit('end');
        });
        return reader;
      } else if (url.includes('sig')) {
        cb(null, { statusCode: 200 } as request.Response, TEST_DATA_SIGNATURE);
      } else if (url.includes('key')) {
        cb(null, { statusCode: 200 } as request.Response, CERTIFICATE);
      } else if (url.endsWith(plugin.name)) {
        cb(null, { statusCode: returnCode } as request.Response, {});
      } else {
        throw new Error(`Unexpected test url - ${url}`);
      }
    };

    const fsImpl = {
      readFile() {},
      unlink() {},
    };

    const results = [
      { code: 404, expectedName: 'PluginNotFound' },
      { code: 403, expectedName: 'PluginAccessDenied' },
    ];

    for (const testMeta of results) {
      returnCode = testMeta.code;
      const verification = new InstallationVerification(iRequest, fsImpl).setPluginNpmName(plugin).setConfig(config);
      try {
        await verification.verify();
      } catch (error) {
        expect(error).to.have.property('name', testMeta.expectedName);
      }
    }
  });

  it.skip('Read tarball stream failed', () => {
    const ERROR = 'Ok, who brought the dog? - Louis Tully';

    const iRequest: IRequest = (url: string, cb?: request.RequestCallback): Readable => {
      if (url.includes('foo.tgz')) {
        const reader = new Readable({
          read() {},
        });
        process.nextTick(() => {
          reader.emit('error', new Error(ERROR));
        });
        return reader;
      } else if (url.endsWith(plugin.name)) {
        cb(
          null,
          { statusCode: 200 } as request.Response,
          JSON.stringify({
            versions: {
              '1.2.3': {
                sfdx: {
                  publicKeyUrl: 'https://developer.salesforce.com/key',
                  signatureUrl: 'https://developer.salesforce.com/sig',
                },
                dist: {
                  tarball: 'https://registry.example.com/foo.tgz',
                },
              },
            },
            'dist-tags': {
              latest: '1.2.3',
            },
          })
        );
      } else {
        throw new Error(`Unexpected test url - ${url}`);
      }
    };

    const fsImpl = {
      readFile() {},
      unlink() {},
      createWriteStream() {
        return new Writable({
          write() {},
        });
      },
    };

    const verification = new InstallationVerification(iRequest, fsImpl).setPluginNpmName(plugin).setConfig(config);

    return verification
      .verify()
      .then(() => {
        throw new Error("This shouldn't happen. Failure expected");
      })
      .catch((err: Error) => {
        expect(err).to.have.property('message', ERROR);
      });
  });

  it('404 for public key', () => {
    const npmMetadata: NpmShowResults = {
      versions: ['1.0.0', '1.0.1'],
      'dist-tags': {
        latest: '1.0.0',
      },
      sfdx: {
        publicKeyUrl: 'https://developer.salesforce.com/crt',
        signatureUrl: 'https://developer.salesforce.com/sig',
      },
      dist: {
        tarball: 'https://example.com/registry/foo.tgz',
      },
    };

    shelljsExecStub = getShelljsExecStub(sandbox, npmMetadata);

    const iRequest: IRequest = (url: string, cb?: request.RequestCallback) => {
      if (url.includes('sig')) {
        cb(null, { statusCode: 200 } as request.Response, TEST_DATA_SIGNATURE);
      } else if (url.includes('crt')) {
        cb(null, { statusCode: 404 } as request.Response, {});
      } else {
        throw new Error(`Unexpected test url - ${url}`);
      }
    };

    const fsImpl = {
      readFile() {},
      unlink() {},
      createWriteStream() {
        return new Writable({
          write() {},
        });
      },
      createReadStream() {
        return new Readable({
          read() {
            this.push(TEST_DATA);
            this.push(null);
          },
        });
      },
    };

    const verification = new InstallationVerification(iRequest, fsImpl).setPluginNpmName(plugin).setConfig(config);

    return verification
      .verify()
      .then(() => {
        throw new Error("This shouldn't happen. Failure expected");
      })
      .catch((err: Error) => {
        expect(err).to.have.property('name', 'ErrorGettingContent');
        expect(err.message).to.include('404');
      });
  });

  describe('isAllowListed', () => {
    it('steel thread with scope', async () => {
      const TEST_VALUE1 = '@salesforce/FOO';
      const fsImpl = {
        readFile(path, cb) {
          cb(null, `["${TEST_VALUE1}"]`);
        },
        unlink() {},
      };
      const verification1 = new InstallationVerification(null, fsImpl)
        .setPluginNpmName(NpmName.parse(TEST_VALUE1))
        .setConfig(config);
      expect(await verification1.isAllowListed()).to.be.equal(true);
    });

    it('steel thread without scope', async () => {
      const TEST_VALUE2 = 'FOO';
      const fsImpl = {
        readFile(path, cb) {
          cb(null, `["${TEST_VALUE2}"]`);
        },
        unlink() {},
      };
      const verification2 = new InstallationVerification(null, fsImpl)
        .setPluginNpmName(NpmName.parse(TEST_VALUE2))
        .setConfig(config);
      expect(await verification2.isAllowListed()).to.be.equal(true);
    });

    it("file doesn't exist", async () => {
      const fsImpl = {
        readFile(path, cb) {
          const error = new SfError('ENOENT', 'ENOENT');
          error['code'] = 'ENOENT';
          cb(error);
        },
        unlink() {},
      };

      const verification = new InstallationVerification(null, fsImpl)
        .setPluginNpmName(NpmName.parse('BAR'))
        .setConfig(config);
      expect(await verification.isAllowListed()).to.be.equal(false);
    });
  });

  describe('doInstallationCodeSigningVerification', () => {
    it('valid signature', async () => {
      let message = '';
      const vConfig = new VerificationConfig();
      vConfig.verifier = {
        async verify() {
          return {
            verified: true,
          };
        },
      } as Verifier;

      vConfig.log = (_message) => {
        message = _message;
      };

      await doInstallationCodeSigningVerification({}, BLANK_PLUGIN, vConfig);
      expect(message).to.include('Successfully');
      expect(message).to.include('digital signature');
    });

    it('FailedDigitalSignatureVerification', () => {
      const vConfig = new VerificationConfig();
      vConfig.verifier = {
        async verify() {
          return {
            verified: false,
          };
        },
      } as Verifier;

      return doInstallationCodeSigningVerification({}, BLANK_PLUGIN, vConfig).catch((err) => {
        expect(err).to.have.property('name', 'FailedDigitalSignatureVerification');
      });
    });

    it('Canceled by user', () => {
      const vConfig = new VerificationConfig();
      vConfig.verifier = {
        async verify() {
          const err = new Error();
          err.name = 'NotSigned';
          throw err;
        },
        async isAllowListed() {
          return false;
        },
      } as Verifier;

      vConfig.prompt = async () => {
        return 'N';
      };

      return doInstallationCodeSigningVerification({}, BLANK_PLUGIN, vConfig)
        .then(() => {
          throw new Error('Failure: This should never happen');
        })
        .catch((err) => {
          expect(err).to.have.property('name', 'InstallationCanceledError');
        });
    });

    it('continue installation general error', () => {
      const vConfig = new VerificationConfig();
      vConfig.verifier = {
        async verify() {
          const err = new Error();
          err.name = 'UnexpectedHost';
          throw err;
        },
        async isAllowListed() {
          return false;
        },
      } as Verifier;

      vConfig.prompt = async () => {
        return 'Y';
      };

      return doInstallationCodeSigningVerification({}, BLANK_PLUGIN, vConfig)
        .then(() => {
          throw new Error('Failure: This should never happen');
        })
        .catch((err) => {
          expect(err).to.have.property('name', 'UnexpectedHost');
        });
    });

    it('continue installation name not signed', async () => {
      const vConfig = new VerificationConfig();
      vConfig.verifier = {
        async verify() {
          const err = new Error();
          err.name = 'NotSigned';
          throw err;
        },
        async isAllowListed() {
          return false;
        },
      } as Verifier;

      vConfig.prompt = async () => {
        return 'Y';
      };

      try {
        await doInstallationCodeSigningVerification({}, BLANK_PLUGIN, vConfig);
      } catch (e) {
        const err = new Error("this test shouldn't fail.");
        err.stack = e.stack;
        throw err;
      }
    });
  });
});
