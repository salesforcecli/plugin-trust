## Commands

validate a digital signature for a npm package

- [`sfdx plugins:trust:verify -n <string> [-r <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`]

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
