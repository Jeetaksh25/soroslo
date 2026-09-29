# Contributing to SoroSLO

Thanks for contributing.

## Before starting

1. Read [`docs/technical-spec-v0.1.md`](docs/technical-spec-v0.1.md).
2. Read the relevant architecture decision records in [`docs/adr/`](docs/adr/).
3. Comment on an issue before substantial implementation work to avoid duplicate effort.
4. Keep each pull request focused on one issue or one coherent change.

## Development

```bash
corepack enable
pnpm install
pnpm verify
```

## Pull requests

A PR should include:

- the problem being solved;
- the implementation approach;
- tests added or updated;
- commands used for verification;
- documentation changes when behavior or public contracts change;
- `Closes #<issue>` when applicable.

Do not weaken or delete tests merely to make CI pass.

## Scope discipline

SoroSLO v0.1 is intentionally simulation-only. Contributions that add signing, transaction submission, TTL remediation, full event indexing, arbitrary code execution, or unrelated protocol tooling require an accepted architecture proposal before implementation.

## Security-sensitive changes

Do not put real secrets, Stellar secret seeds, mnemonic phrases, private RPC credentials, or production webhook secrets into issues, tests, fixtures, screenshots, commits, or logs.

See [`SECURITY.md`](SECURITY.md) for private vulnerability reporting guidance.
