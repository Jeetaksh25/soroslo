# Roadmap

The authoritative v0.1 contract is [`docs/technical-spec-v0.1.md`](docs/technical-spec-v0.1.md).

## M0 — Foundation

- [x] Monorepo boundaries
- [x] TypeScript baseline
- [x] CI workflow
- [x] Governance/security documents
- [x] Initial ADRs
- [x] Generate and commit pnpm lockfile from a networked development environment
- [ ] Protect `main` after the first green CI run

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

- [ ] API
- [ ] Dashboard
- [ ] Check/run/incident views
- [ ] Manual run trigger

## M5 — Notifications and hardening

- [ ] Signed webhook notifications
- [ ] Retry and deduplication
- [ ] Remote-bind authentication
- [ ] Docker Compose
- [ ] Playwright E2E

## M6 — Ecosystem evidence

- [ ] Testnet fixture contract
- [ ] Live acceptance evidence
- [ ] Examples
- [ ] v0.1.0 release
- [ ] Contributor-ready Wave backlog
