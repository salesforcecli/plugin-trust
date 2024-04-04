/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'node:path';
import { Readable } from 'node:stream';
import { URL } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';

import { Logger, SfError, Messages } from '@salesforce/core';
import got from 'got';
import { ProxyAgent } from 'proxy-agent';
import { ux } from '@oclif/core';
import { prompts } from '@salesforce/sf-plugins-core';
import { maxSatisfying } from 'semver';
import { NpmModule, NpmMeta } from './npmCommand.js';
import { NpmName } from './NpmName.js';
import { setErrorName } from './errors.js';

const CRYPTO_LEVEL = 'RSA-SHA256';
const ALLOW_LIST_FILENAME = 'unsignedPluginAllowList.json';
export const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';
Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

export interface ConfigContext {
  configDir?: string;
  cacheDir?: string;
  dataDir?: string;
  cliRoot?: string;
}
export interface Verifier {
  verify(): Promise<NpmMeta>;
  isAllowListed(): Promise<boolean>;
}

class CodeVerifierInfo {
  private signature?: Readable;
  private publicKey?: Readable;
  private data?: Readable;

  public get dataToVerify(): Readable {
    if (!this.data) {
      throw new Error('CodeVerifierInfo: Verifier has no data because it has not be set');
    }
    return this.data;
  }

  public set dataToVerify(value: Readable) {
    this.data = value;
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  public get signatureStream(): Readable {
    if (!this.signature) {
      throw new Error('CodeVerifierInfo: signatureStream has no value because it has not be set');
    }
    return this.signature;
  }

  public set signatureStream(value: Readable) {
    this.signature = value;
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  public get publicKeyStream(): Readable {
    if (!this.publicKey) {
      throw new Error('CodeVerifierInfo: publicKey has no value because it has not be set');
    }
    return this.publicKey;
  }

  public set publicKeyStream(value: Readable) {
    this.publicKey = value;
  }
}

function validSalesforceHostname(url: string | null): boolean {
  if (!url) {
    return false;
  }
  const parsedUrl = new URL(url);

  if (process.env.SFDX_ALLOW_ALL_SALESFORCE_CERTSIG_HOSTING === 'true') {
    return Boolean(parsedUrl.hostname) && /(\.salesforce\.com)$/.test(parsedUrl.hostname);
  } else {
    return (
      parsedUrl.protocol === 'https:' &&
      Boolean(parsedUrl.hostname) &&
      parsedUrl.hostname === 'developer.salesforce.com'
    );
  }
}

function retrieveKey(stream: Readable): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let key = '';
    if (stream) {
      stream.on('data', (chunk) => {
        key += chunk;
      });
      stream.on('end', () => {
        if (!key.includes('-----BEGIN')) {
          return reject(new SfError('The specified key format is invalid.', 'InvalidKeyFormat'));
        }
        return resolve(key);
      });
      stream.on('error', (err) => reject(err));
    }
  });
}

export async function verify(codeVerifierInfo: CodeVerifierInfo): Promise<boolean> {
  const publicKey = await retrieveKey(codeVerifierInfo.publicKeyStream);
  const signApi = crypto.createVerify(CRYPTO_LEVEL);

  return new Promise<boolean>((resolve, reject) => {
    codeVerifierInfo.dataToVerify.on('error', (err) => reject(errorHandlerForVerify(err)));
    codeVerifierInfo.dataToVerify.pipe(signApi);

    codeVerifierInfo.dataToVerify.on('end', () => {
      // The sign signature returns a base64 encode string.
      let signature = Buffer.alloc(0);
      codeVerifierInfo.signatureStream.on('data', (chunk: Buffer) => {
        signature = Buffer.concat([signature, chunk]);
      });

      codeVerifierInfo.signatureStream.on('end', () => {
        if (signature.byteLength === 0) {
          return reject(new SfError('The provided signature is invalid or missing.', 'InvalidSignature'));
        } else {
          const verification = signApi.verify(publicKey, signature.toString('utf8'), 'base64');
          return resolve(verification);
        }
      });

      codeVerifierInfo.signatureStream.on('error', (err) => reject(errorHandlerForVerify(err)));
    });
  });
}

const errorHandlerForVerify = (err: Error): Error => {
  if ('code' in err && err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
    return setErrorName(
      new SfError('Encountered a self signed certificated. To enable "export NODE_TLS_REJECT_UNAUTHORIZED=0"'),
      'SelfSignedCert'
    );
  }
  return err;
};

export const getNpmRegistry = (): URL =>
  new URL(process.env.SF_NPM_REGISTRY ?? process.env.SFDX_NPM_REGISTRY ?? DEFAULT_REGISTRY);

