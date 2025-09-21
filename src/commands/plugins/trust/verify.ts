/*
 * Copyright 2025, Salesforce, Inc.
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

import { SfCommand, Flags, loglevel } from '@salesforce/sf-plugins-core';
import { Messages, SfError, Logger } from '@salesforce/core';
import {
  ConfigContext,
  InstallationVerification,
  VerificationConfig,
} from '../../../shared/installationVerification.js';
import { type NpmName, parseNpmName } from '../../../shared/npmName.js';
import { setErrorName } from '../../../shared/errors.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-trust', 'verify');

export type VerifyResponse = {
  message: string;
  verified: boolean;
};

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

  private static getVerifier(npmName: NpmName, config: ConfigContext): InstallationVerification {
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

    (['cacheDir', 'configDir', 'dataDir'] as const)
      .map((dir) => `${dir}: ${configContext[dir] ?? '<not present on configContext>'}`)
      .map((s) => logger.debug(s));

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
      logger.debug(`meta.verified: ${meta.verified ?? '<not present>'}`);

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
