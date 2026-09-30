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
- `contains`
- `starts_with`
- `ends_with`

Numeric comparisons are exact. `contains`, `starts_with` and `ends_with` apply to
string values only: a non-string expected value is reported as
`invalid_expected_value`, a non-string observed value as `type_mismatch`, and
comparison is case-sensitive with no regex or pattern language. There is no
JavaScript, regex, shell, or plugin execution.

```yaml
assertions:
  - path: $.memo
    op: starts_with
    value: "Payment"
  - path: $.event.type
    op: contains
    value: "transfer"
  - path: $.asset.code
    op: ends_with
    value: "USDC"
```

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
