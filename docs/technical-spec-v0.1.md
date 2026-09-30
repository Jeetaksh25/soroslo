# SoroSLO v0.1 Technical Specification

**Status:** Frozen baseline for initial implementation  
**Date:** 2026-09-29  
**License target:** Apache-2.0  
**Primary stack:** TypeScript / Node.js 22+ / pnpm / Stellar JS SDK / SQLite / React

## 1. Product definition

SoroSLO is an open-source, self-hosted synthetic reliability monitor for applications built on Stellar/Soroban.

It answers:

> Is the service built from my deployed Soroban contracts behaving correctly against a declared reliability target?

SoroSLO is not a general contract explorer, TTL remediation tool, event indexer, debugger, deployment manager, static analyzer, or protocol-compatibility framework.

### v0.1 differentiator

A SoroSLO check is a scheduled, read-only/simulation-only sequence of Soroban calls with deterministic assertions. Results are persisted and evaluated as a rolling service-level indicator (SLI) against a declared service-level objective (SLO).

No private key is required. v0.1 never signs or submits a transaction.

---

## 2. Goals

v0.1 MUST:

1. Load and validate a versioned YAML configuration.
2. Support testnet, mainnet, and custom Stellar RPC endpoints.
3. Build and run Soroban `simulateTransaction` calls without transaction submission.
4. Decode supported Soroban return values into a deterministic JSON-safe representation.
5. Support ordered multi-step synthetic checks.
6. Allow later steps to reference earlier step results.
7. Evaluate deterministic assertions.
8. Persist complete run evidence in SQLite.
9. Schedule checks with restart-safe state.
10. Calculate rolling check success-rate SLI and error budget.
11. Distinguish service failures from observer/tool failures.
12. Expose a local HTTP API.
13. Provide a web dashboard.
14. Open and recover incidents using consecutive-failure/recovery thresholds.
15. Deliver signed generic webhook notifications.
16. Ship with unit, integration, and Playwright E2E tests.
17. Include a real Stellar Testnet acceptance fixture and evidence.
18. Ship as a self-hostable Docker Compose deployment.

v0.1 MUST NOT:

- hold a Stellar secret key or seed phrase;
- submit, sign, restore, extend, deploy, upgrade, or otherwise mutate on-chain state;
- provide arbitrary JavaScript assertions;
- execute untrusted code from configuration;
- index the full Stellar event stream;
- reimplement TTL lifecycle management;
- claim precise wall-clock uptime from intermittent synthetic samples;
- execute stateful multi-step flows where one simulated step must mutate state observed by a later step.

---

## 3. Reliability semantics

### 3.1 Run states

Every check run ends in exactly one top-level state:

- `pass` — all required steps ran and all required assertions passed.
- `service_fail` — simulation completed sufficiently to determine the declared service behavior failed.
- `observer_error` — SoroSLO could not obtain trustworthy evidence because of RPC transport failure, timeout, malformed upstream data, internal runner error, or similar observer failure.
- `cancelled` — run was explicitly cancelled during shutdown or administrative action.

### 3.2 SLI

v0.1 uses a **run-based success-rate SLI**:

`SLI = passing eligible runs / total eligible runs`

Eligible runs are `pass + service_fail`.

`observer_error` and `cancelled` runs are excluded from the availability denominator and separately reported as monitor-health coverage.

This means SoroSLO does **not** claim that a 5-minute schedule precisely measures seconds of uptime.

### 3.3 SLO and error budget

Each check MAY declare:

- target success rate, e.g. `99.9`
- rolling window, e.g. `24h`, `7d`, `30d`
- minimum eligible run count before the SLO becomes evaluable
- maximum unknown/observer-error rate

For a window:

`allowed_failure_fraction = 1 - target`

`consumed_failure_fraction = service_fail / eligible_runs`

The API/dashboard reports:

- target
- observed SLI
- eligible runs
- passing runs
- service failures
- observer errors
- data coverage
- error-budget consumption ratio
- SLO status: `met | breached | insufficient_data`

No duration-based “minutes of downtime” is presented in v0.1.

---

## 4. Configuration contract

