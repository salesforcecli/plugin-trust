# summary

Add plugins to the plugin allowlist.

# description

The plugin allowlist lets users automatically install a plugin without being prompted, even when the plugin is unsigned.

This command adds one or more plugins to the `unsignedPluginAllowList.json` file, creating the file if it doesn't exist. Plugins already present in the allowlist are skipped.

# examples

- Add a single plugin to the allowlist:

  <%= config.bin %> <%= command.id %> --name @scope/my-plugin

- Add multiple plugins to the allowlist:

  <%= config.bin %> <%= command.id %> --name @scope/my-plugin --name another-plugin

# flags.name.summary

The npm name of the plugin to add to the allowlist. Add multiple plugins by specifying the `--name` flag multiple times.
