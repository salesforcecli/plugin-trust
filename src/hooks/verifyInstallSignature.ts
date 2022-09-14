/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Hook } from '@oclif/core';
import { Logger, SfError } from '@salesforce/core';
import { CliUx } from '@oclif/core';
import {
  ConfigContext,
  doInstallationCodeSigningVerification,
  doPrompt,
  InstallationVerification,
  VerificationConfig,
} from '../shared/installationVerification';

import { NpmName } from '../shared/NpmName';

/**
 * Build a VerificationConfig. Useful for testing.
 */
export class VerificationConfigBuilder {
  public static build(npmName: NpmName, configContext: ConfigContext): VerificationConfig {
    const vConfig = new VerificationConfig();
    vConfig.verifier = new InstallationVerification().setPluginNpmName(npmName).setConfig(configContext);

    vConfig.log = (msg: string): void => {
      CliUx.ux.log(msg);
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    vConfig.prompt = CliUx.ux.prompt.bind(CliUx);
    return vConfig;
  }
  public static buildForRepo(): VerificationConfig {
    const vConfig = new VerificationConfig();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    vConfig.prompt = CliUx.ux.prompt.bind(CliUx);
    return vConfig;
  }
}

export const hook: Hook.PluginsPreinstall = async function (options) {
  if (options.plugin && options.plugin.type === 'npm') {
    const logger = await Logger.child('verifyInstallSignature');
    const plugin = options.plugin;

    logger.debug('parsing npm name');
    const npmName = NpmName.parse(plugin.name);
    logger.debug(`npmName components: ${JSON.stringify(npmName, null, 4)}`);

    npmName.tag = plugin.tag || 'latest';

    if (/^v[0-9].*/.test(npmName.tag)) {
      npmName.tag = npmName.tag.slice(1);
    }

    const configContext: ConfigContext = {
      cacheDir: options.config.cacheDir,
      configDir: options.config.configDir,
      dataDir: options.config.dataDir,
      cliRoot: options.config.root,
    };

    const vConfig = VerificationConfigBuilder.build(npmName, configContext);
    logger.debug('finished building the VerificationConfigBuilder');

    try {
      logger.debug('doing verification');
      await doInstallationCodeSigningVerification(configContext, { plugin: plugin.name, tag: plugin.tag }, vConfig);
      CliUx.ux.log('Finished digital signature check.');
    } catch (error) {
      const err = error as SfError;
      logger.debug(err.message);
      this.error(err);
    }
  } else {
    await doPrompt(VerificationConfigBuilder.buildForRepo());
  }
};

export default hook;