Primary file: `soroslo.yml`

```yaml
version: 1

runtime:
  timezone: UTC
  dataDir: ./.soroslo
  defaultTimeout: 15s

networks:
  testnet:
    preset: testnet

  mainnet:
    preset: mainnet
    rpcUrl: ${SOROSLO_MAINNET_RPC_URL}

services:
  - id: payments
    name: Payments

    checks:
      - id: checkout-quote
        name: Checkout quote is usable
        network: testnet
        every: 5m
        timeout: 10s

        incidentPolicy:
          failuresToOpen: 2
          passesToRecover: 2

        slo:
          target: 99.9
          window: 7d
          minEligibleRuns: 100
          maxObserverErrorRate: 1.0

        steps:
          - id: oracle-price
            contract: CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...
            function: latest_price
            args: []

            assertions:
              - path: $.value
                op: gt
                value: "0"

              - path: $.updated_at
                op: age_lt
                value: 300s

          - id: quote
            contract: CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB...
            function: quote
            args:
              - type: i128
                value: "10000000"
              - type: i128
                from: $steps.oracle-price.result.value

            assertions:
              - path: $
                op: gt
                value: "0"

notifications:
  webhooks:
    - id: ops
      url: ${SOROSLO_WEBHOOK_URL}
      secret: ${SOROSLO_WEBHOOK_SECRET}
```

### 4.1 Configuration rules

- Unknown top-level fields fail validation by default.
- IDs use lowercase ASCII `[a-z0-9][a-z0-9-]{0,62}`.
- Service IDs are globally unique.
- Check IDs are unique inside a service.
- Step IDs are unique inside a check.
- Contract IDs must be valid Stellar contract strkeys.
- Mainnet has no implicit public RPC endpoint; `rpcUrl` is required.
- Testnet may use the official SDF testnet RPC default unless overridden.
- Custom networks require both RPC URL and network passphrase.
- Inline secrets are rejected for notification credentials; environment references are required.
- `${NAME}` expansion happens before schema validation and unresolved required variables fail startup.
- A normalized config hash is persisted with every run.

---

## 5. Step execution model

A check is an ordered list of steps.

Every step:

1. resolves literal and prior-step arguments;
2. builds one Soroban invocation transaction;
3. calls Stellar RPC `simulateTransaction`;
4. classifies the simulation result;
5. decodes the return value;
6. evaluates assertions;
7. persists raw and normalized evidence;
8. stops or continues according to step policy.

v0.1 defaults to fail-fast: the first required failed step ends the check.

All steps are simulations against live network state. A simulation does not alter the ledger, so later steps cannot depend on state mutation from an earlier simulated call.

### 5.1 Prior-step references

Allowed form:

`$steps.<step-id>.result[.<field>...]`

References are read-only and must resolve before the next simulation is built.

Circular references are impossible because a step may reference only a previously completed step.

---

## 6. Argument types

v0.1 supports explicit Soroban argument types:

- `bool`
- `u32`
- `i32`
- `u64`
- `i64`
- `u128`
- `i128`
- `u256`
- `i256`
- `timepoint`
- `duration`
- `symbol`
- `string`
- `bytes`
- `address`

Complex Soroban values (`vec`, `map`, arbitrary contract structs/unions) are deferred unless required by the testnet acceptance fixture.

Large integer values are represented as decimal strings in configuration and normalized JSON to avoid JavaScript precision loss.

---

## 7. Return-value normalization

Every successful step stores:

- raw RPC simulation payload (redacted/bounded);
- raw return XDR where available;
- decoded result;
- ledger observed;
- resource fee;
- CPU/resource data exposed by the current RPC/SDK;
- simulation duration measured by SoroSLO;
- config hash;
- SDK version.

JSON-safe normalization rules:

- integers outside safe JS integer range -> decimal strings;
- bytes -> lowercase hex;
- addresses -> Stellar strkey strings;
- symbols/strings -> strings;
- vectors -> arrays;
- maps -> deterministic arrays or objects only when key conversion is unambiguous;
- unsupported values -> typed normalized envelope rather than lossy coercion.

---

