# plugin-trust

Verify the authenticity of a plugin being installed with `plugins:install`.

### Allowlisting
If a plugin needs to be installed in a unattended fashion as is the case with automation. The plugin acceptance prompt can be avoided by placing the plugin name in $HOME/.config/sfdx/unsignedPluginAllowList.json

```json
[    
    "@salesforce/npmName",
    "plugin2",
    ...
]
```

If a plugin is not signed you then won't get a prompt confirming the installation of an unsigned plugin. Instead you'll get a message stating that the plugin was allowlisted and the installation will proceed as normal.

### Additional Verification Information
In addition to signature verification additional checks are in place to help ensure authenticity of plugins.

DNS - The public key url and signature urls must have an https scheme and originate from developer.salesforce.com
Cert Pinning - The digial fingerprint of developer.salesforce.com's certificate is validated. This helps prevent man in the middle attacks.

## Getting Started

The trust plugin is already bundled with the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli).

```bash
# Verify the CLI is installed
$ sfdx (-v | --version)

# Install a plugin which will be verified by the trust plugin
$ sfdx plugins:install auth
```

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/plugin-trust

# Install the dependencies and compile
yarn
yarn prepack

# Link your plugin to the Salesforce cli
sfdx plugins:link .

# To verify
sfdx plugins
```

## Debugging your plugin

We recommend using the Visual Studio Code (VS Code) IDE for your plugin development. Included in the `.vscode` directory of this plugin is a `launch.json` config file, which allows you to attach a debugger to the node process when running your commands.

To debug the `plugins:trust:verify` command:

If you linked your plugin to the sfdx cli, call your command with the `dev-suspend` switch:

```sh-session
$ sfdx hello:org -u myOrg@example.com --dev-suspend
```

Alternatively, to call your command using the `bin/run` script, set the `NODE_OPTIONS` environment variable to `--inspect-brk` when starting the debugger:

```sh-session
$ NODE_OPTIONS=--inspect-brk bin/run plugins:trust:verify
```

2. Set some breakpoints in your command code
3. Click on the Debug icon in the Activity Bar on the side of VS Code to open up the Debug view.
4. In the upper left hand corner of VS Code, verify that the "Attach to Remote" launch configuration has been chosen.
5. Hit the green play button to the left of the "Attach to Remote" launch configuration window. The debugger should now be suspended on the first line of the program.
6. Hit the green play button at the top middle of VS Code (this play button will be to the right of the play button that you clicked in step #5).
   ![how to debug](./.images/vscodeScreenshot.png)
   Congrats, you are debugging!

## Commands

validate a digital signature for a npm package

- [`sfdx plugins:trust:verify -n <string> [-r <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`]

## `sfdx plugins:trust:verify -n <string> [-r <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

```USAGE
  $ sfdx plugins:trust:verify -n <string> [-r <string>] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -n, --npm=npm                                                                     (required) Specify the npm
                                                                                    name. This can include a
                                                                                    tag/version

  -r, --registry=registry                                                           The registry name. the
                                                                                    behavior is the same as npm

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging
                                                                                    level for this command
                                                                                    invocation

EXAMPLES
  sfdx plugins:trust:verify --npm @scope/npmName --registry http://my.repo.org:4874
  sfdx plugins:trust:verify --npm @scope/npmName
```
