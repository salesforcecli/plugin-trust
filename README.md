# plugin-trust

[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-trust.svg?label=@salesforce/plugin-trust)](https://www.npmjs.com/package/@salesforce/plugin-trust) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-trust.svg)](https://npmjs.org/package/@salesforce/plugin-trust) [![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/license/apache-2-0)

Verify the authenticity of a plugin being installed with `plugins install`.

This plugin is bundled with the [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli). For more information on the CLI, read the [getting started guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm).

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

Host - The public key url and signature urls must use an https scheme and originate from an approved host: `developer.salesforce.com` or `cli-assets.heroku.com`.
Signature - The plugin tarball's RSA-SHA256 signature is verified against the public key served from the approved host.

## Install

```bash
sf plugins install trust@x.y.z
```

## Issues

Please report any issues at <https://github.com/forcedotcom/cli/issues>

## Contributing

If you're interested in contributing, take a look at the [CONTRIBUTING](CONTRIBUTING.md) guide.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/plugin-trust

# Install the dependencies and compile
yarn && yarn build
```

To use your plugin, run using the local `./bin/dev.js` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev.js plugins trust
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sf cli
sf plugins link .
# To verify
sf plugins
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

_See code: [src/commands/plugins/trust/allowlist/add.ts](https://github.com/salesforcecli/plugin-trust/blob/4.1.2/src/commands/plugins/trust/allowlist/add.ts)_

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

_See code: [src/commands/plugins/trust/allowlist/list.ts](https://github.com/salesforcecli/plugin-trust/blob/4.1.2/src/commands/plugins/trust/allowlist/list.ts)_

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

_See code: [src/commands/plugins/trust/allowlist/remove.ts](https://github.com/salesforcecli/plugin-trust/blob/4.1.2/src/commands/plugins/trust/allowlist/remove.ts)_

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

_See code: [src/commands/plugins/trust/verify.ts](https://github.com/salesforcecli/plugin-trust/blob/4.1.2/src/commands/plugins/trust/verify.ts)_

<!-- commandsstop -->