## 8. Assertion engine

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

Rules:

- Assertions are deterministic.
- Numeric comparisons use exact integer/decimal handling, never IEEE-754 coercion for large values.
- `age_lt` accepts a Unix timestamp-like numeric field and compares it with the observed ledger/run wall clock, documenting this as an operational freshness assertion rather than consensus time.
- `contains`, `starts_with` and `ends_with` apply only to normalized string values. Both sides must be strings: a non-string expected value is reported as `invalid_expected_value`, and a non-string observed value as `type_mismatch` rather than being coerced.
- String comparison is case-sensitive and byte-for-byte, so the same spec yields the same verdict on any runtime. An empty expected string matches every string, which follows from standard substring and prefix semantics.
- Missing paths fail except for `not_exists`.
- Type mismatches produce a failed assertion with a structured reason.
- No regex, eval, shell, JavaScript, template execution, or plugin code in v0.1.

---

## 9. Network/RPC behavior

SoroSLO uses the official JavaScript Stellar SDK.

Baseline at spec freeze:

- Node.js 22+
- `@stellar/stellar-sdk` 17.x, exact version pinned by lockfile
- testnet default RPC: official SDF testnet RPC
- mainnet: explicit operator-provided RPC endpoint required

RPC client requirements:

- per-request timeout;
- bounded retries for transport errors and retryable 429/5xx responses;
- exponential backoff with jitter;
- never retry deterministic JSON-RPC/application errors as transport failures;
- record endpoint identity with each run;
- do not silently fail over to a different network;
- verify configured network identity on startup where the RPC exposes sufficient information.

v0.1 supports one configured endpoint per named network. Multi-provider failover is deferred.

---

## 10. Persistence model

SQLite is the v0.1 default and source of truth for operational history.

Minimum tables:

### `services`
- id
- name
- config_hash
- created_at
- updated_at

### `checks`
- id
- service_id
- name
- network
- schedule
- config_hash
- enabled
- created_at
- updated_at

### `runs`
- id
- check_id
- scheduled_at
- started_at
- finished_at
- state
- observed_ledger
- rpc_endpoint_fingerprint
- config_hash
- observer_error_code
- observer_error_message

### `step_results`
- id
- run_id
- step_id
- ordinal
- state
- contract_id
- function_name
- result_json
- raw_return_xdr
- min_resource_fee
- elapsed_ms
- evidence_json

### `assertion_results`
- id
- step_result_id
- ordinal
- path
- operator
- expected_json
- observed_json
- passed
- reason

### `incidents`
- id
- check_id
- opened_at
- recovered_at
- state
- opening_run_id
- recovery_run_id
- failure_count
- summary

### `notification_attempts`
- id
- incident_id
- channel_id
- event_type
- attempt
- started_at
- finished_at
- state
- response_code
- error_class

### `scheduler_state`
- check_id
- last_scheduled_at
- next_scheduled_at
- lease_owner
- lease_expires_at

Database migrations are append-only and versioned.

---

## 11. Scheduler

v0.1 schedule syntax supports fixed durations:

- `1m`
- `5m`
- `15m`
- `30m`
- `1h`
- `6h`
- `12h`
- `24h`

Minimum interval: 1 minute.

Requirements:

- restart-safe;
- no duplicate run for the same scheduled timestamp;
- bounded concurrency;
- per-check timeout;
- graceful shutdown;
- catch-up policy defaults to **skip missed intervals and schedule the next future run**;
- manual trigger does not alter future scheduled timestamps;
- every run has an idempotency key derived from `(check_id, scheduled_at, config_hash)`.

Cron syntax is deferred.

---

## 12. Incident state machine

Check operational state:

`healthy -> pending_failure -> incident_open -> pending_recovery -> healthy`

Default:

- open incident after 2 consecutive `service_fail` runs;
- recover after 2 consecutive `pass` runs;
- `observer_error` neither opens nor recovers a service incident, but contributes to observer-health reporting.

Incident notifications:

- `opened`
- `updated` only on material severity/context change
- `recovered`

No notification storm per run.

---

## 13. Webhook notifications

