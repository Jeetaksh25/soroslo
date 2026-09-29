# Security boundaries

## No signing authority

SoroSLO v0.1 is a read/simulate/observe/assert system. It must not require transaction-signing authority.

Forbidden inputs include Stellar secret seeds, mnemonic phrases, private signing keys, and wallet sessions.

## Untrusted RPC

RPC responses are external input. The Stellar adapter must validate expected shapes, bound stored evidence, redact credential-bearing URLs, and classify transport failures separately from service failures.

## Non-executable configuration

Configuration may interpolate environment variables and reference prior completed step results. It may not execute JavaScript, shell commands, templates with arbitrary code, or dynamically loaded modules.

## Local-first administrative surface

The API/dashboard binds to loopback by default. Remote exposure is explicit and requires authentication before v0.1 is considered release-ready.
