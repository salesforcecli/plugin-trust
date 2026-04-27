## Commands

- [`sf plugins trust allowlist add`](#sf-plugins-trust-allowlist-add)
- [`sf plugins trust allowlist list`](#sf-plugins-trust-allowlist-list)
- [`sf plugins trust allowlist remove`](#sf-plugins-trust-allowlist-remove)
- [`sf plugins trust verify`](#sf-plugins-trust-verify)

## `sf plugins trust allowlist add`

Add plugins to the unsigned plugin allow list.

```
USAGE
  $ sf plugins trust allowlist add -n <value>... [--json] [--flags-dir <value>]

FLAGS
  -n, --name=<value>...  The npm name of the plugin to add to the allow list. Multiple names can be added in one
                         invocation by repeating the --name flag.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Add plugins to the unsigned plugin allow list.

  Adds one or more plugins to the unsignedPluginAllowList.json file, creating the file if it doesn't exist. Plugins
  already present in the allow list are skipped.

EXAMPLES
  sf plugins trust allowlist add --name @scope/my-plugin

  sf plugins trust allowlist add --name @scope/my-plugin --name another-plugin
```

## `sf plugins trust allowlist list`

List the plugins on the unsigned plugin allowlist.

```
USAGE
  $ sf plugins trust allowlist list [--json] [--flags-dir <value>]

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  List the plugins on the unsigned plugin allowlist.

  Prints the contents of the unsignedPluginAllowList.json file as a table.

EXAMPLES
  sf plugins trust allowlist list
```

## `sf plugins trust allowlist remove`

Remove plugins from the unsigned plugin allowlist.

```
USAGE
  $ sf plugins trust allowlist remove -n <value>... [--json] [--flags-dir <value>]

FLAGS
  -n, --name=<value>...  The npm name of the plugin to remove from the allowlist. Multiple names can be removed in one
                         invocation by repeating the --name flag.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Remove plugins from the unsigned plugin allowlist.

  Removes one or more plugins from the unsignedPluginAllowList.json file. Plugins not present in the allowlist are
  skipped.

EXAMPLES
  sf plugins trust allowlist remove --name @scope/my-plugin

  sf plugins trust allowlist remove --name @scope/my-plugin --name another-plugin
```

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
  sfdx plugins:trust:verify --npm @scope/npmName --registry https://npm.pkg.github.com
  sfdx plugins:trust:verify --npm @scope/npmName
```
