/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { type as osType } from 'os';
import * as path from 'path';

import * as fs from 'fs';
import npmRunPath from 'npm-run-path';
import * as shelljs from 'shelljs';
import { SfError } from '@salesforce/core';
import { sleep, parseJson } from '@salesforce/kit';
import { Ux } from '@salesforce/sf-plugins-core';

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
  cliRoot?: string;
};

type NpmCommandResult = shelljs.ShellString;

type NpmPackage = {
  bin: {
    [name: string]: string;
  };
};

class NpmCommand {
  private static npmPkgPath = require.resolve('npm/package.json');

  public static runNpmCmd(cmd: string, options = {} as NpmCommandOptions): NpmCommandResult {
    const nodeExecutable = NpmCommand.findNode(options.cliRoot);
    const npmCli = NpmCommand.npmCli();
    const command = `"${nodeExecutable}" "${npmCli}" ${cmd} --registry=${options.registry}`;
    const npmCmdResult = shelljs.exec(command, {
      ...options,
      silent: true,
      async: false,
      env: npmRunPath.env({ env: process.env }),
    });
    if (npmCmdResult.code !== 0) {
      throw new SfError(npmCmdResult.stderr, 'ShellExecError');
    }

    return npmCmdResult;
  }

  private static npmPackagePath(): string {
    return this.npmPkgPath;
  }

  /**
   * Returns the path to the npm-cli.js file in this package's node_modules
   *
   * @private
   */
  private static npmCli(): string {
    const pkgPath = NpmCommand.npmPackagePath();

    const fileData = fs.readFileSync(pkgPath, 'utf8');
    const pkgJson = parseJson(fileData, pkgPath) as NpmPackage;

    const prjPath = pkgPath.substring(0, pkgPath.lastIndexOf(path.sep));
    return path.join(prjPath, pkgJson.bin['npm']);
  }

  /**
   * Locate node executable and return its absolute path
   * First it tries to locate the node executable on the root path passed in
   * If not found then tries to use whatver 'node' resolves to on the user's PATH
   * If found return absolute path to the executable
   * If the node executable cannot be found, an error is thrown
   *
   * @private
   */
  private static findNode(root?: string): string {
    const isExecutable = (filepath: string): boolean => {
      if (osType() === 'Windows_NT') return filepath.endsWith('node.exe');

      try {
        if (filepath.endsWith('node')) {
          // This checks if the filepath is executable on Mac or Linux, if it is not it errors.
          fs.accessSync(filepath, fs.constants.X_OK);
          return true;
        }
      } catch {
        return false;
      }
      return false;
    };

    if (root) {
      const sfdxBinDirs = NpmCommand.findSfdxBinDirs(root);
      if (sfdxBinDirs.length > 0) {
        // Find the node executable
        const node = shelljs.find(sfdxBinDirs).filter((file) => isExecutable(file))[0];
        if (node) {
          return fs.realpathSync(node);
        }
      }
    }

    // Check to see if node is installed
    const nodeShellString = shelljs.which('node');
    if (nodeShellString?.code === 0 && nodeShellString?.stdout) return nodeShellString.stdout;

    const err = new SfError('Cannot locate node executable.', 'CannotFindNodeExecutable');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore override readonly .name field
    err.name = 'CannotFindNodeExecutable';
    throw err;
  }

  /**
   * Finds the bin directory in the sfdx installation root path
   *
   * @param sfdxPath
   * @private
   */
  private static findSfdxBinDirs(sfdxPath: string): string[] {
    return sfdxPath
      ? [path.join(sfdxPath, 'bin'), path.join(sfdxPath, 'client', 'bin')].filter((p) => fs.existsSync(p))
      : [];
  }
}

export class NpmModule {
  public npmMeta: NpmMeta;
  public constructor(private module: string, private version: string = 'latest', private cliRoot?: string) {
    this.npmMeta = {
      moduleName: module,
    };
  }

  public show(registry: string): NpmShowResults {
    const showCmd = NpmCommand.runNpmCmd(`show ${this.module}@${this.version} --json`, {
      registry,
      cliRoot: this.cliRoot,
    });

    // `npm show` doesn't return exit code 1 when it fails to get a specific package version
    // If `stdout` is empty then no info was found in the registry.
    if (showCmd.stdout === '') {
      const err = new SfError(`Failed to find ${this.module}@${this.version} in the registry`, 'NpmError');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore override readonly .name field
      err.name = 'NpmError';
      throw err;
    }

    try {
      return JSON.parse(showCmd.stdout) as NpmShowResults;
    } catch (error) {
      if (error instanceof Error) {
        const err = new SfError(error.message, 'ShellParseError');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore override readonly .name field
        err.name = 'ShellParseError';
        throw err;
      }
      throw error;
    }
  }

  public pack(registry: string, options?: shelljs.ExecOptions): void {
    try {
      NpmCommand.runNpmCmd(`pack ${this.module}@${this.version}`, {
        ...options,
        registry,
        cliRoot: this.cliRoot,
      });
    } catch (err) {
      if (err instanceof Error) {
        const sfErr = SfError.wrap(err);
        const e = new SfError(`Failed to fetch tarball from the registry: \n${sfErr.message}`, 'NpmError');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore override readonly .name field
        e.name = 'NpmError';
        throw e;
      }
    }
    return;
  }

  public async fetchTarball(registry: string, options?: shelljs.ExecOptions): Promise<void> {
    await this.pollForAvailability(() => {
      this.pack(registry, options);
    });
    this.pack(registry, options);
  }

  // leave it because it's stubbed in the test
  // eslint-disable-next-line class-methods-use-this
  public async pollForAvailability(checkFn: () => void): Promise<void> {
    const isNonTTY = process.env.CI !== undefined || process.env.CIRCLECI !== undefined;
    let found = false;
    let attempts = 0;
    const maxAttempts = 300;

    const ux = new Ux({ jsonEnabled: isNonTTY });
    const start = isNonTTY ? (msg: string): void => ux.log(msg) : (msg: string): void => ux.spinner.start(msg);
    const update = isNonTTY ? (msg: string): void => ux.log(msg) : (msg: string): string => (ux.spinner.status = msg);
    const stop = isNonTTY ? (msg: string): void => ux.log(msg) : (msg: string): void => ux.spinner.stop(msg);

    start('Polling for new version(s) to become available on npm');
    while (!found && attempts < maxAttempts) {
      attempts += 1;
      update(`attempt: ${attempts} of ${maxAttempts}`);

      try {
        checkFn();
        found = true;
      } catch (error) {
        if (attempts === maxAttempts) {
          throw error;
        }
        found = false;
      }

      // eslint-disable-next-line no-await-in-loop
      await sleep(1000);
    }
    stop(attempts >= maxAttempts ? 'failed' : 'done');
  }
}
