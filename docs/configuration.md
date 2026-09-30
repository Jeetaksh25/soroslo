# Configuration

SoroSLO v0.1 reads `soroslo.yml`.

Configuration is strict and non-executable. Environment-variable expansion occurs before schema validation. Unknown fields fail validation.

## Minimal Testnet configuration

```yaml
version: 1

runtime:
  timezone: UTC
  dataDir: ./.soroslo
  defaultTimeout: 15s

networks:
  testnet:
    preset: testnet

services:
  - id: fixture-service
    name: Fixture service
    checks:
      - id: healthy-read
        name: Healthy read
        network: testnet
        every: 5m
        steps:
          - id: healthy
            contract: ${SOROSLO_TESTNET_FIXTURE_CONTRACT}
            function: healthy
            args: []
            assertions:
              - path: $
                op: equals
                value: true
```

## Runtime

- `timezone` — operator display/configuration timezone. v0.1 examples use UTC.
- `dataDir` — local runtime data directory.
- `defaultTimeout` — fallback check timeout.

## Networks

### Testnet

```yaml
testnet:
  preset: testnet
```

The official SDF Testnet RPC is used unless `rpcUrl` is explicitly supplied.

### Mainnet

Mainnet requires an explicit RPC URL:

```yaml
mainnet:
  preset: mainnet
  rpcUrl: ${SOROSLO_MAINNET_RPC_URL}
```

### Custom network

A custom network requires both `rpcUrl` and `networkPassphrase`.

## Checks

Supported schedules are:

`1m`, `5m`, `15m`, `30m`, `1h`, `6h`, `12h`, `24h`.

Every check contains one or more ordered steps. v0.1 is fail-fast.

Later steps may reference an earlier result:

```yaml
args:
  - type: i128
    from: $steps.base.result
```

Simulations do not mutate network state, so a later step cannot observe a mutation from an earlier simulated step.

## Argument types

`bool`, `u32`, `i32`, `u64`, `i64`, `u128`, `i128`, `u256`, `i256`, `timepoint`, `duration`, `symbol`, `string`, `bytes`, and `address`.

Large integer values should be written as decimal strings.

## Assertions

v0.1 operators:

- `equals`
- `not_equals`
- `gt`
- `gte`
- `lt`
- `lte`
- `exists`
- `not_exists`
- `age_lt`

Numeric comparisons are exact. There is no JavaScript, regex, shell, or plugin execution.

## SLO policy

```yaml
slo:
  target: 99.9
  window: 7d
  minEligibleRuns: 100
  maxObserverErrorRate: 1
```

The SLI is run-based: passing eligible runs divided by `pass + service_fail`. Observer errors are reported separately.

## Incident policy

```yaml
incidentPolicy:
  failuresToOpen: 2
  passesToRecover: 2
```

Observer errors neither open nor recover a service incident.

## Webhooks

```yaml
notifications:
  webhooks:
    - id: ops
      url: ${SOROSLO_WEBHOOK_URL}
      secret: ${SOROSLO_WEBHOOK_SECRET}
```

Webhook URLs must use HTTPS. Secrets must be direct environment references in the source YAML; inline notification secrets are rejected by the loader.

## Validation diagnostics

A load failure reports every independent problem at once, each with a normalized
path that can be pasted into a YAML search. Array indexes are bracketed, not
dotted, so `services[0].checks[1].slo.target` is the path rather than the
ambiguous `services.0.checks.1.slo.target`.

```
Invalid SoroSLO configuration (3 errors):
  services[0].checks[0].slo.target: too big
  services[1].id: id must be a lowercase identifier
  services[1].checks[0].steps[0].contract: must be a valid Stellar contract strkey
```

Each diagnostic also carries a stable `kind` and `code`, so a CLI or dashboard
can group or filter without parsing the message:

| `kind` | Reported when |
|--------|---------------|
| `unknown_field` | a key is present that the schema does not allow |
| `invalid_type` | a value has the wrong JSON type |
| `invalid_id` | an id is not a lowercase identifier |
| `invalid_duration` | a duration is not of the form `10s`, `5m`, `7d` |
| `invalid_contract_id` | a contract field is not a `C...` StrKey |
| `invalid_reference` | a reference does not point at an earlier step result |
| `invalid_value` | any other schema constraint |
| `unresolved_environment` | an `${VAR}` reference has no value in the environment |

An unresolved environment variable is reported by name and by the config field
that references it. The loader never reads, formats or returns the resolved
value, so a diagnostic cannot leak a secret even when the missing variable is a
webhook secret. One diagnostic is reported per referencing field, so a variable
used in several places lists all of them:

```
Configuration requires 2 environment variables that are not set:
  notifications.webhooks[0].secret: Environment variable 'SOROSLO_WEBHOOK_SECRET' is required but not set
  services[0].checks[0].steps[0].contract: Environment variable 'SOROSLO_FIXTURE_CONTRACT' is required but not set
```

The message is path-free and the location is carried by `diagnostic.path`, so a
structured consumer and a human reader each see the path exactly once.

Consumers can read `ConfigError.diagnostics` directly when they need structured
output, for example `soroslo validate --json`. A YAML parse failure carries no
diagnostics because there is no parsed document to point into.
