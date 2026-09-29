# ADR 0001: TypeScript monorepo

**Status:** Accepted

## Decision

Use Node.js 22+, TypeScript strict mode, pnpm workspaces, and Turborepo.

## Why

The product needs an API, runner, dashboard, CLI, shared domain libraries, Stellar integration, and contributor-friendly package boundaries. A TypeScript monorepo gives one primary language across those surfaces while keeping the Testnet fixture contract isolated in Rust.

## Consequences

- Package boundaries are explicit from M0.
- Shared domain logic must live in packages rather than being duplicated by apps.
- Rust is reserved for Soroban fixture contracts unless a later architecture decision establishes a stronger need.
