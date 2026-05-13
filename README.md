# plugin-trust

[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-trust.svg?label=@salesforce/plugin-trust)](https://www.npmjs.com/package/@salesforce/plugin-trust) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-trust.svg)](https://npmjs.org/package/@salesforce/plugin-trust) [![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/license/apache-2-0)

Verify the authenticity of a plugin being installed with `plugins:install`.

This plugin is bundled with the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli). For more information on the CLI, read the [getting started guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm).

We always recommend using the latest version of these commands bundled with the CLI, however, you can install a specific version or tag if needed.

### Allowlisting

If a plugin needs to be installed in a unattended fashion as is the case with automation. The plugin acceptance prompt can be avoided by placing the plugin name in \$HOME/.config/sf/unsignedPluginAllowList.json

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
Cert Pinning - The digital fingerprint of developer.salesforce.com's certificate is validated. This helps prevent man in the middle attacks.

## Install

```bash
sfdx plugins:install trust@x.y.z
```

## Issues

Please report any issues at <https://github.com/forcedotcom/cli/issues>

## Contributing

1. Please read our [Code of Conduct](CODE_OF_CONDUCT.md)
2. Create a new issue before starting your project so that we can keep track of
   what you are trying to add/fix. That way, we can also offer suggestions or
   let you know if there is already an effort in progress.
3. Fork this repository.
4. [Build the plugin locally](#build)
5. Create a _topic_ branch in your fork. Note, this step is recommended but technically not required if contributing using a fork.
6. Edit the code in your fork.
7. Write appropriate tests for your changes. Try to achieve at least 95% code coverage on any new code. No pull request will be accepted without unit tests.
8. Sign CLA (see [CLA](#cla) below).
9. Send us a pull request when you are done. We'll review your code, suggest any needed changes, and merge it in.

### CLA

External contributors will be required to sign a Contributor's License
Agreement. You can do so by going to <https://cla.salesforce.com/sign-cla>.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/plugin-trust

# Install the dependencies and compile
yarn install
yarn build
```

To use your plugin, run using the local `./bin/dev` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev plugins:trust
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sfdx cli
sfdx plugins:link .
# To verify
sfdx plugins
```

## Commands

<!-- commands -->

- [`@salesforce/plugin-trust plugins trust allowlist add`](#salesforceplugin-trust-plugins-trust-allowlist-add)
- [`@salesforce/plugin-trust plugins trust allowlist list`](#salesforceplugin-trust-plugins-trust-allowlist-list)
- [`@salesforce/plugin-trust plugins trust allowlist remove`](#salesforceplugin-trust-plugins-trust-allowlist-remove)
- [`@salesforce/plugin-trust plugins trust verify`](#salesforceplugin-trust-plugins-trust-verify)

## `@salesforce/plugin-trust plugins trust allowlist add`

Add plugins to the plugin allowlist.

```
USAGE
  $ @salesforce/plugin-trust plugins trust allowlist add -n <value>... [--json] [--flags-dir <value>]

FLAGS
  -n, --name=<value>...  (required) The npm name of the plugin to add to the allowlist. Add multiple plugins by
                         specifying the `--name` flag multiple times.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Add plugins to the plugin allowlist.

  The plugin allowlist lets users automatically install a plugin without being prompted, even when the plugin is
  unsigned.

  This command adds one or more plugins to the `unsignedPluginAllowList.json` file, creating the file if it doesn't
  exist. Plugins already present in the allowlist are skipped.

EXAMPLES
  Add a single plugin to the allowlist:

    $ @salesforce/plugin-trust plugins trust allowlist add --name @scope/my-plugin

  Add multiple plugins to the allowlist:

    $ @salesforce/plugin-trust plugins trust allowlist add --name @scope/my-plugin --name another-plugin
```

_See code: [src/commands/plugins/trust/allowlist/add.ts](https://github.com/salesforcecli/plugin-trust/blob/3.8.8/src/commands/plugins/trust/allowlist/add.ts)_

## `@salesforce/plugin-trust plugins trust allowlist list`

List the plugins on the plugin allowlist.

```
USAGE
  $ @salesforce/plugin-trust plugins trust allowlist list [--json] [--flags-dir <value>]

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  List the plugins on the plugin allowlist.

  The plugin allowlist lets users automatically install a plugin without being prompted, even when the plugin is
  unsigned.

  This command prints the contents of the `unsignedPluginAllowList.json` file as a table.

EXAMPLES
  List all plugins on the allowlist:

    $ @salesforce/plugin-trust plugins trust allowlist list
```

_See code: [src/commands/plugins/trust/allowlist/list.ts](https://github.com/salesforcecli/plugin-trust/blob/3.8.8/src/commands/plugins/trust/allowlist/list.ts)_

## `@salesforce/plugin-trust plugins trust allowlist remove`

Remove plugins from the plugin allowlist.

```
USAGE
  $ @salesforce/plugin-trust plugins trust allowlist remove -n <value>... [--json] [--flags-dir <value>]

FLAGS
  -n, --name=<value>...  (required) The npm name of the plugin to remove from the allowlist. Remove multiple plugins by
                         specifying the `--name` flag multiple times.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Remove plugins from the plugin allowlist.

  The plugin allowlist lets users automatically install a plugin without being prompted, even when the plugin is
  unsigned.

  This command removes one or more plugins from the `unsignedPluginAllowList.json` file. Plugins not present in the
  allowlist are skipped.

EXAMPLES
  Remove a single plugin from the allowlist:

    $ @salesforce/plugin-trust plugins trust allowlist remove --name @scope/my-plugin

  Remove multiple plugins from the allowlist:

    $ @salesforce/plugin-trust plugins trust allowlist remove --name @scope/my-plugin --name another-plugin
```

_See code: [src/commands/plugins/trust/allowlist/remove.ts](https://github.com/salesforcecli/plugin-trust/blob/3.8.8/src/commands/plugins/trust/allowlist/remove.ts)_

## `@salesforce/plugin-trust plugins trust verify`

Validate a digital signature.

```
USAGE
  $ @salesforce/plugin-trust plugins trust verify -n <value> [--json] [--flags-dir <value>] [-r <value>]

FLAGS
  -n, --npm=<value>       (required) Specify the npm name. This can include a tag/version.
  -r, --registry=<value>  The registry name. The behavior is the same as npm.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Validate a digital signature.

  Verifies the digital signature on an npm package matches the signature and key stored at the expected URLs.

EXAMPLES
  $ @salesforce/plugin-trust plugins trust verify --npm @scope/npmName --registry https://npm.pkg.github.com

  $ @salesforce/plugin-trust plugins trust verify --npm @scope/npmName
```

_See code: [src/commands/plugins/trust/verify.ts](https://github.com/salesforcecli/plugin-trust/blob/3.8.8/src/commands/plugins/trust/verify.ts)_

<!-- commandsstop -->
