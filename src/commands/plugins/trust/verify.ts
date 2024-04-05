/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfCommand, Flags, loglevel } from '@salesforce/sf-plugins-core';
import { Messages, SfError, Logger } from '@salesforce/core';
import {
  ConfigContext,
  InstallationVerification,
  VerificationConfig,
} from '../../../shared/installationVerification.js';
import { type ParsedNpm, parseNpmName } from '../../../shared/npmName.js';
import { setErrorName } from '../../../shared/errors.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-trust', 'verify');

export interface VerifyResponse {
  message: string;
  verified: boolean;
}

export class Verify extends SfCommand<VerifyResponse> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly hidden: true;
  public static readonly flags = {
    npm: Flags.string({
      char: 'n',
      required: true,
      summary: messages.getMessage('flags.npm.summary'),
    }),
    registry: Flags.string({
      char: 'r',
      summary: messages.getMessage('flags.registry.summary'),
    }),
    loglevel,
  };

  private static getVerifier(npmName: ParsedNpm, config: ConfigContext): InstallationVerification {
    return new InstallationVerification().setPluginNpmName(npmName).setConfig(config);
  }

  public async run(): Promise<VerifyResponse> {
    const { flags } = await this.parse(Verify);
    const logger = await Logger.child('verify');
    this.log('Checking for digital signature.');

    const npmName = parseNpmName(flags.npm);

    logger.debug(`running verify command for npm: ${npmName.name}`);

    const vConfig = new VerificationConfig();

    const configContext: ConfigContext = {
      cacheDir: this.config.cacheDir,
      configDir: this.config.configDir,
      dataDir: this.config.dataDir,
      cliRoot: this.config.root,
    };

    logger.debug(`cacheDir: ${configContext.cacheDir}`);
    logger.debug(`configDir: ${configContext.configDir}`);
    logger.debug(`dataDir: ${configContext.dataDir}`);

    vConfig.verifier = Verify.getVerifier(npmName, configContext);

    if (await vConfig.verifier.isAllowListed()) {
      const message = messages.getMessage('SkipSignatureCheck', [npmName.name]);
      this.log(message);
      return {
        message,
        verified: false,
      };
    }
    if (flags.registry) {
      process.env.SF_NPM_REGISTRY = flags.registry;
      process.env.SFDX_NPM_REGISTRY = flags.registry;
    }

    try {
      const meta = await vConfig.verifier.verify();
      logger.debug(`meta.verified: ${meta.verified}`);

      if (!meta.verified) {
        const e = messages.createError('FailedDigitalSignatureVerification');
        throw setErrorName(e, 'FailedDigitalSignatureVerification');
      }
      const message = messages.getMessage('SignatureCheckSuccess', [npmName.name]);
      this.logSuccess(message);

      return { message, verified: true };
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      logger.debug(`err reported: ${JSON.stringify(error, null, 4)}`);

      if (error.name === 'NotSigned') {
        const message = messages.getMessage('NotSigned');
        this.log(message);
        return {
          verified: false,
          message,
        };
      }
      throw SfError.wrap(error);
    }
  }
}
