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

// eslint-disable-next-line @typescript-eslint/require-await
const registryCheck = async (options: { doctor: SfDoctor }): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  [
    // npm and yarn registries
    'https://registry.npmjs.org',
    'https://registry.yarnpkg.com',
  ].map(async (url) => {
    try {
      // find npm install
      const module = new NpmModule('');

      const results = module.ping(url);

      // timeout after 5000ms, error
      if (!results || results.time > 5000) {
        // to trigger the catch/fail below
        throw Error;
      }
      await Lifecycle.getInstance().emit('Doctor:diagnostic', { testName: `can access: ${url}`, status: 'pass' });
    } catch (e) {
      await Lifecycle.getInstance().emit('Doctor:diagnostic', { testName: `can't access: ${url}`, status: 'fail' });
      options.doctor.addSuggestion(
        `Cannot reach ${url} - potential network configuration error, check proxies, firewalls, environment variables`
      );
    }
  });
};
