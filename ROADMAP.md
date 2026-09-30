# Roadmap

The authoritative v0.1 contract is [`docs/technical-spec-v0.1.md`](docs/technical-spec-v0.1.md).

## M0 — Foundation

- [x] Monorepo boundaries
- [x] TypeScript baseline
- [x] CI workflow
- [x] Governance/security documents
- [x] Initial ADRs
- [x] Generate and commit pnpm lockfile from a networked development environment
- [x] Protect `main` after the first green CI run

## M1 — Stellar probe core

- [x] Versioned network configuration
- [x] Stellar RPC adapter
- [x] `simulateTransaction` invocation builder
- [x] Return-value normalization
- [x] Deterministic RPC fixtures

## M2 — Check engine

- [x] `soroslo.yml` schema
- [x] Ordered steps
- [x] Prior-step references
- [x] Deterministic assertions
- [x] `pass` / `service_fail` / `observer_error` classification

## M3 — Persistence and reliability

- [x] SQLite migrations
- [x] Restart-safe scheduler
- [x] Run-based SLI
- [x] SLO status
- [x] Error budgets
- [x] Incident state machine

## M4 — Product surfaces

- [x] API
- [x] Dashboard
- [x] Check/run/incident views
- [x] Manual run trigger

## M5 — Notifications and hardening

- [x] Signed webhook notifications
- [x] Retry and deduplication
- [x] Runtime-only secrets and redaction boundaries
- [x] Remote-bind authentication
- [x] Operational deployment documentation
- [x] Docker Compose
- [x] Playwright E2E

## M6 — Ecosystem evidence

- [x] Testnet fixture contract
- [x] Live acceptance evidence
- [x] Examples
- [x] v0.1.0 release
- [x] Contributor-ready Wave backlog

## Post-v0.1 contributor roadmap

The first public release is complete. Ongoing development is tracked through the public contributor backlog rather than extending the frozen v0.1 specification.

See [Wave-ready contributor backlog](docs/wave-backlog.md) for the current 28 scoped tasks, suggested complexity, and sequencing guidance.

Current post-v0.1 themes include:

- operator CLI and configuration ergonomics;
- evidence retention, backup, export, and migration integrity;
- dashboard accessibility, filtering, timelines, and reliability views;
- API pagination, OpenAPI, stable errors, and build metadata;
- notification redelivery and bounded delivery policy;
- richer deterministic assertions and Soroban argument support;
- scheduler/runner lifecycle hardening;
- multi-RPC observer corroboration and resource evidence;
- advanced run-based SLO alerting.
