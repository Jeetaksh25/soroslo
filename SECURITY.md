# Security Policy

## Supported versions

SoroSLO is pre-v0.1. Security fixes are applied to the latest development branch until a stable release policy is published.

## Reporting a vulnerability

Do **not** open a public issue for a vulnerability that could expose secrets, enable remote execution, bypass authentication, forge webhook signatures, corrupt SLO evidence, or cause unsafe RPC/network behavior.

Use GitHub's private security advisory flow when enabled for this repository. If that is unavailable, contact the repository owner privately and include a minimal reproduction.

## v0.1 security boundary

SoroSLO must never require, accept, or persist:

- Stellar secret seeds;
- mnemonic phrases;
- private signing keys;
- wallet sessions;
- arbitrary shell commands;
- arbitrary JavaScript assertion code.

If a proposed change crosses that boundary, stop and open an architecture discussion before implementation.
