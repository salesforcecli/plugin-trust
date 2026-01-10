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
import { SfError } from '@salesforce/core';
import { setErrorName } from './errors.js';

const DEFAULT_TAG = 'latest';

export type NpmName = {
  tag: string;
  scope?: string;
  name: string;
};

/**
 * Parse an NPM package name into {scope, name, tag}. The tag is 'latest' by default and can be any semver string.
 *
 * @param {string} npmName - The npm name to parse.
 * @return {NpmName} - An object with the parsed components.
 */
export const parseNpmName = (npmName: string): NpmName => {
  const nameWithoutAt = validateNpmNameAndRemoveLeadingAt(npmName);
  const hasScope = nameWithoutAt.includes('/');
  const hasTag = nameWithoutAt.includes('@');

  return {
    scope: hasScope ? nameWithoutAt.split('/')[0] : undefined,
    tag: hasTag ? nameWithoutAt.split('@')[1] : DEFAULT_TAG,
    name: hasScope ? nameWithoutAt.split('/')[1].split('@')[0] : nameWithoutAt.split('@')[0],
  };
};

/** Produces a formatted string version of the object */
export const npmNameToString = (npmName: NpmName): string =>
  `${npmName.scope ? `@${npmName.scope}/` : ''}${npmName.name}`;

const validateNpmNameAndRemoveLeadingAt = (input: string): string => {
  const nameWithoutAt = input.startsWith('@') ? input.slice(1) : input;
  if (
    !nameWithoutAt.length || // empty
    nameWithoutAt.includes(' ') ||
    nameWithoutAt.startsWith('@') || // starts with @ after we already removed it
    nameWithoutAt.endsWith('@') ||
    nameWithoutAt.startsWith('/') || // starts with /
    nameWithoutAt.endsWith('/') || // ends with /
    (nameWithoutAt.match(/@/g) ?? []).length > 1 || // should only have 1 @ left (first was removed in parseNpmName)
    (nameWithoutAt.match(/\//g) ?? []).length > 1 // can only have 1 slash
  ) {
    throw setErrorName(
      new SfError('The npm name is missing or invalid.', 'MissingOrInvalidNpmName'),
      'MissingOrInvalidNpmName'
    );
  }
  return nameWithoutAt;
};
