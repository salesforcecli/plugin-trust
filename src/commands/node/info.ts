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

import { SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { NpmCommand } from '../../shared/npmCommand.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-trust', 'node.info');

export type NodeInfoResult = {
  nodePath: string;
  npxPath: string;
};

export default class NodeInfo extends SfCommand<NodeInfoResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly hidden = true;

  // eslint-disable-next-line @typescript-eslint/require-await
  public async run(): Promise<NodeInfoResult> {
    return {
      nodePath: NpmCommand.findNode(this.config.root),
      npxPath: NpmCommand.npxCli(),
    };
  }
}
