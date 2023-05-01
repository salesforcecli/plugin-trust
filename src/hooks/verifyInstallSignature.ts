/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Hook } from '@oclif/core';
import { Logger, SfError } from '@salesforce/core';
import { ux } from '@oclif/core';
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
    return vConfig;
  }
}

export const hook: Hook.PluginsPreinstall = async function (options) {
  if (options.plugin && options.plugin.type === 'npm') {
    const logger = await Logger.child('verifyInstallSignature');
    const plugin = options.plugin;

    // skip if the plugin version being installed is listed in the CLI's JIT config
    if (
      plugin.tag &&
      plugin.name in options.config.pjson.oclif.jitPlugins &&
      options.config.pjson.oclif.jitPlugins?.[plugin.name] === plugin.tag
    ) {
      logger.debug(`Skipping verification for ${options.plugin.name} because it is listed in the CLI's JIT config.`);
      return;
    }
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
      ux.log('Finished digital signature check.');
    } catch (error) {
      const err = error as SfError;
      logger.debug(err.message);
      this.error(err);
    }
  } else {
    await doPrompt();
  }
};

export default hook;
