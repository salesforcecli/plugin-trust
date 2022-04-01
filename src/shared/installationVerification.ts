/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import * as path from 'path';
import { Readable } from 'stream';
import { parse as parseUrl, URL, UrlWithStringQuery } from 'url';
import { promisify as utilPromisify } from 'util';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { mkdir } from 'fs/promises';
import { Logger, SfError } from '@salesforce/core';
import * as request from 'request';
import { NpmModule, NpmMeta } from '../shared/npmCommand';
import { NpmName } from './NpmName';

const CRYPTO_LEVEL = 'RSA-SHA256';
export const ALLOW_LIST_FILENAME = 'unsignedPluginAllowList.json';
export const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';
export type IRequest = (url: string, cb?: request.RequestCallback) => void;

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

export class CodeVerifierInfo {
  private signature: Readable;
  private publicKey: Readable;
  private data: Readable;

  public get dataToVerify(): Readable {
    return this.data;
  }

  public set dataToVerify(value: Readable) {
    this.data = value;
  }

  public get signatureStream(): Readable {
    return this.signature;
  }

  public set signatureStream(value: Readable) {
    this.signature = value;
  }

  public get publicKeyStream(): Readable {
    return this.publicKey;
  }

  public set publicKeyStream(value: Readable) {
    this.publicKey = value;
  }
}

export function validSalesforceHostname(url: string | null): boolean {
  if (!url) {
    return false;
  }
  const parsedUrl: UrlWithStringQuery = parseUrl(url);

  if (process.env.SFDX_ALLOW_ALL_SALESFORCE_CERTSIG_HOSTING === 'true') {
    return parsedUrl.hostname && /(\.salesforce\.com)$/.test(parsedUrl.hostname);
  } else {
    return parsedUrl.protocol === 'https:' && parsedUrl.hostname && parsedUrl.hostname === 'developer.salesforce.com';
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
      stream.on('error', (err) => {
        return reject(err);
      });
    }
  });
}

export async function verify(codeVerifierInfo: CodeVerifierInfo): Promise<boolean> {
  const publicKey = await retrieveKey(codeVerifierInfo.publicKeyStream);
  const signApi = crypto.createVerify(CRYPTO_LEVEL);

  return new Promise<boolean>((resolve, reject) => {
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

      codeVerifierInfo.signatureStream.on('error', (err) => {
        return reject(err);
      });
    });

    codeVerifierInfo.dataToVerify.on('error', (err) => {
      return reject(err);
    });
  });
}

export const getNpmRegistry = (): URL => {
  return new URL(process.env.SFDX_NPM_REGISTRY || DEFAULT_REGISTRY);
};

/**
 * class for verifying a digital signature pack of an npm
 */
export class InstallationVerification implements Verifier {
  // The name of the published plugin
  private pluginNpmName: NpmName;

  // config derived from the cli environment
  private config: ConfigContext;

  // Reference for the http client;
  private readonly requestImpl: IRequest;

  // Reference for fs
  private fsImpl;

  private readonly readFileAsync;
  private readonly unlinkAsync;

  private logger: Logger;