v0.1 ships one notification transport: generic HTTPS webhook.

Payload includes:

- schema version
- event id
- event type
- service/check identifiers
- incident id
- run id
- current state
- observed SLI/SLO status
- timestamp
- dashboard URL when configured

Security:

- secret comes from environment reference;
- HMAC-SHA256 signature header;
- timestamp header;
- event-id header;
- bounded retries;
- secrets never stored in run evidence or returned by API;
- redirect following disabled by default;
- loopback/private-network URL policy documented to prevent accidental SSRF exposure when deployed multi-user.

Slack/Discord/PagerDuty-specific renderers are deferred; their generic webhook endpoints can still be used where compatible.

---

## 14. HTTP API

Prefix: `/api/v1`

Operational:

- `GET /healthz`
- `GET /readyz`
- `GET /api/v1/version`

Read API:

- `GET /api/v1/services`
- `GET /api/v1/services/:serviceId`
- `GET /api/v1/checks/:checkId`
- `GET /api/v1/checks/:checkId/runs`
- `GET /api/v1/runs/:runId`
- `GET /api/v1/checks/:checkId/slo`
- `GET /api/v1/incidents`
- `GET /api/v1/incidents/:incidentId`

Mutation:

- `POST /api/v1/checks/:checkId/run`

Security baseline:

- bind to `127.0.0.1` by default;
- remote bind is explicit opt-in;
- remote bind requires an administrator bearer token for the entire dashboard/API in v0.1;
- token stored only as a hash if persisted;
- no CORS by default.

---

## 15. Dashboard

v0.1 pages:

### Overview
- services
- check current state
- last run
- observed SLI
- SLO target
- error-budget status
- observer-error coverage
- active incidents

### Check detail
- current status
- SLO window
- run history
- step breakdown
- assertion failures
- resource/simulation trend
- incident history

### Run detail
- config hash
- ledger
- endpoint fingerprint
- ordered steps
- normalized results
- assertion evidence
- observer/service classification

### Incidents
- active/recovered
- opening run
- recovery run
- notification history

v0.1 deliberately has no account system, teams, billing, or multi-tenancy.

---

## 16. Security boundaries

### Hard boundary

SoroSLO v0.1 never accepts:

- Stellar secret seeds (`S...`);
- mnemonic phrases;
- private signing keys;
- wallet sessions;
- arbitrary shell commands;
- arbitrary JavaScript assertion code.

A startup validator rejects known Stellar secret-seed forms in configuration fields where they cannot be legitimate.

### RPC trust

RPC data is untrusted external input.

- Bound response sizes.
- Validate all expected response shapes.
- Persist bounded diagnostic evidence.
- Redact URLs containing credentials before logging.
- Do not include RPC authorization headers in evidence.

### Configuration trust

Configuration is operator-controlled but not executable.

- strict schema;
- no eval;
- no arbitrary module loading;
- no template engine beyond environment substitution and prior-step value references.

### Dashboard

Default loopback binding is the security model for local mode.
Remote exposure requires explicit authentication and deployment hardening documentation.

---

## 17. Repository structure

