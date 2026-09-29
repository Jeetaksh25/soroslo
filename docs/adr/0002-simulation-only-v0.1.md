# ADR 0002: v0.1 is simulation-only

**Status:** Accepted

## Decision

SoroSLO v0.1 never signs or submits transactions.

## Why

The product's core value is reliability evidence, not on-chain automation. Avoiding signing authority reduces blast radius, secret-management burden, custody concerns, and contributor risk.

## Consequences

- Stateful synthetic journeys that require one step to mutate ledger state are out of scope for v0.1.
- The Stellar integration focuses on read operations and `simulateTransaction`.
- Remediation belongs to external tools or future explicitly designed integrations.
