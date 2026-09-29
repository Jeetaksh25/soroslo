# @soroslo/api

Local HTTP API for SoroSLO.

M4 implements:

- `GET /healthz`
- `GET /readyz`
- `GET /api/v1/version`
- service and check read models
- run list/detail endpoints
- rolling SLO endpoint
- incident list/detail endpoints
- `POST /api/v1/checks/:checkId/run` manual trigger

The server binds to `127.0.0.1` by default. Remote-bind authentication remains an M5 hardening item, so callers must opt into any non-loopback host deliberately.