```text
soroslo/
├── apps/
│   ├── api/
│   ├── dashboard/
│   └── runner/
├── packages/
│   ├── config/
│   ├── stellar/
│   ├── probe-engine/
│   ├── assertions/
│   ├── slo-engine/
│   ├── storage/
│   ├── alerts/
│   └── shared/
├── cli/
├── contracts/
│   └── fixtures/
├── examples/
│   ├── single-contract/
│   └── chained-read-check/
├── docs/
│   ├── architecture.md
│   ├── configuration.md
│   ├── security.md
│   ├── slo-semantics.md
│   └── operations.md
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/
│   └── PULL_REQUEST_TEMPLATE.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── LICENSE
├── README.md
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 18. Tooling decisions

- Package manager: pnpm
- Monorepo: pnpm workspaces + Turborepo
- Language: TypeScript, strict mode
- Runtime: Node.js 22+
- Stellar: `@stellar/stellar-sdk` 17.x pinned in lockfile
- API: Fastify
- Config validation: Zod
- YAML: `yaml`
- Persistence: SQLite with a small repository abstraction so Postgres can be added later without changing domain logic
- Unit/integration tests: Vitest
- Browser E2E: Playwright
- Frontend: Next.js + React
- Formatting/lint: Prettier + ESLint
- Containerization: Docker + Docker Compose

No Redis, message broker, Kubernetes, or external database is required in v0.1.

---

## 19. Testnet fixture

The repository includes a tiny Rust/Soroban fixture solely for acceptance testing.

Required functions:

- deterministic healthy read;
- integer-returning read;
- struct/map-like read used for path assertions;
- deterministic contract-error function;
- optional timestamp/freshness read.

Acceptance evidence must show:

1. fixture deployed to Stellar Testnet;
2. contract ID documented;
3. single-step probe passes;
4. chained read-only check passes;
5. intentionally false assertion produces `service_fail`;
6. invalid/unreachable RPC produces `observer_error`;
7. no transaction submission occurs during normal SoroSLO execution.

Fixture contract code is not part of the SoroSLO runtime.

---

## 20. CI

Every PR runs:

1. dependency install with frozen lockfile;
2. formatting check;
3. lint;
4. TypeScript typecheck;
5. unit tests;
6. SQLite integration tests;
7. build;
8. fixture-independent probe-engine tests with recorded deterministic RPC fixtures;
9. dashboard Playwright tests.

A separate scheduled/manual workflow MAY run live Testnet smoke tests.

Live-network tests must not gate every contributor PR because upstream availability would make CI nondeterministic.

---

## 21. Release readiness

v0.1.0 is not released until:

- clean install from fresh clone works;
- `docker compose up` works;
- local demo is documented;
- real Testnet fixture is verified;
- all CI is green;
- threat model is documented;
- config schema is versioned;
- database migration path is tested;
- API response contracts are documented;
- screenshots/demo are real, not mocks;
- README states limitations and non-goals;
- Apache-2.0 license is present;
- first backlog contains meaningful contributor-ready issues.

---

## 22. Internal implementation milestones

### M0 — Foundation
- organization/repository creation
- license
- pnpm/turbo workspace
- TypeScript baseline
- CI
- repository governance files
- architectural decision records

### M1 — Stellar probe core
- network config
- Stellar RPC client
- simulation builder
- return decoding
- normalized evidence
- deterministic fixtures

### M2 — Check engine
- configuration schema
- argument resolution
- ordered step runner
- prior-step references
- assertion engine
- pass/service_fail/observer_error classification

### M3 — Persistence and reliability
- SQLite migrations
- run persistence
- restart-safe scheduler
- SLI calculation
- SLO status
- error-budget calculation
- incident state machine

### M4 — Product surfaces
- Fastify API
- overview dashboard
- check/run details
- incident history
- manual run trigger

### M5 — Notifications and hardening
- signed webhook transport
- retry/dedupe
- redaction
- remote-bind auth
- operational docs
- Playwright E2E
- Docker/Compose

### M6 — Ecosystem evidence
- Rust Testnet fixture
- live acceptance run
- examples
- screenshots/demo
- v0.1.0 release
- Wave-ready backlog

---

## 23. Work intentionally deferred beyond v0.1

- stateful multi-step sandbox/rehearsal;
- transaction signing/submission;
- TTL remediation;
- multi-provider RPC failover;
- event-stream indexing;
- Prometheus/OpenTelemetry;
- Slack/Discord/PagerDuty-specific adapters;
- cron expressions;
- arbitrary plugins;
- formal invariants;
- source verification;
- contract deployment;
- protocol compatibility packs;
- multi-user auth/RBAC;
- hosted SaaS/multi-tenancy;
- Postgres;
- mobile app;
- AI-generated assertions or incident explanations.

---

## 24. Wave-readiness principle

The repository should be useful without Drips.

Wave issues will be selected only from real product backlog items with:

- user-visible or operational value;
- explicit scope;
- acceptance criteria;
- test requirements;
- files/packages involved;
- non-goals;
- dependencies;
- a realistic single-Wave completion size.

The project will not manufacture trivial issues solely to create bounty inventory.
