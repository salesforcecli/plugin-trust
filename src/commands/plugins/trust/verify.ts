/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { get } from '@salesforce/ts-types';
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { ConfigContext, InstallationVerification, VerificationConfig } from '../../../lib/installationVerification';
import { NpmName } from '../../../lib/NpmName';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-trust', 'verify');

export interface VerifyResponse {
  message: string;
  verified: boolean;
}

export class Verify extends SfdxCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly hidden: true;
  protected static readonly flagsConfig: FlagsConfig = {
    npm: flags.string({
      char: 'n',
      required: true,
      description: messages.getMessage('flags.npm'),
    }),
    registry: flags.string({
      char: 'r',
      required: false,
      description: messages.getMessage('flags.registry'),
    }),
  };

  public async run(): Promise<VerifyResponse> {
    this.ux.log('Checking for digital signature.');

    const npmName: NpmName = NpmName.parse(this.flags.npm);

    this.logger.debug(`running verify command for npm: ${npmName.name}`);

    const vConfig = new VerificationConfig();

    const configContext: ConfigContext = {
      cacheDir: get(this.config, 'configDir') as string,
      configDir: get(this.config, 'cacheDir') as string,
      dataDir: get(this.config, 'dataDir') as string,
    };

    this.logger.debug(`cacheDir: ${configContext.cacheDir}`);
    this.logger.debug(`configDir: ${configContext.configDir}`);
    this.logger.debug(`dataDir: ${configContext.dataDir}`);

    vConfig.verifier = this.getVerifier(npmName, configContext);

    vConfig.log = this.ux.log.bind(this.ux) as (msg: string) => void;

    if (this.flags.registry) {
      process.env.SFDX_NPM_REGISTRY = this.flags.registry as string;
    }

    try {
      const meta = await vConfig.verifier.verify();
      this.logger.debug(`meta.verified: ${meta.verified}`);

      if (!meta.verified) {
        throw new SfdxError(
          "A digital signature is specified for this plugin but it didn't verify against the certificate.",
          'FailedDigitalSignatureVerification'
        );
      }
      const message = `Successfully validated digital signature for ${npmName.name}.`;

      if (!this.flags.json) {
        vConfig.log(message);
      } else {
        return { message, verified: true };
      }
    } catch (error) {
      const err = error as SfdxError;
      this.logger.debug(`err reported: ${JSON.stringify(err, null, 4)}`);
      const response: VerifyResponse = {
        verified: false,
        message: err.message,
      };

      if (err.name === 'NotSigned') {
        let message: string = err.message;
        if (await vConfig.verifier.isAllowListed()) {
          message = `The plugin [${npmName.name}] is not digitally signed but it is allow-listed.`;
          vConfig.log(message);
          response.message = message;
        } else {
          message = 'The plugin is not digitally signed.';
          vConfig.log(message);
          response.message = message;
        }
        return response;
      }
      throw SfdxError.wrap(err);
    }
  }

  private getVerifier(npmName: NpmName, config: ConfigContext): InstallationVerification {
    return new InstallationVerification().setPluginNpmName(npmName).setConfig(config);
  }
}
