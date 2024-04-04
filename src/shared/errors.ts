/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfError } from '@salesforce/core';

/**
 * convenience method for doing something SfError doesn't allow
 * (explicitly setting the error name)
 */
export const setErrorName = (err: SfError, name: string): SfError => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore override readonly .name field
  // eslint-disable-next-line no-param-reassign
  err.name = name;
  return err;
};
