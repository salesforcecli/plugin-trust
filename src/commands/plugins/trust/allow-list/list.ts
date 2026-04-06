/*
 * Copyright 2026, Salesforce, Inc.
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

import { getExistingAllowList, type AllowListResult } from '../../../../shared/allow-list.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-trust', 'allow-list.list');

export class AllowListList extends SfCommand<AllowListResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public async run(): Promise<AllowListResult> {
    const { existingAllowList } = await getExistingAllowList(this.config.configDir);

    if (existingAllowList.length === 0) {
      this.log(messages.getMessage('NoPluginsAllowListed'));
      return [];
    }

    const results: AllowListResult = existingAllowList.map((plugin) => ({ Plugin: plugin }));

    this.table({
      data: results,
    });

    return results;
  }
}
