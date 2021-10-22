/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { type as osType } from 'os';
import * as path from 'path';

import npmRunPath from 'npm-run-path';
import * as shelljs from 'shelljs';

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
  cliRoot?: string;
};

type NpmCommandResult = shelljs.ShellString;

type NpmPackage = {
  bin: {
    [name: string]: string;
  };
};

export class NpmCommand {
  private static npmPkgPath = require.resolve('npm/package.json');

  public static runNpmCmd(cmd: string, options = {} as NpmCommandOptions): NpmCommandResult {
    const nodeExecutable = NpmCommand.findNode(options.cliRoot);
    const npmCli = NpmCommand.npmCli();
    const command = `"${nodeExecutable}" "${npmCli}" ${cmd} --registry=${options.registry} --json`;
    const npmCmdResult = shelljs.exec(command, {
      ...options,
      silent: true,
      fatal: true,
      async: false,
      env: npmRunPath.env({ env: process.env }),
    });
    if (npmCmdResult.code !== 0) {
      throw new SfdxError(npmCmdResult.stderr, 'ShellExecError');
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
    const pkgJson = fs.readJsonSync(pkgPath) as NpmPackage;
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
  private static findNode(root: string = undefined): string {
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
    const nodeShellString: shelljs.ShellString = shelljs.which('node');
    if (nodeShellString?.code === 0 && nodeShellString?.stdout) return nodeShellString.stdout;

    throw new SfdxError('Cannot locate node executable.', 'CannotFindNodeExecutable');
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
  public constructor(private module: string, private version: string = 'latest', private cliRoot: string = undefined) {
    this.npmMeta = {
      moduleName: module,
    };
  }

  public show(registry: string): NpmShowResults {
    const showCmd = NpmCommand.runNpmCmd(`show ${this.module}@${this.version}`, {
      registry,
      cliRoot: this.cliRoot,
    });

    // `npm show` always return exit code 0, even if the package it's trying to get doesn't exist.
    // If `stdout` is empty then no info was found in the registry.
    if (showCmd.stdout === '') {
      throw new SfdxError('Failed to get data from npm', 'NpmError');
    }

    try {
      return JSON.parse(showCmd.stdout) as NpmShowResults;
    } catch (error) {
      throw new SfdxError(error, 'ShellParseError');
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
      throw new SfdxError('Failed to fetch tarball from npm', 'NpmError');
    }
    return;
  }
}