  public constructor(requestImpl?: IRequest, fsImpl?: unknown) {
    // why? dependency injection is better than sinon
    this.requestImpl = requestImpl ? requestImpl : request;
    this.fsImpl = fsImpl ? fsImpl : fs;
    this.readFileAsync = utilPromisify(this.fsImpl.readFile);
    this.unlinkAsync = utilPromisify(this.fsImpl.unlink);
  }

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
    throw new SfError('the cli engine config cannot be null', 'InvalidParam');
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
    throw new SfError('pluginName must be specified.', 'InvalidParam');
  }

  /**
   * validates the digital signature.
   */
  public async verify(): Promise<NpmMeta> {
    const logger = await this.getLogger();

    const npmMeta = await this.streamTagGz();
    logger.debug(`verify | Found npmMeta? ${!!npmMeta}`);

    logger.debug(`verify | creating a read stream for path - npmMeta.tarballLocalPath: ${npmMeta.tarballLocalPath}`);
    const info = new CodeVerifierInfo();
    info.dataToVerify = this.fsImpl.createReadStream(npmMeta.tarballLocalPath, { encoding: 'binary' });

    logger.debug(`verify | npmMeta.signatureUrl: ${npmMeta.signatureUrl}`);
    logger.debug(`verify | npmMeta.publicKeyUrl: ${npmMeta.publicKeyUrl}`);

    return Promise.all([this.getSigningContent(npmMeta.signatureUrl), this.getSigningContent(npmMeta.publicKeyUrl)])
      .then((result) => {
        info.signatureStream = result[0];
        info.publicKeyStream = result[1];
        return verify(info);
      })
      .then((result) => {
        npmMeta.verified = result;
        return this.unlinkAsync(npmMeta.tarballLocalPath)
          .catch((err) => {
            logger.debug(`error occurred deleting cache tgz at path: ${npmMeta.tarballLocalPath}`);
            logger.debug(err);
          })
          .then(() => npmMeta);
      })
      .catch((e) => {
        if (e.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
          throw new SfError(
            'Encountered a self signed certificated. To enable "export NODE_TLS_REJECT_UNAUTHORIZED=0"',
            'SelfSignedCert'
          );
        }
        throw e;
      });
  }

  public async isAllowListed(): Promise<boolean> {
    const logger = await this.getLogger();
    const allowListedFilePath = path.join(this.getConfigPath(), ALLOW_LIST_FILENAME);
    logger.debug(`isAllowListed | allowlistFilePath: ${allowListedFilePath}`);
    let fileContent: string;
    try {
      fileContent = await this.readFileAsync(allowListedFilePath);
      const allowlistArray = JSON.parse(fileContent);
      logger.debug('isAllowListed | Successfully parsed allowlist.');
      return allowlistArray && allowlistArray.includes(this.pluginNpmName.toString());
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false;
      } else {
        throw err;
      }
    }
  }

  /**
   * Retrieve url content for a host
   *
   * @param url host url.
   */
  public getSigningContent(url: string): Promise<Readable> {
    return new Promise((resolve, reject) => {
      this.requestImpl(url, (err: Error, response: request.RequestResponse, responseData) => {
        if (err) {
          return reject(err);
        } else {
          if (response && response.statusCode === 200) {
            // The verification api expects a readable
            return resolve(
              new Readable({
                read(): void {
                  this.push(responseData);
                  this.push(null);
                },
              })
            );
          } else {
            return reject(
              new SfError(
                `A request to url ${url} failed with error code: [${
                  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                  (response as { statusCode: string }) ? response.statusCode : 'undefined'
                }]`,
                'ErrorGettingContent'
              )
            );
          }
        }
      });
    });
  }

  /**
   * Downloads the tgz file content and stores it in a cache folder
   */
  public async streamTagGz(): Promise<NpmMeta> {
    const logger = await this.getLogger();
    const npmMeta = await this.retrieveNpmMeta();
    const urlObject: URL = new URL(npmMeta.tarballUrl);
    const urlPathsAsArray = urlObject.pathname.split('/');
    npmMeta.tarballFilename = npmMeta.moduleName.replace(/@/g, '');
    logger.debug(`streamTagGz | urlPathsAsArray: ${urlPathsAsArray.join(',')}`);

    const fileNameStr: string = urlPathsAsArray[urlPathsAsArray.length - 1];
    logger.debug(`streamTagGz | fileNameStr: ${fileNameStr}`);

    // Make sure the cache path exists.
    try {
      await mkdir(this.getCachePath(), { recursive: true });
      const npmModule = new NpmModule(npmMeta.moduleName, npmMeta.version, this.config.cliRoot);
      await npmModule.fetchTarball(getNpmRegistry().href, {
        cwd: this.getCachePath(),
      });
      const tarBallFile = fs
        .readdirSync(this.getCachePath(), { withFileTypes: true })
        .find((entry) => entry.isFile() && entry.name.includes(npmMeta.version));
      npmMeta.tarballLocalPath = path.join(this.getCachePath(), tarBallFile.name);
    } catch (err) {
      logger.debug(err);
      throw err;
    }

    return npmMeta;
  }

  // this is generally $HOME/.config/sfdx
  private getConfigPath(): string {
    return this.config.configDir;
  }

  // this is generally $HOME/Library/Caches/sfdx on mac
  private getCachePath(): string {
    return this.config.cacheDir;
  }

  /**
   * Invoke npm to discover a urls for the certificate and digital signature.
   */
  private async retrieveNpmMeta(): Promise<NpmMeta> {
    const logger = await this.getLogger();
    const npmRegistry = getNpmRegistry();

    logger.debug(`retrieveNpmMeta | npmRegistry: ${npmRegistry.href}`);
    logger.debug(`retrieveNpmMeta | this.pluginNpmName.name: ${this.pluginNpmName.name}`);
    logger.debug(`retrieveNpmMeta | this.pluginNpmName.scope: ${this.pluginNpmName.scope}`);
    logger.debug(`retrieveNpmMeta | this.pluginNpmName.tag: ${this.pluginNpmName.tag}`);

    const npmShowModule = this.pluginNpmName.scope
      ? `@${this.pluginNpmName.scope}/${this.pluginNpmName.name}`
      : this.pluginNpmName.name;

    const npmModule = new NpmModule(npmShowModule, this.pluginNpmName.tag, this.config.cliRoot);
    const npmMetadata = npmModule.show(npmRegistry.href);
    logger.debug('retrieveNpmMeta | Found npm meta information.');
    if (!npmMetadata.versions) {
      throw new SfError(
        `The npm metadata for plugin ${this.pluginNpmName.name} is missing the versions attribute.`,
        'InvalidNpmMetadata'
      );
    }

    // Assume the tag is version tag.
    let versionNumber = npmMetadata.versions.find((version) => version === this.pluginNpmName.tag);

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
          versionNumber = npmMetadata.versions.find((version) => version === tagVersionStr);
          logger.debug(`retrieveNpmMeta | versionObject: ${versionNumber}`);
        } else {
          throw new SfError(
            `The dist tag ${this.pluginNpmName.tag} was not found for plugin: ${this.pluginNpmName.name}`,
            'NpmTagNotFound'
          );
        }
      } else {
        throw new SfError('The deployed NPM is missing dist-tags.', 'UnexpectedNpmFormat');
      }
    }

    npmModule.npmMeta.version = versionNumber;

    if (!npmMetadata.sfdx) {
      throw new SfError('This plugin is not signed by Salesforce.com, Inc.', 'NotSigned');
    } else {
      if (!validSalesforceHostname(npmMetadata.sfdx.publicKeyUrl)) {
        throw new SfError(
          `The host is not allowed to provide signing information. [${npmMetadata.sfdx.publicKeyUrl}]`,
          'UnexpectedHost'
        );
      } else {
        logger.debug(`retrieveNpmMeta | versionObject.sfdx.publicKeyUrl: ${npmMetadata.sfdx.publicKeyUrl}`);
        npmModule.npmMeta.publicKeyUrl = npmMetadata.sfdx.publicKeyUrl;
      }

      if (!validSalesforceHostname(npmMetadata.sfdx.signatureUrl)) {
        throw new SfError(
          `The host is not allowed to provide signing information. [${npmMetadata.sfdx.signatureUrl}]`,
          'UnexpectedHost'
        );
      } else {
        logger.debug(`retrieveNpmMeta | versionObject.sfdx.signatureUrl: ${npmMetadata.sfdx.signatureUrl}`);
        npmModule.npmMeta.signatureUrl = npmMetadata.sfdx.signatureUrl;
      }

      npmModule.npmMeta.tarballUrl = npmMetadata.dist.tarball;
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
  private verifierMember: Verifier;
  private logMember: (message: string) => void;
  private promptMember: (message: string) => Promise<string>;

  public get verifier(): Verifier {
    return this.verifierMember;
  }

  public set verifier(value: Verifier) {
    this.verifierMember = value;
  }

  public get log(): (message: string) => void {
    return this.logMember;
  }

  public set log(value: (message: string) => void) {
    this.logMember = value;
  }

  public get prompt(): (message: string) => Promise<string> {
    return this.promptMember;
  }

  public set prompt(value: (message: string) => Promise<string>) {
    this.promptMember = value;
  }
}

