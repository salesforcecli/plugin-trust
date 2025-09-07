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

import { expect } from 'chai';
import { npmNameToString, parseNpmName } from '../../src/shared/npmName.js';

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
