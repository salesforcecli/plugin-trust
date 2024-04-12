/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { homedir } from 'node:os';
import { Hook } from '@oclif/core';
import { SfError } from '@salesforce/core';
import type { TelemetryGlobal } from '@salesforce/plugin-telemetry';

declare const global: TelemetryGlobal;

const hook: Hook<'jit_plugin_not_installed'> = async function (opts) {
  try {
    global.cliTelemetry?.record({
      eventName: 'JIT_INSTALL_STARTED',
      type: 'EVENT',
      version: opts.pluginVersion,
      plugin: opts.command.pluginName,
      command: opts.command.id,
    });

    const jitInstallArgv = [`${opts.command.pluginName}@${opts.pluginVersion}`];
    if (opts.argv.includes('--json')) {
      // pass along --json arg to plugins:install
      jitInstallArgv.push('--json');
    }
    await opts.config.runCommand('plugins:install', jitInstallArgv);

    global.cliTelemetry?.record({
      eventName: 'JIT_INSTALL_SUCCESS',
      type: 'EVENT',
      version: opts.pluginVersion,
      plugin: opts.command.pluginName,
      command: opts.command.id,
    });
  } catch (error) {
    global.cliTelemetry?.record({
      eventName: 'JIT_INSTALL_FAILED',
      type: 'EVENT',
      message: error instanceof Error ? error.message : 'malformed error',
      stackTrace:
        error instanceof Error ? error?.stack?.replace(new RegExp(homedir(), 'g'), '<GDPR_HIDDEN>') : undefined,
      version: opts.pluginVersion,
      plugin: opts.command.pluginName,
      command: opts.command.id,
    });

    throw new SfError(`Could not install ${opts.command.pluginName}`, 'JitPluginInstallError');
  }
};

export default hook;
