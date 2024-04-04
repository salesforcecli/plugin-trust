/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
  if (!npmName || npmName.length < 1) {
    throw setErrorName(
      new SfError('The npm name is missing or invalid.', 'MissingOrInvalidNpmName'),
      'MissingOrInvalidNpmName'
    );
  }

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
export const npmNameToString = (npmName: NpmName, includeTag = false): string =>
  `${npmName.scope ? `@${npmName.scope}/` : ''}${npmName.name}${includeTag ? npmName.tag : ''}`;

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