export async function isAllowListed({
  logger,
  configPath,
  name,
}: {
  logger: Logger;
  configPath: string;
  name?: string;
}): Promise<boolean> {
  const allowListedFilePath = path.join(configPath, ALLOW_LIST_FILENAME);
  logger.debug(`isAllowListed | allowlistFilePath: ${allowListedFilePath}`);
  let fileContent: string;
  try {
    fileContent = await fs.promises.readFile(allowListedFilePath, 'utf8');
    const allowlistArray = JSON.parse(fileContent) as string[];
    logger.debug('isAllowListed | Successfully parsed allowlist.');
    return name ? allowlistArray.includes(name) : false;
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      return false;
    } else {
      throw err;
    }
  }
}

/**
 * class for verifying a digital signature pack of an npm
 */
export class InstallationVerification implements Verifier {
  // The name of the published plugin
  private pluginNpmName?: NpmName;

  // config derived from the cli environment
  private config?: ConfigContext;
  private logger?: Logger;

  /**
   * setter for the cli engine config
   *
   * @param _config cli engine config
   */
  public setConfig(_config?: ConfigContext): InstallationVerification {
    if (_config) {
      this.config = _config;
      return this;
    }
    throw setErrorName(new SfError('the cli engine config cannot be null', 'InvalidParam'), 'InvalidParam');
  }

  /**
   * setter for the plugin name
   *
   * @param _pluginName the published plugin name
   */
  public setPluginNpmName(_pluginName?: NpmName | undefined): InstallationVerification {
    if (_pluginName) {
      this.pluginNpmName = _pluginName;
      return this;
    }
    throw setErrorName(new SfError('the plugin name cannot be null', 'InvalidParam'), 'InvalidParam');
  }

  /**
   * validates the digital signature.
   */
  public async verify(): Promise<NpmMeta> {
    const logger = await this.getLogger();

    const npmMeta = await this.streamTagGz();
    if (!npmMeta.tarballLocalPath) {
      throw new SfError('The npmMeta does not contain a tarball path');
    }
    if (!npmMeta.signatureUrl) {
      throw new SfError('The npmMeta does not contain a signatureUrl');
    }
    if (!npmMeta.publicKeyUrl) {
      throw new SfError('The npmMeta does not contain a publicKeyUrl');
    }

    logger.debug(`verify | Found npmMeta? ${!!npmMeta}`);

    logger.debug(`verify | creating a read stream for path - npmMeta.tarballLocalPath: ${npmMeta.tarballLocalPath}`);

    logger.debug(`verify | npmMeta.signatureUrl: ${npmMeta.signatureUrl}`);
    logger.debug(`verify | npmMeta.publicKeyUrl: ${npmMeta.publicKeyUrl}`);

    const [signatureStream, publicKeyStream] = await Promise.all([
      getSigningContent(npmMeta.signatureUrl),
      getSigningContent(npmMeta.publicKeyUrl),
    ]);
    const info = new CodeVerifierInfo();
    info.dataToVerify = fs.createReadStream(npmMeta.tarballLocalPath, { encoding: 'binary' });
    info.publicKeyStream = publicKeyStream;
    info.signatureStream = signatureStream;
    npmMeta.verified = await verify(info);
    try {
      await fs.promises.rm(npmMeta.tarballLocalPath);
    } catch (err) {
      logger.debug(`error occurred deleting cache tgz at path: ${npmMeta.tarballLocalPath}`);
      logger.debug(err);
    }
    return npmMeta;
  }

  public async isAllowListed(): Promise<boolean> {
    return isAllowListed({
      logger: await this.getLogger(),
      configPath: this.getConfigPath() ?? '',
      name: this.pluginNpmName?.toString(),
    });
  }

