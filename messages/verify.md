# summary

Validate a digital signature.

# description

Verifies the digital signature on an npm package matches the signature and key stored at the expected URLs.

# examples

- <%= config.bin %> <%= command.id %> --npm @scope/npmName --registry http://my.repo.org:4874

- <%= config.bin %> <%= command.id %> --npm @scope/npmName

# flags.npm

Specify the npm name. This can include a tag/version.

# flags.registry

The registry name. The behavior is the same as npm.

# FailedDigitalSignatureVerification

A digital signature is specified for this plugin but it didn't verify against the certificate.
