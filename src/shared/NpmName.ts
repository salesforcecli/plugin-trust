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

  let returnNpmName: NpmName | undefined;

  const components: string[] = npmName.split('@');
  // salesforce/jj
  if (components.length === 1) {
    returnNpmName = setNameAndScope(components[0]);
  } else if (components[0].includes('/')) {
    returnNpmName = setNameAndScope(components[0]);
  } else if (components[1].includes('/')) {
    returnNpmName = setNameAndScope(components[1]);
  } else {
    // Allow something like salesforcedx/pre-release
    returnNpmName = { ...setNameAndScope(components[0]), tag: components[1] };
  }

  if (components.length > 2) {
    returnNpmName.tag = components[2];
  }
  return returnNpmName;
};

/** Produces a formatted string version of the object */
export const npmNameToString = (npmName: NpmName, includeTag = false): string =>
  `${npmName.scope ? `@${npmName.scope}/` : ''}${npmName.name}${includeTag ? npmName.tag : ''}`;

/**
 * helper to parse the name and scope.
 *
 * @param {string} name - The string to parse.
 * @param {NpmName} returnNpmName - The object to update.
 */
const setNameAndScope = (name: string): NpmName => {
  // There are at least 2 components. So there is likely a scope.
  const subComponents: string[] = name.split('/');
  if (subComponents.length === 2 && subComponents[0].trim().length > 0 && subComponents[1].trim().length > 0) {
    return {
      tag: DEFAULT_TAG,
      scope: validateComponentString(subComponents[0]),
      name: validateComponentString(subComponents[1]) ?? DEFAULT_TAG,
    };
  } else if (subComponents.length === 1) {
    return {
      tag: DEFAULT_TAG,
      name: validateComponentString(subComponents[0]),
    };
  }
  throw setErrorName(new SfError('The npm name is invalid.', 'InvalidNpmName'), 'InvalidNpmName');
};

/**
 * Validate a component part that it's not empty and return it trimmed.
 *
 * @param {string} name The component to validate.
 * @return {string} A whitespace trimmed version of the component.
 */
const validateComponentString = (name: string): string => {
  const trimmedName = name.trim();
  if (trimmedName && trimmedName.length > 0) {
    return trimmedName;
  }
  throw setErrorName(
    new SfError('The npm name is missing or invalid.', 'MissingOrInvalidNpmName'),
    'MissingOrInvalidNpmName'
  );
};
