/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { parseNpmName } from '../../src/shared/NpmName.js';

describe('parse', () => {
  describe('scope without @', () => {
    it('salesforce/foo', () => {
      const f = parseNpmName('salesforce/foo');
      expect(f.scope).to.equal('salesforce');
      expect(f.name).to.equal('foo');
      expect(f.tag).to.equal('latest');
    });
    it('salesforce/foo@latest', () => {
      const f = parseNpmName('salesforce/foo@latest');
      expect(f.scope).to.equal('salesforce');
      expect(f.name).to.equal('foo');
      expect(f.tag).to.equal('latest');
    });
    // it doesn't work on main
    it('salesforce/foo@rc', () => {
      const f = parseNpmName('salesforce/foo@rc');
      expect(f.scope).to.equal('salesforce');
      expect(f.name).to.equal('foo');
      expect(f.tag).to.equal('rc');
    });
  });

  describe('scope with @', () => {
    it('@salesforce/foo', () => {
      const f = parseNpmName('@salesforce/foo');
      expect(f.scope).to.equal('salesforce');
      expect(f.name).to.equal('foo');
      expect(f.tag).to.equal('latest');
    });
    it('@salesforce/foo@latest', () => {
      const f = parseNpmName('@salesforce/foo@latest');
      expect(f.scope).to.equal('salesforce');
      expect(f.name).to.equal('foo');
      expect(f.tag).to.equal('latest');
    });
    it('@salesforce/foo@rc', () => {
      const f = parseNpmName('@salesforce/foo@rc');
      expect(f.scope).to.equal('salesforce');
      expect(f.name).to.equal('foo');
      expect(f.tag).to.equal('rc');
    });
  });

  describe('no scope', () => {
    it('foo', () => {
      const f = parseNpmName('foo');
      expect(f.scope).to.be.undefined;
      expect(f.name).to.equal('foo');
      expect(f.tag).to.equal('latest');
    });
    it('foo@latest', () => {
      const f = parseNpmName('foo@latest');
      expect(f.scope).to.be.undefined;
      expect(f.name).to.equal('foo');
      expect(f.tag).to.equal('latest');
    });
    it('foo@rc', () => {
      const f = parseNpmName('foo@rc');
      expect(f.scope).to.be.undefined;
      expect(f.name).to.equal('foo');
      expect(f.tag).to.equal('rc');
    });
  });

  describe('invalid', () => {
    it('empty', () => {
      expect(() => parseNpmName('')).to.throw();
    });
    it('single leading @', () => {
      expect(() => parseNpmName('@')).to.throw();
    });
    it('extra slashes', () => {
      expect(() => parseNpmName('this/is/real/bad')).to.throw();
    });
    it('space', () => {
      expect(() => parseNpmName('this fails')).to.throw();
    });
    it('extra @', () => {
      expect(() => parseNpmName('@@')).to.throw();
    });
    it('extra @s', () => {
      expect(() => parseNpmName('@foo/bar@z@f')).to.throw();
    });
  });
});
