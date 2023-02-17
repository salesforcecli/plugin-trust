/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { Hook } from '@oclif/core';
import { SfError } from '@salesforce/core';
import { TelemetryGlobal } from '@salesforce/plugin-telemetry/lib/telemetryGlobal';
import { AppInsights } from '@salesforce/telemetry/lib/appInsights';

declare const global: TelemetryGlobal;

const hook: Hook<'jit_plugin_not_installed'> = async function (opts) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    global.cliTelemetry?.record({
      eventName: 'JIT_INSTALL_STARTED',
      type: 'EVENT',
      version: opts.pluginVersion,
      plugin: opts.command.pluginName,
      command: opts.command.id,
    });

    await opts.config.runCommand('plugins:install', [`${opts.command.pluginName}@${opts.pluginVersion}`]);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    global.cliTelemetry?.record({
      eventName: 'JIT_INSTALL_SUCCESS',
      type: 'EVENT',
      version: opts.pluginVersion,
      plugin: opts.command.pluginName,
      command: opts.command.id,
    });
  } catch (error) {
    const err = error as Error;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    global.cliTelemetry?.record({
      eventName: 'JIT_INSTALL_FAILED',
      type: 'EVENT',
      message: err.message,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      stackTrace: err?.stack?.replace(new RegExp(os.homedir(), 'g'), AppInsights.GDPR_HIDDEN),
      version: opts.pluginVersion,
      plugin: opts.command.pluginName,
      command: opts.command.id,
    });

    throw new SfError(`Could not install ${opts.command.pluginName}`, 'JitPluginInstallError');
  }
};

export default hook;
