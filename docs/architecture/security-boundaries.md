# Security boundaries

## No signing authority

SoroSLO v0.1 is a read/simulate/observe/assert system. It must not require transaction-signing authority.

Forbidden inputs include Stellar secret seeds, mnemonic phrases, private signing keys, and wallet sessions.

## Untrusted RPC

RPC responses are external input. The Stellar adapter validates expected shapes, bounds stored evidence, fingerprints RPC endpoints, and classifies transport failures separately from service failures.

## Non-executable configuration

Configuration may interpolate environment variables and reference prior completed step results. It may not execute JavaScript, shell commands, templates with arbitrary code, or dynamically loaded modules.

## Administrative surface

The API binds to `127.0.0.1` by default.

A non-loopback API bind is rejected unless an administrator bearer token is configured. When a token is configured, every API route requires `Authorization: Bearer <token>`.

The dashboard can enforce the same administrator token with `SOROSLO_REQUIRE_AUTH=true`. Browser login exchanges the bearer token for an HTTP-only same-site session cookie containing only a one-way session digest, not the original token.

Docker Compose enables dashboard/API authentication by default and publishes ports to `127.0.0.1` unless the operator explicitly changes `SOROSLO_BIND_ADDRESS`.

No CORS policy is enabled in v0.1.

## Webhook boundary

Webhook secrets must enter configuration through direct environment-variable references. They are used only for HMAC signing and are never persisted in run or notification evidence.

Outbound webhook delivery:

- requires HTTPS;
- refuses redirects;
- rejects localhost, loopback, link-local, private, and reserved IP targets by default;
- resolves hostnames and rejects targets that resolve to private/loopback addresses;
- can opt into private webhook targets only with `SOROSLO_ALLOW_PRIVATE_WEBHOOKS=true`, intended for trusted single-operator deployments;
- signs `timestamp.body` with HMAC-SHA256;
- includes event-id and timestamp headers;
- uses bounded timeouts and retry attempts;
- persists only payload hashes and delivery metadata.

Operators exposing SoroSLO remotely should terminate TLS at a trusted reverse proxy and set `SOROSLO_COOKIE_SECURE=true`.
