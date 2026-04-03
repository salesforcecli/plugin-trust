# summary

Remove plugins from the unsigned plugin allow-list.

# description

Removes one or more plugins from the `unsignedPluginAllowList.json` file. Plugins not present in the allow-list are skipped.

# examples

- Remove a single plugin from the allow-list:

  <%= config.bin %> <%= command.id %> --name @scope/my-plugin

- Remove multiple plugins from the allow-list:

  <%= config.bin %> <%= command.id %> --name @scope/my-plugin --name another-plugin

# flags.name.summary

The npm name of the plugin to remove from the allow-list. Multiple names can be removed in one invocation by repeating the `--name` flag.
