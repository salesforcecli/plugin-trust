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

import fs from 'node:fs';
import path from 'node:path';
import { SfError } from '@salesforce/core';

import { ALLOW_LIST_FILENAME } from './constants.js';

export type AllowListResult = Array<{
  Plugin: string;
  Status?: 'added' | 'removed' | 'skipped';
  Reason?: string;
}>;

export class AllowList {
  readonly #allowListPath: string;
  readonly #baseDir: string;

  public constructor(dir: string) {
    this.#allowListPath = path.join(dir, ALLOW_LIST_FILENAME);
    this.#baseDir = dir;
  }

  public async get(): Promise<string[]> {
    let existingAllowList: string[] = [];
    try {
      const content = (await fs.promises.readFile(this.#allowListPath)).toString();
      const parsed: unknown = JSON.parse(content);
      if (!Array.isArray(parsed) || parsed.find((e) => typeof e !== 'string')) {
        throw new SfError(`${ALLOW_LIST_FILENAME} must contain a JSON array of strings.`);
      }
      existingAllowList = parsed as string[];
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new SfError(err.message);
      } else if (err instanceof Error) {
        if (!('code' in err) || err.code !== 'ENOENT') {
          throw err;
        } else {
          await this.#createAllowlistPath();
        }
      } else {
        throw err;
      }
    }
    return existingAllowList;
  }

  public async save(allowList: string[]): Promise<void> {
    await fs.promises.writeFile(this.#allowListPath, JSON.stringify(allowList, null, 2));
  }

  async #createAllowlistPath(): Promise<void> {
    try {
      await fs.promises.stat(this.#baseDir);
    } catch (_) {
      // we will try exactly once to blindly create the full directory. any error here will get bubbled back up to the caller
      await fs.promises.mkdir(this.#baseDir, { recursive: true });
    }
  }
}