  /**
   * Downloads the tgz file content and stores it in a cache folder
   */
  public async streamTagGz(): Promise<NpmMeta> {
    const logger = await this.getLogger();
    const npmMeta = await this.retrieveNpmMeta();
    if (!npmMeta.tarballUrl) {
      throw new Error('tarballUrl is not defined in the npmMeta object');
    }
    const urlObject: URL = new URL(npmMeta.tarballUrl);
    const urlPathsAsArray = urlObject.pathname.split('/');
    npmMeta.tarballFilename = npmMeta.moduleName?.replace(/@/g, '');
    logger.debug(`streamTagGz | urlPathsAsArray: ${urlPathsAsArray.join(',')}`);

    const fileNameStr: string = urlPathsAsArray[urlPathsAsArray.length - 1];
    logger.debug(`streamTagGz | fileNameStr: ${fileNameStr}`);

    // Make sure the cache path exists.
    try {
      if (!npmMeta.moduleName) {
        throw new Error('moduleName is not defined in the npmMeta object');
      }
      if (!npmMeta.version) {
        throw new Error('version is not defined in the npmMeta object');
      }
      await mkdir(this.getCachePath(), { recursive: true });
      const npmModule = new NpmModule(npmMeta.moduleName, npmMeta.version, this.config?.cliRoot);
      await npmModule.fetchTarball(getNpmRegistry().href, {
        cwd: this.getCachePath(),
      });
      const tarBallFile = fs
        .readdirSync(this.getCachePath(), { withFileTypes: true })
        .find((entry) => entry.isFile() && npmMeta.version && entry.name.includes(npmMeta.version));
      if (!tarBallFile) {
        throw new Error(`Unable to find retrieved tarball file for ${npmMeta.moduleName} version ${npmMeta.version}`);
      }
      npmMeta.tarballLocalPath = path.join(this.getCachePath(), tarBallFile.name);
    } catch (err) {
      logger.debug(err);
      throw err;
    }

    return npmMeta;
  }

  // this is generally $HOME/.config/sfdx
  private getConfigPath(): string {
    if (!this.config?.configDir) {
      throw new Error('configDir is not defined in the config object');
    }
    return this.config.configDir;
  }

  // this is generally $HOME/Library/Caches/sfdx on mac
  private getCachePath(): string {
    if (!this.config?.cacheDir) {
      throw new Error('cacheDir is not defined in the config object');
    }
    return this.config.cacheDir;
  }

  /**
   * Invoke npm to discover a urls for the certificate and digital signature.
   */
  private async retrieveNpmMeta(): Promise<NpmMeta> {
    const logger = await this.getLogger();
    const npmRegistry = getNpmRegistry();

    if (!this.pluginNpmName) {
      throw new Error(
        'pluginNpmName is not defined on the InstallationVerification class.  setPluginNpmName should have been called before this method.'
      );
    }
    logger.debug(`retrieveNpmMeta | npmRegistry: ${npmRegistry.href}`);
    logger.debug(`retrieveNpmMeta | this.pluginNpmName.name: ${this.pluginNpmName.name}`);
    logger.debug(`retrieveNpmMeta | this.pluginNpmName.scope: ${this.pluginNpmName.scope}`);
    logger.debug(`retrieveNpmMeta | this.pluginNpmName.tag: ${this.pluginNpmName.tag}`);

    const npmShowModule = this.pluginNpmName.scope
      ? `@${this.pluginNpmName.scope}/${this.pluginNpmName.name}`
      : this.pluginNpmName.name;

    const npmModule = new NpmModule(npmShowModule, this.pluginNpmName.tag, this.config?.cliRoot);
    const npmMetadata = npmModule.show(npmRegistry.href);
    logger.debug('retrieveNpmMeta | Found npm meta information.');
    if (!npmMetadata.versions) {
      const err = new SfError(
        `The npm metadata for plugin ${this.pluginNpmName.name} is missing the versions attribute.`,
        'InvalidNpmMetadata'
      );
      throw setErrorName(err, 'InvalidNpmMetadata');
    }

    // Assume the tag is version tag.
    let versionNumber =
      maxSatisfying(npmMetadata.versions, this.pluginNpmName.tag) ??
      npmMetadata.versions.find((version) => version === this.pluginNpmName?.tag);

    logger.debug(`retrieveNpmMeta | versionObject: ${JSON.stringify(versionNumber)}`);

    // If the assumption was not correct the tag must be a non-versioned dist-tag or not specified.
    if (!versionNumber) {
      // Assume dist-tag;
      const distTags = npmMetadata['dist-tags'];
      logger.debug(`retrieveNpmMeta | distTags: ${JSON.stringify(distTags)}`);
      if (distTags) {
        const tagVersionStr: string = distTags[this.pluginNpmName.tag];
        logger.debug(`retrieveNpmMeta | tagVersionStr: ${tagVersionStr}`);

        // if we got a dist tag hit look up the version object
        if (tagVersionStr && tagVersionStr.length > 0 && tagVersionStr.includes('.')) {
          versionNumber =
            maxSatisfying(npmMetadata.versions, tagVersionStr) ??
            npmMetadata.versions.find((version) => version === tagVersionStr);
          logger.debug(`retrieveNpmMeta | versionObject: ${versionNumber}`);
        } else {
          const err = new SfError(
            `The dist tag ${this.pluginNpmName.tag} was not found for plugin: ${this.pluginNpmName.name}`,
            'NpmTagNotFound'
          );
          throw setErrorName(err, 'NpmTagNotFound');
        }
      } else {
        throw setErrorName(
          new SfError('The deployed NPM is missing dist-tags.', 'UnexpectedNpmFormat'),
          'UnexpectedNpmFormat'
        );
      }
    }

    npmModule.npmMeta.version = versionNumber;

    if (!npmMetadata.sfdx) {
      throw setErrorName(new SfError('This plugin is not signed by Salesforce.com, Inc.', 'NotSigned'), 'NotSigned');
    } else {
      if (!validSalesforceHostname(npmMetadata.sfdx.publicKeyUrl)) {
        const err = new SfError(
          `The host is not allowed to provide signing information. [${npmMetadata.sfdx.publicKeyUrl}]`,
          'UnexpectedHost'
        );
        throw setErrorName(err, 'UnexpectedHost');
      } else {
        logger.debug(`retrieveNpmMeta | versionObject.sfdx.publicKeyUrl: ${npmMetadata.sfdx.publicKeyUrl}`);
        npmModule.npmMeta.publicKeyUrl = npmMetadata.sfdx.publicKeyUrl;
      }

      if (!validSalesforceHostname(npmMetadata.sfdx.signatureUrl)) {
        const err = new SfError(
          `The host is not allowed to provide signing information. [${npmMetadata.sfdx.signatureUrl}]`,
          'UnexpectedHost'
        );
        throw setErrorName(err, 'UnexpectedHost');
      } else {
        logger.debug(`retrieveNpmMeta | versionObject.sfdx.signatureUrl: ${npmMetadata.sfdx.signatureUrl}`);
        npmModule.npmMeta.signatureUrl = npmMetadata.sfdx.signatureUrl;
      }

      npmModule.npmMeta.tarballUrl = npmMetadata.dist?.tarball;

      logger.debug(`retrieveNpmMeta | meta.tarballUrl: ${npmModule.npmMeta.tarballUrl}`);

      return npmModule.npmMeta;
    }
  }

