# Maintainers

SoroSLO is currently maintained by the repository owner and designated organization maintainers.

## Current maintainers

- [@victorkay97](https://github.com/victorkay97)

## Maintainer responsibilities

Maintainers are responsible for:

- keeping the public roadmap and issue backlog coherent;
- scoping contributor issues with concrete acceptance criteria and tests;
- confirming ownership before substantial contributor work begins;
- reviewing pull requests against issue scope, security boundaries, and compatibility requirements;
- keeping CI, releases, documentation, and Testnet acceptance evidence healthy;
- triaging bugs and security reports;
- preserving the simulation-only/no-custody boundary unless an explicit architecture decision changes it;
- keeping contributor work moving during active Drips Wave cycles.

A maintainer should not merge a contribution solely because CI is green. Review must also confirm that the implementation satisfies the linked issue and does not weaken reliability or security semantics.

## Issue lifecycle

Contributor-ready issues should contain:

1. Problem
2. Scope
3. Acceptance criteria
4. Tests / verification
5. Likely files / packages
6. Non-goals
7. Dependencies
8. Security / compatibility notes

For ordinary GitHub issues, contributors should comment with their intended approach and wait for maintainer confirmation before beginning substantial work.

For issues participating in a Drips Wave Program, contributor selection and assignment should happen through the Wave application flow. Wave-labeled issues should remain unassigned until that process selects a contributor.

A claimed non-Wave issue may be made available again after 7 days without an implementation update unless the contributor posts a progress note.

## Pull request review

Maintainers should review:

- correctness and issue acceptance criteria;
- tests and failure-path coverage;
- simulation-only/no-custody guarantees;
- API/config/storage compatibility;
- deterministic evidence and classification behavior;
- secret redaction and operational safety;
- documentation for changed public behavior.

Prefer focused PRs. Large or architecture-changing work should be discussed before implementation.

## Releases

Release readiness requires:

- green `main` CI;
- passing repository verification and E2E coverage;
- release notes;
- security/compatibility review;
- live Testnet evidence when the release changes Stellar execution behavior.

The release process must remain reproducible from a verified commit.

## Becoming a maintainer

Additional maintainers may be added after sustained, high-quality participation that demonstrates:

- sound technical judgment;
- familiarity with SoroSLO reliability and security semantics;
- constructive code review;
- dependable issue/PR follow-through;
- responsible handling of contributor and security-sensitive work.

Maintainer access is granted deliberately and may be scoped initially.
