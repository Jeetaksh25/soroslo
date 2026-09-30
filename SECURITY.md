# Security Policy

## Supported versions

SoroSLO follows a latest-release support model.

| Version | Supported |
| --- | --- |
| 0.1.x | ✅ |
| main | ✅ development branch |
| older/unreleased snapshots | ❌ |

Security fixes are applied to the latest supported release line and `main`. If a vulnerability requires a release, maintainers will publish a patched release and document any operator action required.

## Reporting a vulnerability

Do **not** open a public issue for a vulnerability that could expose secrets, enable remote execution, bypass authentication, forge webhook signatures, corrupt SLO evidence, or cause unsafe RPC/network behavior.

Preferred reporting path:

1. Use GitHub's private security advisory flow for this repository when available.
2. If private advisories are unavailable, contact a repository maintainer privately rather than posting exploit details publicly.
3. Include the affected version/commit, impact, minimal reproduction, and any suggested mitigation.

Maintainers should acknowledge a credible report promptly, validate impact, coordinate remediation, and avoid publishing exploit details before a fix or mitigation is available.

## Security boundary

SoroSLO must never require, accept, or persist:

- Stellar secret seeds;
- mnemonic phrases;
- private signing keys;
- wallet sessions;
- arbitrary shell commands;
- arbitrary JavaScript assertion code.

Normal SoroSLO checks are simulation-only and must not sign or submit transactions.

If a proposed change crosses that boundary, stop and open an architecture discussion before implementation.

## Sensitive test data

Never place production credentials, private RPC tokens, webhook secrets, seed phrases, or credential-bearing URLs in issues, pull requests, fixtures, screenshots, logs, or committed configuration.

Security-sensitive tests must use deterministic synthetic fixtures and redacted evidence.
