# summary

Remove plugins from the plugin allowlist.

# description

The plugin allowlist lets users automatically install a plugin without being prompted, even when the plugin is unsigned.

This command removes one or more plugins from the `unsignedPluginAllowList.json` file. Plugins not present in the allowlist are skipped.

# examples

- Remove a single plugin from the allowlist:

  <%= config.bin %> <%= command.id %> --name @scope/my-plugin

- Remove multiple plugins from the allowlist:

  <%= config.bin %> <%= command.id %> --name @scope/my-plugin --name another-plugin

# flags.name.summary

The npm name of the plugin to remove from the allowlist. Remove multiple plugins by specifying the `--name` flag multiple times.
