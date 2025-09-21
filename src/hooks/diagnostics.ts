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
