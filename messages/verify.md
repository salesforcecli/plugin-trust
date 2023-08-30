# summary

Validate a digital signature.

# description

Verifies the digital signature on an npm package matches the signature and key stored at the expected URLs.

# examples

- <%= config.bin %> <%= command.id %> --npm @scope/npmName --registry http://my.repo.org:4874

- <%= config.bin %> <%= command.id %> --npm @scope/npmName

# flags.npm.summary

Specify the npm name. This can include a tag/version.

# flags.registry.summary

The registry name. The behavior is the same as npm.

# FailedDigitalSignatureVerification

A digital signature is specified for this plugin but it didn't verify against the certificate.

# InstallConfirmation

This plugin is not signed by Salesforce. Only install the plugin if you trust its creator. Continue installation?,

# SuggestAllowList

Because you approved this plugin, you can avoid future installation confirmations by adding the plugin to the unsignedPluginAllowList.json file. For details, see https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_allowlist.htm.
