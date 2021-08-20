/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

import * as path from 'path';
import * as shelljs from 'shelljs';
import { SfdxError, fs } from '@salesforce/core';

type DistTags = {
  [name: string]: string;
};

type NpmShowResults = {
  versions: string[];
  'dist-tags': DistTags;
  sfdx?: {
    publicKeyUrl: string;
    signatureUrl: string;
  };
  dist?: {
    integrity: string;
    shasum: string;
    tarball: string;
    fileCount: number;
    unpackedSize: number;
    'npm-signature': string;
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
    const exec = `/bin/bash -c "node ${npmCli} ${cmd} --registry=${options.registry} --json"`;
    const npmShowResult = shelljs.exec(exec, {
      ...options,
      silent: true,
      fatal: true,
      async: false,
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
  private version: string;
  private module: string;

  public constructor(module: string, version = 'latest') {
    this.module = module;
    this.version = version;
  }

  public show(registry: string): NpmShowResults {
    return NpmCommand.runNpmCmd(`show ${this.module}@${this.version}`, { registry });
  }

  public pack(registry: string, options?: shelljs.ExecOptions): void {
    NpmCommand.runNpmCmd(`pack ${this.module}@${this.version}`, { ...options, registry });
    return;
  }
}