export async function doPrompt(vconfig: VerificationConfig): Promise<void> {
  const shouldContinue = await vconfig.prompt(
    'This plugin is not digitally signed and its authenticity cannot be verified. Continue installation y/n?'
  );
  switch (shouldContinue.toLowerCase()) {
    case 'y':
      return;
    default:
      throw new SfError('The user canceled the plugin installation.', 'InstallationCanceledError');
  }
}

export async function doInstallationCodeSigningVerification(
  config: ConfigContext,
  plugin: { plugin: string; tag: string },
  verificationConfig: VerificationConfig
): Promise<void> {
  try {
    const meta = await verificationConfig.verifier.verify();
    if (!meta.verified) {
      throw new SfError(
        "A digital signature is specified for this plugin but it didn't verify against the certificate.",
        'FailedDigitalSignatureVerification'
      );
    }
    verificationConfig.log(`Successfully validated digital signature for ${plugin.plugin}.`);
  } catch (err) {
    if (err.name === 'NotSigned') {
      if (await verificationConfig.verifier.isAllowListed()) {
        verificationConfig.log(`The plugin [${plugin.plugin}] is not digitally signed but it is allow-listed.`);
        return;
      } else {
        return await doPrompt(verificationConfig);
      }
    } else if (err.name === 'PluginNotFound' || err.name === 'PluginAccessDenied') {
      throw new SfError(err.message || 'The user canceled the plugin installation.');
    }
    throw SfError.wrap(err);
  }
}
