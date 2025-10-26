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
      plugin: opts.pluginName,
      command: opts.command.id,
    });

    const jitInstallArgv = [`${opts.pluginName}@${opts.pluginVersion}`];
    if (opts.argv.includes('--json')) {
      // pass along --json arg to plugins:install
      jitInstallArgv.push('--json');
    }
    await opts.config.runCommand('plugins:install', jitInstallArgv);

    global.cliTelemetry?.record({
      eventName: 'JIT_INSTALL_SUCCESS',
      type: 'EVENT',
      version: opts.pluginVersion,
      plugin: opts.pluginName,
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
      plugin: opts.pluginName,
      command: opts.command.id,
    });

    throw new SfError(
      `Could not install ${opts.pluginName ?? '<opts.command.pluginName not defined>'}`,
      'JitPluginInstallError'
    );
  }
};

export default hook;
