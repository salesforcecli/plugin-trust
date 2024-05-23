/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { SfDoctor } from '@salesforce/plugin-info';
import { Lifecycle } from '@salesforce/core';
import { NpmModule } from '../shared/npmCommand.js';
type HookFunction = (options: { doctor: SfDoctor }) => Promise<[void]>;
export const hook: HookFunction = (options) => Promise.all([registryCheck(options)]);

const registryCheck = async (options: { doctor: SfDoctor }): Promise<void> => {
  const pluginName = '@salesforce/plugin-trust';
  // find npm install
  const npm = new NpmModule('');
  const env = process.env.npm_config_registry ?? process.env.NPM_CONFIG_REGISTRY;
  if (env) {
    options.doctor.addSuggestion(`using npm registry ${env} from environment variable`);
  }

  const config = npm.run('config get registry').stdout.trim();
  if (config) {
    options.doctor.addSuggestion(`using npm registry ${config} from npm config`);
  }

  await Promise.all(
    [
      ...new Set([
        // npm and yarn registries
        'https://registry.npmjs.org',
        'https://registry.yarnpkg.com',
        env ?? config,
      ]),
    ]
      // incase customRegistry is undefined, prevent printing an extra line
      .filter((u) => u)
      .map(async (url) => {
        try {
          const results = npm.ping(url);

          // timeout after 5000ms, error
          if (!results || results.time > 5000) {
            // to trigger the catch/fail below
            throw Error;
          }
          await Lifecycle.getInstance().emit('Doctor:diagnostic', {
            testName: `[${pluginName}] can ping: ${url}`,
            status: 'pass',
          });
        } catch (e) {
          await Lifecycle.getInstance().emit('Doctor:diagnostic', {
            testName: `[${pluginName}] can't ping: ${url}`,
            status: 'fail',
          });
          options.doctor.addSuggestion(
            `Cannot ping ${url} - potential network configuration error, check proxies, firewalls, environment variables. Verify this by running 'npm ping ${url}'`
          );
        }
      })
  );
};
