# Threat model

This threat model covers the SoroSLO v0.1 self-hosted deployment.

## Assets

SoroSLO protects:

- configuration integrity;
- RPC/network identity;
- run and incident evidence;
- administrator bearer token;
- webhook signing secrets;
- local SQLite history;
- availability of the observer itself.

SoroSLO deliberately does **not** possess Stellar signing authority.

## Trust boundaries

### Operator configuration

The operator controls `soroslo.yml` and environment variables. Configuration is trusted as data but is not executable.

### Stellar RPC

RPC endpoints and their responses are untrusted network input. SoroSLO validates expected response shapes, verifies network identity where possible, bounds retry behavior, and records endpoint fingerprints.

### Browser/API boundary

Local mode binds to loopback. A non-loopback API bind requires an administrator bearer token. The dashboard can exchange that token for an HTTP-only same-site session cookie containing a one-way digest rather than the original token.

### Outbound webhook boundary

Webhook destinations are untrusted remote servers. SoroSLO signs payloads, refuses redirects, uses bounded timeouts/retries, and rejects private/loopback destinations by default.

## Primary threats and mitigations

| Threat                                    | v0.1 mitigation                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Theft of Stellar funds                    | Runtime accepts no secret seed/private key and never signs/submits transactions      |
| Wrong-network evidence                    | Configured network passphrase is checked against RPC network identity                |
| RPC outage represented as service failure | Transport/tool failures are classified as `observer_error`                           |
| Replay/duplicate webhook delivery         | Deterministic event IDs plus persistent per-channel delivery ledger                  |
| Webhook tampering                         | HMAC-SHA256 signature over timestamp and raw body                                    |
| SSRF through webhook URL                  | HTTPS-only, no redirects, DNS/IP private-network rejection by default                |
| Remote dashboard/API exposure             | Loopback default; remote API bind requires bearer auth                               |
| Secret leakage in evidence                | Notification secrets are runtime-only and not persisted in run/notification evidence |
| Code execution through config             | Strict schema; no eval, shell, arbitrary JS, template engine, or dynamic plugins     |
| Scheduler duplicate work                  | Persisted schedule leases plus deterministic scheduled-run idempotency keys          |
| Misleading uptime claims                  | Explicit run-based SLI semantics and separate observer coverage                      |

## Residual risks

- A malicious or compromised RPC could return internally consistent but false network data. v0.1 has one RPC endpoint per configured network; multi-provider corroboration is deferred.
- SQLite is a single-node operational store. Operators are responsible for filesystem permissions and backups.
- Bearer-token security depends on transport security when exposed remotely. Internet-facing deployments should terminate TLS at a trusted reverse proxy and enable secure dashboard cookies.
- DNS can change after target validation. Redirects are disabled, but fully hardened egress proxying is outside v0.1.
- Testnet acceptance deployment uses an ephemeral signing identity because deployment itself is a network mutation; that identity is isolated from the SoroSLO runtime and is never committed.
