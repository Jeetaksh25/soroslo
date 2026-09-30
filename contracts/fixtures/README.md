# SoroSLO Testnet acceptance fixture

This directory contains the tiny Rust/Soroban contract used only for SoroSLO v0.1 acceptance testing.

The fixture exposes deterministic read-only functions:

- `healthy() -> bool` — always returns `true`;
- `value() -> i128` — always returns `42`;
- `double(value: i128) -> i128` — used to verify prior-step references;
- `snapshot() -> Map<Symbol, i128>` — returns `value`, current ledger sequence, and ledger timestamp for path/freshness assertions;
- `fail() -> Result<(), FixtureError>` — deterministic contract error.

The contract is not part of the SoroSLO runtime and no deployment identity is committed to the repository. The live Testnet workflow generates and funds an ephemeral identity only for fixture deployment. Normal SoroSLO acceptance execution receives only the public contract ID and uses `simulateTransaction`; it never receives the deployment secret.

## Local checks

```bash
cargo test --manifest-path contracts/fixtures/Cargo.toml
stellar contract build --manifest-path contracts/fixtures/Cargo.toml
```

See `docs/testnet-acceptance.md` for the latest verified Testnet evidence.
