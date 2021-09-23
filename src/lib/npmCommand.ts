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
  cliRoot?: string;
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
    const npmCli = NpmCommand.npmCli(options.cliRoot);
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

  /**
   * Return a executable path to this modules reference to npm as
   * <path to node executable> <path to npm-cli.js>
   *
   * @private
   */
  private static npmCli(root: string = undefined): string {
    const nodeBinPath = NpmCommand.findNodeBin(root);
    const pkgPath = NpmCommand.npmPackagePath();
    const pkgJson = fs.readJsonSync(pkgPath) as NpmPackage;
    const prjPath = pkgPath.substring(0, pkgPath.lastIndexOf(path.sep));
    return `"${nodeBinPath}" "${path.join(prjPath, pkgJson.bin['npm'])}"`;
  }

  /**
   * Locate node executable and return its full path.
   * First see if node is on the path, if so, use unqualified name.
   * If not on the path, try to locate the node version installed with sfdx.
   * If found, return full path to the executable
   * If sfdx or node executable cannot be found, an exception is thrown
   *
   * @private
   */
  private static findNodeBin(root: string = undefined): string {
    let sfdxPath;
    if (root) {
      sfdxPath = root;
    } else {
      throw new SfdxError('Plugin root dir is not set', 'PluginRootNotSet');
    }
    // find node within sfdx installation
    const sfdxBinDirPaths = NpmCommand.getSfdxBinDirs(sfdxPath);
    if (sfdxBinDirPaths?.length > 0) {
      const nodeBinPath = shelljs
        .find(sfdxBinDirPaths)
        .filter((file) => {
          const fileName = path.basename(file);
          const stat = fs.statSync(file);
          const isExecutable = !stat.isDirectory();
          return isExecutable && (process.platform === 'win32' ? fileName === 'node.exe' : fileName === 'node');
        })
        .find((file) => file);
      if (nodeBinPath) {
        return fs.realpathSync(nodeBinPath);
      }
    }
    // check to see if node is installed
    if (shelljs.which('node')) {
      return 'node';
    }
    throw new SfdxError('Cannot locate node executable within sfdx installation.', 'CannotFindNodeExecutable');
  }

  /**
   * Test each potential directory exists used for sfdx installation
   *
   * @param sfdxPath
   * @private
   */
  private static getSfdxBinDirs(sfdxPath: string): string[] {
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
    return NpmCommand.runNpmCmd(`show ${this.module}@${this.version}`, { registry, cliRoot: this.cliRoot });
  }

  public pack(registry: string, options?: shelljs.ExecOptions): void {
    NpmCommand.runNpmCmd(`pack ${this.module}@${this.version}`, { ...options, registry, cliRoot: this.cliRoot });
    return;
  }
}
