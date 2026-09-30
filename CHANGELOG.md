# Changelog

All notable public releases of SoroSLO are documented here.

## [0.1.0] - 2026-09-30

First public release.

### Added

- versioned `soroslo.yml` configuration;
- Testnet, Mainnet, and custom Stellar RPC configuration;
- simulation-only Soroban invocation engine;
- deterministic result normalization and assertions;
- ordered multi-step checks with prior-step references;
- explicit `pass`, `service_fail`, `observer_error`, and `cancelled` semantics;
- SQLite evidence persistence and versioned migrations;
- restart-safe fixed-interval scheduling;
- run-based SLI/SLO and error-budget calculations;
- incident opening and recovery state machine;
- signed webhook delivery with retry/deduplication;
- Fastify API and Next.js dashboard;
- loopback-by-default security and remote-bind bearer authentication;
- Docker Compose deployment;
- unit, integration, and Playwright E2E coverage;
- real Stellar Testnet acceptance fixture and evidence;
- contributor-ready public backlog.

### Security

The runtime does not accept Stellar secret seeds, mnemonic phrases, signing keys, or wallet sessions. Normal checks use `simulateTransaction` and do not sign or submit transactions.

See [release notes](docs/releases/v0.1.0.md) for full details.
