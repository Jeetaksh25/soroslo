# @soroslo/api

Local HTTP API for SoroSLO.

The API provides:

- `GET /healthz`
- `GET /readyz`
- `GET /api/v1/version`
- service and check read models
- run list/detail endpoints
- rolling SLO endpoint
- incident list/detail endpoints
- `POST /api/v1/checks/:checkId/run` manual trigger

## Network and authentication boundary

The server binds to `127.0.0.1` by default.

Remote/non-loopback binding is an explicit opt-in and requires the configured SoroSLO administrator bearer token. The dashboard uses the same protected API boundary when SoroSLO is remotely exposed. CORS is disabled by default.

Never place administrator tokens, credential-bearing RPC URLs, or webhook secrets in logs, screenshots, issues, or test fixtures.

See [HTTP API documentation](../../docs/api.md) and [operations guidance](../../docs/operations.md).
