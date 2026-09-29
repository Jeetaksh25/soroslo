# Roadmap

The authoritative v0.1 contract is [`docs/technical-spec-v0.1.md`](docs/technical-spec-v0.1.md).

## M0 — Foundation

- [x] Monorepo boundaries
- [x] TypeScript baseline
- [x] CI workflow
- [x] Governance/security documents
- [x] Initial ADRs
- [ ] Generate and commit pnpm lockfile from a networked development environment
- [ ] Protect `main` after the first green CI run

## M1 — Stellar probe core

- [ ] Versioned network configuration
- [ ] Stellar RPC adapter
- [ ] `simulateTransaction` invocation builder
- [ ] Return-value normalization
- [ ] Deterministic RPC fixtures

## M2 — Check engine

- [ ] `soroslo.yml` schema
- [ ] Ordered steps
- [ ] Prior-step references
- [ ] Deterministic assertions
- [ ] `pass` / `service_fail` / `observer_error` classification

## M3 — Persistence and reliability

- [ ] SQLite migrations
- [ ] Restart-safe scheduler
- [ ] Run-based SLI
- [ ] SLO status
- [ ] Error budgets
- [ ] Incident state machine

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