  private async getLogger(): Promise<Logger> {
    if (!this.logger) {
      this.logger = await Logger.child('InstallationVerification');
    }
    return this.logger;
  }
}

export class VerificationConfig {
  public verifier?: Verifier;

  // eslint-disable-next-line class-methods-use-this
  public log(message: string): void {
    ux.log(message);
  }
}

export async function doPrompt(plugin?: string): Promise<void> {
  const messages = Messages.loadMessages('@salesforce/plugin-trust', 'verify');
  if (
    !(await prompts.confirm({
      message: messages.getMessage('InstallConfirmation', [plugin ?? 'This plugin']),
      ms: 30_000,
    }))
  ) {
    throw new SfError('The user canceled the plugin installation.', 'InstallationCanceledError');
  }
  // they approved the plugin.  Let them know how to automate this.
  ux.log(messages.getMessage('SuggestAllowList'));
}

export async function doInstallationCodeSigningVerification(
  config: ConfigContext,
  plugin: { plugin: string; tag: string },
  verificationConfig: VerificationConfig
): Promise<void> {
  const messages = Messages.loadMessages('@salesforce/plugin-trust', 'verify');

  if (await verificationConfig.verifier?.isAllowListed()) {
    verificationConfig.log(messages.getMessage('SkipSignatureCheck', [plugin.plugin]));
    return;
  }
  try {
    if (!verificationConfig.verifier) {
      throw new Error('VerificationConfig.verifier is not set.');
    }
    const meta = await verificationConfig.verifier.verify();
    if (!meta.verified) {
      const err = messages.createError('FailedDigitalSignatureVerification');
      throw setErrorName(err, 'FailedDigitalSignatureVerification');
    }
    verificationConfig.log(messages.getMessage('SignatureCheckSuccess', [plugin.plugin]));
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'NotSigned' || err.message?.includes('Response code 403')) {
        if (!verificationConfig.verifier) {
          throw new Error('VerificationConfig.verifier is not set.');
        }
        return await doPrompt(plugin.plugin);
      } else if (err.name === 'PluginNotFound' || err.name === 'PluginAccessDenied') {
        throw setErrorName(new SfError(err.message ?? 'The user canceled the plugin installation.'), '');
      }
      throw setErrorName(SfError.wrap(err), err.name);
    }
  }
}

/**
 * Retrieve url content for a host
 *
 * @param url host url.
 */
const getSigningContent = async (url: string): Promise<Readable> => {
  const res = await got.get({
    url,
    timeout: { request: 10_000 },
    agent: { https: new ProxyAgent() },
  });
  if (res.statusCode !== 200) {
    throw new SfError(`A request to url ${url} failed with error code: [${res.statusCode}]`, 'ErrorGettingContent');
  }
  return Readable.from(Buffer.from(res.body));
};
