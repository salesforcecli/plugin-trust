/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ExecOptions, exec } from 'child_process';

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

type NpmCommandOptions = ExecOptions & {
  json: boolean;
};

type NpmCommandResult = NpmShowResults & {
  [name: string]: string;
};

export class NpmCommand {
  private static npmBin = require.resolve('npm/bin/npm-cli.js');

  public static downloadTarball(dir: string, module: NpmModule): boolean {
    return false;
  }

  public static runNpmCmd(cmd: string, options = {} as NpmCommandOptions): NpmCommandResult {
    const bin = NpmCommand.bin();
    const results = exec(`${bin} ${cmd}`, options);
    // eslint-disable-next-line no-console
    console.log(results.stdout.toString());
    return {} as NpmCommandResult;
  }

  private static bin(): string {
    return this.npmBin;
  }
}

export class NpmModule {
  private showResults: NpmShowResults;
  private version: string;
  private module: string;

  public constructor(module: string, version = 'latest', registry?: string) {
    this.module = module;
    this.version = version ?? 'latest';
    this.showResults = this.show(this.module, this.version);
  }

  public downloadTarball(dir: string, version = 'latest'): boolean {
    return NpmCommand.downloadTarball(dir, this);
    return false;
  }

  public getDistTags(filter = (entry: unknown): unknown => entry): DistTags {
    return Object.entries(this.showResults['dist-tags'])
      .filter(filter)
      .reduce((a, b) => Object.assign(a, { ...b }), {});
  }

  private show(module: string, registry: string): NpmShowResults {
    if (!this.showResults) {
      this.showResults = {} as NpmShowResults;
    }
    return NpmCommand.runNpmCmd(`show ${this.module}@${this.version}`, { json: true });
  }

  public get npmShowResults(): NpmShowResults {
    return this.showResults;
  }
}
