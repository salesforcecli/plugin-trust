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

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

import { getExistingAllowList, type AllowListResult } from '../../../../shared/allowlist.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-trust', 'allowlist.add');

export class AllowListAdd extends SfCommand<AllowListResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    name: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      required: true,
      multiple: true,
    }),
  };

  public async run(): Promise<AllowListResult> {
    const { flags } = await this.parse(AllowListAdd);
    const { existingAllowList, persistAllowList } = await getExistingAllowList(this.config.configDir);
    const results: AllowListResult = [];

    for (const name of flags.name) {
      const shouldAddPlugin = !existingAllowList.includes(name);
      results.push({ Plugin: name, Status: shouldAddPlugin ? 'added' : 'skipped' });
    }

    if (results.find((result) => result.Status === 'added')) {
      await persistAllowList(existingAllowList);
    }

    this.table({
      data: results,
    });

    return results;
  }
}
