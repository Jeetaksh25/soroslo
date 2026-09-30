# HTTP API contract

SoroSLO v0.1 exposes a JSON API under `/api/v1`. The server binds to `127.0.0.1` by default. If an administrator token is configured, every route requires `Authorization: Bearer <token>`.

## Operational endpoints

### `GET /healthz`

```json
{ "status": "ok" }
```

### `GET /readyz`

Returns `200` with `{"status":"ready"}` when the process is ready or `503` with `{"status":"not_ready"}`.

### `GET /api/v1/version`

Returns the SoroSLO runtime version, config schema version, and normalized configuration hash.

## Services and checks

### `GET /api/v1/services`

```json
{
  "services": [
    {
      "id": "payments",
      "name": "Payments",
      "configHash": "...",
      "createdAt": "2026-09-29T18:00:00.000Z",
      "updatedAt": "2026-09-29T18:00:00.000Z",
      "checkCount": 2,
      "enabledCheckCount": 2
    }
  ]
}
```

### `GET /api/v1/services/:serviceId`

Returns one service plus its check summaries.

### `GET /api/v1/checks/:checkId`

Returns:

- current check summary;
- configured timeout, incident policy, and SLO policy;
- recent runs;
- recent incidents.

A qualified check ID is `<service-id>:<check-id>`.

## Runs

### `GET /api/v1/checks/:checkId/runs?limit=50&before=<timestamp>`

Returns newest-first run summaries. `limit` must be between 1 and 200.

### `GET /api/v1/runs/:runId`

Returns complete persisted run evidence including:

- run classification;
- config hash;
- observed ledger;
- RPC endpoint fingerprint;
- ordered step results;
- normalized return values;
- bounded simulation evidence;
- assertion results;
- failure classification/message.

## SLO

### `GET /api/v1/checks/:checkId/slo`

Returns `{"checkId":"...","slo":null}` when no SLO is configured. Otherwise `slo` contains:

- target;
- rolling window timestamps;
- observed run-based SLI;
- eligible/pass/fail counts;
- observer-error count/rate;
- data coverage;
- error-budget consumption ratio;
- `met | breached | insufficient_data` status.

Observer errors are never counted as service failures.

## Incidents

### `GET /api/v1/incidents?state=open|recovered&checkId=<id>&limit=100`

Returns incident summaries.

### `GET /api/v1/incidents/:incidentId`

Returns incident lifecycle evidence plus notification-attempt history.

## Manual execution

### `POST /api/v1/checks/:checkId/run`

Starts one manual simulation-only check execution and returns `202`:

```json
{
  "requestId": "...",
  "runId": "...",
  "state": "pass",
  "incidentEvent": null
}
```

Manual execution does not alter the persisted future schedule.

## Errors

Expected client errors use a JSON envelope such as:

```json
{
  "error": "bad_request",
  "message": "limit must be an integer between 1 and 200"
}
```

Missing resources return `404`. Authentication failures return `401` with a `WWW-Authenticate` header. Unexpected internal errors return a generic `500` envelope without secret-bearing implementation detail.
