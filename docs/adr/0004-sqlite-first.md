# ADR 0004: SQLite-first persistence

**Status:** Accepted

## Decision

Use SQLite as the v0.1 operational source of truth behind a repository abstraction.

## Why

SoroSLO should be useful from a single self-hosted deployment with minimal infrastructure. PostgreSQL and a queueing system would add operational cost before the product requires horizontal writers or multi-tenant scale.

## Consequences

- Schema migrations are versioned and append-only.
- Domain packages cannot depend directly on a specific SQLite library.
- PostgreSQL may be added later without redefining SLO semantics.
