/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Hook } from '@oclif/config';
import { Logger, SfdxError } from '@salesforce/core';
import { cli } from 'cli-ux';
import {
  ConfigContext,
  doInstallationCodeSigningVerification,
  doPrompt,
  InstallationVerification,
  VerificationConfig,
} from '../lib/installationVerification';

import { NpmName } from '../lib/NpmName';

/**
 * Build a VerificationConfig. Useful for testing.
 */
export class VerificationConfigBuilder {
  public static build(npmName: NpmName, configContext: ConfigContext): VerificationConfig {
    const vConfig = new VerificationConfig();
    vConfig.verifier = new InstallationVerification().setPluginNpmName(npmName).setConfig(configContext);

    vConfig.log = cli.log.bind(cli) as (msg: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    vConfig.prompt = cli.prompt.bind(cli);
    return vConfig;
  }
  public static buildForRepo(): VerificationConfig {
    const vConfig = new VerificationConfig();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    vConfig.prompt = cli.prompt.bind(cli);
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
      rootDir: options.config.root,
    };

    const vConfig = VerificationConfigBuilder.build(npmName, configContext);
    logger.debug('finished building the VerificationConfigBuilder');

    try {
      logger.debug('doing verification');
      await doInstallationCodeSigningVerification(configContext, { plugin: plugin.name, tag: plugin.tag }, vConfig);
      cli.log('Finished digital signature check.');
    } catch (error) {
      const err = error as SfdxError;
      logger.debug(err.message);
      this.error(err);
    }
  } else {
    await doPrompt(VerificationConfigBuilder.buildForRepo());
  }
};

export default hook;
