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

import { Hook } from '@oclif/core';
import { Logger, Messages } from '@salesforce/core';
import { Ux } from '@salesforce/sf-plugins-core/Ux';
import {
  ConfigContext,
  doInstallationCodeSigningVerification,
  doPrompt,
  InstallationVerification,
  VerificationConfig,
  isAllowListed,
} from '../shared/installationVerification.js';

import { type NpmName, parseNpmName } from '../shared/npmName.js';

export const hook: Hook.PluginsPreinstall = async function (options) {
  const ux = new Ux();
  if (options.plugin && options.plugin.type === 'npm') {
    const logger = await Logger.child('verifyInstallSignature');
    const plugin = options.plugin;

    // skip if the plugin version being installed is listed in the CLI's JIT config
    if (
      plugin.tag &&
      options.config.pjson.oclif.jitPlugins &&
      plugin.name in options.config.pjson.oclif.jitPlugins &&
      options.config.pjson.oclif.jitPlugins?.[plugin.name] === plugin.tag
    ) {
      logger.debug(`Skipping verification for ${options.plugin.name} because it is listed in the CLI's JIT config.`);
      return;
    }
    logger.debug('parsing npm name');
    const npmName = parseNpmName(plugin.name);
    logger.debug(`npmName components: ${JSON.stringify(npmName, null, 4)}`);

    npmName.tag = plugin.tag || 'latest';

    if (/^v[0-9].*/.test(npmName.tag)) {
      npmName.tag = npmName.tag.slice(1);
    }

    const configContext = {
      cacheDir: options.config.cacheDir,
      configDir: options.config.configDir,
      dataDir: options.config.dataDir,
      cliRoot: options.config.root,
    };

    const vConfig = buildVerificationConfig(npmName, configContext);
    logger.debug('finished building the VerificationConfigBuilder');

    try {
      logger.debug('doing verification');
      await doInstallationCodeSigningVerification(ux)(configContext, { plugin: plugin.name, tag: plugin.tag }, vConfig);
      ux.log('Finished digital signature check.');
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      logger.debug(error.message);
      this.error(error);
    }
  } else if (options.plugin.url) {
    const isAllowed = await isAllowListed({
      logger: await Logger.child('verifyInstallSignature'),
      name: options.plugin.url,
      configPath: options.config.configDir,
    });
    if (isAllowed) {
      const messages = Messages.loadMessages('@salesforce/plugin-trust', 'verify');
      ux.log(messages.getMessage('SkipSignatureCheck', [options.plugin.url]));
    } else {
      await doPrompt(ux)(options.plugin.url);
    }
  } else {
    await doPrompt(ux)();
  }
};

export default hook;

/**
 * Build a VerificationConfig. Useful for testing.
 */
const buildVerificationConfig = (npmName: NpmName, configContext: ConfigContext): VerificationConfig => {
  const vConfig = new VerificationConfig();
  vConfig.verifier = new InstallationVerification().setPluginNpmName(npmName).setConfig(configContext);
  return vConfig;
};
