# summary

Validate a digital signature.

# description

Verifies the digital signature on an npm package matches the signature and key stored at the expected URLs.

# examples

- <%= config.bin %> <%= command.id %> --npm @scope/npmName --registry https://npm.pkg.github.com

- <%= config.bin %> <%= command.id %> --npm @scope/npmName

# flags.npm.summary

Specify the npm name. This can include a tag/version.

# flags.registry.summary

The registry name. The behavior is the same as npm.

# NotSigned

The plugin isn't digitally signed.

# SignatureCheckSuccess

Successfully validated digital signature for %s.

# SkipSignatureCheck

Skipping digital signature verification because [%s] is allow-listed.

# FailedDigitalSignatureVerification

A digital signature is specified for this plugin but it didn't verify against the certificate.

# InstallConfirmation

%s isn't signed by Salesforce. Only install the plugin if you trust its creator. Do you want to continue the installation?

# SuggestAllowList

Because you approved this plugin, you can avoid future installation confirmations by adding the plugin to the unsignedPluginAllowList.json file. For details, see https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_allowlist.htm.
