/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
