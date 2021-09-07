/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

import * as path from 'path';
import * as shelljs from 'shelljs';
import npmRunPath from 'npm-run-path';
import { SfdxError, fs } from '@salesforce/core';

export type NpmMeta = {
  tarballUrl?: string;
  signatureUrl?: string;
  publicKeyUrl?: string;
  tarballLocalPath?: string;
  verified?: boolean;
  moduleName?: string;
  version?: string;
  tarballFilename?: string;
};

export type NpmShowResults = {
  versions: string[];
  'dist-tags': {
    [name: string]: string;
  };
  sfdx?: {
    publicKeyUrl: string;
    signatureUrl: string;
  };
  dist?: {
    [name: string]: string;
  };
};

type NpmCommandOptions = shelljs.ExecOptions & {
  json?: boolean;
  registry?: string;
};

type NpmCommandResult = NpmShowResults & {
  [name: string]: string;
};

type NpmPackage = {
  bin: {
    [name: string]: string;
  };
};

export class NpmCommand {
  private static npmPkgPath = require.resolve('npm/package.json');

  public static runNpmCmd(cmd: string, options = {} as NpmCommandOptions): NpmCommandResult {
    const npmCli = NpmCommand.npmCli();
    const exec = `${npmCli} ${cmd} --registry=${options.registry} --json`;
    const npmShowResult = shelljs.exec(exec, {
      ...options,
      silent: true,
      fatal: true,
      async: false,
      env: npmRunPath.env({ env: process.env }),
    });
    if (npmShowResult.code !== 0) {
      throw new SfdxError(npmShowResult.stderr, 'ShellExecError');
    }
    try {
      return JSON.parse(npmShowResult.stdout) as NpmCommandResult;
    } catch (error) {
      throw new SfdxError(error, 'ShellParseError');
    }
  }

  private static npmPackagePath(): string {
    return this.npmPkgPath;
  }

  private static npmCli(): string {
    const pkgPath = NpmCommand.npmPackagePath();
    const pkgJson = fs.readJsonSync(pkgPath) as NpmPackage;
    const prjPath = pkgPath.substring(0, pkgPath.lastIndexOf(path.sep));
    return path.join(prjPath, pkgJson.bin['npm']);
  }
}

export class NpmModule {
  public npmMeta: NpmMeta;
  public constructor(private module: string, private version: string = 'latest') {
    this.npmMeta = {
      moduleName: module,
    };
  }

  public show(registry: string): NpmShowResults {
    return NpmCommand.runNpmCmd(`show ${this.module}@${this.version}`, { registry });
  }

  public pack(registry: string, options?: shelljs.ExecOptions): void {
    NpmCommand.runNpmCmd(`pack ${this.module}@${this.version}`, { ...options, registry });
    return;
  }
}
