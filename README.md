# SoroSLO

**Synthetic service-level monitoring for Stellar/Soroban applications.**

SoroSLO is an open-source, self-hosted reliability platform that runs read-only Soroban simulations against deployed contracts, evaluates deterministic application-level assertions, stores historical evidence, and calculates rolling SLO/error-budget status.

SoroSLO answers a different question from a contract explorer or TTL monitor:

> Is the service built from my deployed Soroban contracts actually behaving correctly against its declared reliability target?

## Project status

SoroSLO is in **pre-v0.1 active development**. The v0.1 technical contract is frozen in [`docs/technical-spec-v0.1.md`](docs/technical-spec-v0.1.md). The repository currently contains the M0 foundation and package boundaries; runtime functionality lands milestone by milestone.

## Core principles

- **Simulation-only in v0.1.** No transaction signing or submission.
- **No custody.** SoroSLO never needs a Stellar secret key or seed phrase.
- **Deterministic assertions.** No `eval`, arbitrary JavaScript, or untrusted plugin execution.
- **Evidence-first.** Every result must be traceable to a check configuration, observed ledger, RPC endpoint fingerprint, and assertion result.
- **Run-based SLOs.** We do not misrepresent periodic samples as exact seconds of uptime.
- **Local-first.** SQLite and a single self-hosted deployment are the v0.1 baseline.
- **Complement, don't clone.** TTL remediation, event indexing, deployment management, formal verification, source verification, and protocol compatibility are intentionally outside the core scope.

## Planned v0.1 flow

```text
soroslo.yml
    │
    ▼
Config validation
    │
    ▼
Scheduled synthetic check
    │
    ├── simulate Soroban call
    ├── decode result
    ├── evaluate assertions
    └── persist evidence
    │
    ▼
Run classification
 pass / service_fail / observer_error
    │
    ▼
Rolling SLI + SLO + error budget
    │
    ├── Dashboard
    └── Incident + signed webhook
```

## Repository layout

```text
apps/
  api/          HTTP API surface
  dashboard/    web UI
  runner/       scheduler + check execution process
packages/
  config/       versioned config parsing and validation
  stellar/      Stellar RPC/simulation adapter
  probe-engine/ ordered step execution and result references
  assertions/   deterministic assertion engine
  slo-engine/   SLI/SLO/error-budget calculations
  storage/      persistence boundary
  alerts/       incidents and notification delivery
  shared/       shared domain types/utilities
cli/            operator CLI
contracts/      Testnet-only acceptance fixtures
examples/       runnable example configurations
```

## Milestones

- **M0 — Foundation:** repository, workspace, CI, governance, architecture decisions.
- **M1 — Stellar probe core:** network config, RPC client, simulation, return decoding.
- **M2 — Check engine:** config schema, step runner, references, assertions, classification.
- **M3 — Persistence & reliability:** SQLite, scheduler, SLI/SLO, error budget, incidents.
- **M4 — Product surfaces:** API, dashboard, run/check/incident details.
- **M5 — Notifications & hardening:** signed webhooks, retry/dedupe, auth, Docker, E2E.
- **M6 — Ecosystem evidence:** Testnet fixture, acceptance run, examples, v0.1.0 release.

## Local development

Prerequisites:

- Node.js 22+
- Corepack
- pnpm 10.x

```bash
corepack enable
pnpm install
pnpm verify
```

The M0 scaffold intentionally keeps application packages framework-light. Fastify, Next.js, Stellar SDK, SQLite, Vitest, and Playwright are introduced in the milestone that owns each capability instead of being added as unused dependencies.

## Security

SoroSLO v0.1 must never accept or persist Stellar secret seeds, mnemonic phrases, private signing keys, or wallet sessions. See [`SECURITY.md`](SECURITY.md) and [`docs/architecture/security-boundaries.md`](docs/architecture/security-boundaries.md).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Before proposing a feature, review the v0.1 non-goals in the technical specification so the project stays focused.

## License

Apache License 2.0. See [`LICENSE`](LICENSE).
