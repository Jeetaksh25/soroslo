# Contributing to SoroSLO

Thanks for contributing. SoroSLO keeps a public backlog of scoped implementation tasks so contributors can pick work with clear acceptance criteria and verification requirements.

## Find an issue

Start from the public issue backlog:

- [Good first issues](https://github.com/SoroSLO/soroslo/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) are intentionally narrower entry points for contributors who are new to SoroSLO.
- [Help wanted](https://github.com/SoroSLO/soroslo/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) contains contributor-ready work across the CLI, dashboard, API, storage, reliability, and Stellar/Soroban layers.

Read the full issue before starting. Contributor-ready issues include the problem, scope, acceptance criteria, tests, likely packages, dependencies, non-goals, and security/compatibility notes.

### Wave-program issues

If an issue carries a Drips Wave Program label (for example, `Stellar Wave`), follow the application flow in the Drips Wave app instead of the generic claiming workflow below. Maintainers will review Wave applications and assign the selected contributor through the Wave flow. Do not ask for a pre-Wave manual assignment on a Wave-labeled issue.

## Claiming an issue

1. Comment on the issue before substantial implementation work.
2. Briefly state the approach you plan to take and ask any scope questions up front.
3. Wait for a maintainer to confirm that the issue is available before investing in a large implementation.
4. A maintainer will assign the issue when GitHub permits it; otherwise the maintainer's confirmation in the issue thread is the authoritative ownership signal.
5. Post an update if your approach changes materially or you become blocked.

To keep contributor work from being locked indefinitely, an issue may be made available again after **7 days without an implementation update**. If you need more time, simply leave a short progress note in the issue.

Do not open competing implementations for an issue that a maintainer has already confirmed for another contributor unless the maintainers explicitly request an alternative approach.

## Before starting

1. Read [`docs/technical-spec-v0.1.md`](docs/technical-spec-v0.1.md).
2. Read the relevant architecture decision records in [`docs/adr/`](docs/adr/).
3. Confirm dependencies and non-goals in the issue.
4. Keep each pull request focused on one issue or one coherent change.

## Development

```bash
corepack enable
pnpm install
pnpm verify
```

For changes that affect dashboard flows, run the relevant Playwright coverage as well:

```bash
pnpm test:e2e
```

## Pull requests

A PR should include:

- the issue being solved, using `Closes #<issue>`;
- the implementation approach;
- how the issue's acceptance criteria are satisfied;
- tests added or updated;
- commands used for verification;
- documentation changes when behavior or public contracts change.

Do not weaken, skip, or delete tests merely to make CI pass.

Maintainers review contributor PRs against the issue scope and acceptance criteria. A green CI run is required but does not replace code review.

## Scope discipline

SoroSLO is intentionally simulation-only. Contributions that add signing, transaction submission, TTL remediation, full event indexing, arbitrary code execution, or unrelated protocol tooling require an accepted architecture proposal before implementation.

Do not expand an assigned issue into adjacent features without discussing the change in the issue first. Keeping tasks scoped makes contributor work easier to review and merge.

## Security-sensitive changes

Do not put real secrets, Stellar secret seeds, mnemonic phrases, private RPC credentials, production webhook secrets, or credential-bearing URLs into issues, tests, fixtures, screenshots, commits, or logs.

See [`SECURITY.md`](SECURITY.md) for private vulnerability reporting guidance.
