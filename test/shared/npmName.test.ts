/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { npmNameToString, parseNpmName } from '../../src/shared/NpmName.js';

describe('npmName', () => {
  describe('parse', () => {
    describe('scope without @', () => {
      it('salesforce/foo', () => {
        const input = 'salesforce/foo';
        const f = parseNpmName(input);
        expect(f.scope).to.equal('salesforce');
        expect(f.name).to.equal('foo');
        expect(f.tag).to.equal('latest');
        expect(npmNameToString(f)).to.equal('@salesforce/foo');
      });
      it('salesforce/foo@latest', () => {
        const input = 'salesforce/foo@latest';
        const f = parseNpmName(input);
        expect(f.scope).to.equal('salesforce');
        expect(f.name).to.equal('foo');
        expect(f.tag).to.equal('latest');
        expect(npmNameToString(f)).to.equal('@salesforce/foo');
      });
      it('salesforce/foo@rc', () => {
        const input = 'salesforce/foo@rc';
        const f = parseNpmName(input);
        expect(f.scope).to.equal('salesforce');
        expect(f.name).to.equal('foo');
        expect(f.tag).to.equal('rc');
        expect(npmNameToString(f)).to.equal('@salesforce/foo');
      });
    });

    describe('scope with @', () => {
      it('@salesforce/foo', () => {
        const input = '@salesforce/foo';
        const f = parseNpmName(input);
        expect(f.scope).to.equal('salesforce');
        expect(f.name).to.equal('foo');
        expect(f.tag).to.equal('latest');
        expect(npmNameToString(f)).to.equal('@salesforce/foo');
      });
      it('@salesforce/foo@latest', () => {
        const input = '@salesforce/foo@latest';
        const f = parseNpmName(input);
        expect(f.scope).to.equal('salesforce');
        expect(f.name).to.equal('foo');
        expect(f.tag).to.equal('latest');
        expect(npmNameToString(f)).to.equal('@salesforce/foo');
      });
      it('@salesforce/foo@rc', () => {
        const input = '@salesforce/foo@rc';
        const f = parseNpmName(input);
        expect(f.scope).to.equal('salesforce');
        expect(f.name).to.equal('foo');
        expect(f.tag).to.equal('rc');
        expect(npmNameToString(f)).to.equal('@salesforce/foo');
      });
    });

    describe('no scope', () => {
      it('foo', () => {
        const input = 'foo';
        const f = parseNpmName(input);
        expect(f.scope).to.be.undefined;
        expect(f.name).to.equal('foo');
        expect(f.tag).to.equal('latest');
        expect(npmNameToString(f)).to.equal('foo');
      });
      it('foo@latest', () => {
        const input = 'foo@latest';
        const f = parseNpmName(input);
        expect(f.scope).to.be.undefined;
        expect(f.name).to.equal('foo');
        expect(f.tag).to.equal('latest');
        expect(npmNameToString(f)).to.equal('foo');
      });
      it('foo@rc', () => {
        const input = 'foo@rc';
        const f = parseNpmName(input);
        expect(f.scope).to.be.undefined;
        expect(f.name).to.equal('foo');
        expect(f.tag).to.equal('rc');
        expect(npmNameToString(f)).to.equal('foo');
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
});
