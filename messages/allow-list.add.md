# summary

Add plugins to the unsigned plugin allow-list.

# description

Adds one or more plugins to the `unsignedPluginAllowList.json` file, creating the file if it doesn't exist. Plugins already present in the allow-list are skipped.

# examples

- Add a single plugin to the allow-list:

  <%= config.bin %> <%= command.id %> --name @scope/my-plugin

- Add multiple plugins to the allow-list:

  <%= config.bin %> <%= command.id %> --name @scope/my-plugin --name another-plugin

# flags.name.summary

The npm name of the plugin to add to the allow-list. Multiple names can be added in one invocation by repeating the `--name` flag
