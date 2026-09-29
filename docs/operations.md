# Operations

## Local processes

SoroSLO v0.1 has three runtime processes:

- **API** — local HTTP API and manual-run endpoint.
- **Runner** — restart-safe scheduler that executes configured checks.
- **Dashboard** — Next.js operator interface.

All processes read the same expanded `soroslo.yml` configuration. The API and runner share the same SQLite database.

### API

After building:

```bash
SOROSLO_CONFIG_PATH=./soroslo.yml \
SOROSLO_DB_PATH=./.soroslo/soroslo.sqlite \
pnpm --filter @soroslo/api start
```

The default bind is `127.0.0.1:3001`.

To bind remotely, configure both a non-loopback host and an administrator token:

```bash
SOROSLO_API_HOST=0.0.0.0
SOROSLO_ADMIN_TOKEN=<long-random-token>
```

The API refuses a remote bind without a token.

### Runner

```bash
SOROSLO_CONFIG_PATH=./soroslo.yml \
SOROSLO_DB_PATH=./.soroslo/soroslo.sqlite \
pnpm --filter @soroslo/runner start
```

Useful runtime settings:

- `SOROSLO_RUNNER_CONCURRENCY` — maximum checks executed concurrently; default `4`.
- `SOROSLO_RUNNER_TICK_MS` — scheduler polling interval; default `5000`.
- `SOROSLO_RUNNER_LEASE_MS` — persisted schedule lease duration; default `60000`.
- `SOROSLO_RUNNER_ID` — optional stable runner identifier.

## Docker Compose

Create a local configuration file at `./soroslo.yml`, copy `.env.example` to `.env`, then set a long random administrator token.

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
```

By default:

- dashboard: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:3001`
- SQLite data: named Docker volume `soroslo-data`
- ports are not exposed on non-loopback interfaces

The Compose deployment runs API, runner, and dashboard as separate processes sharing the SQLite volume.

## Remote dashboard access

Compose enables dashboard authentication. Open the dashboard and enter the same `SOROSLO_ADMIN_TOKEN` used by the API.

For internet-facing deployments:

1. leave the SoroSLO services behind a TLS reverse proxy;
2. set `SOROSLO_BIND_ADDRESS` only as broadly as required;
3. set `SOROSLO_COOKIE_SECURE=true` when the dashboard is served over HTTPS;
4. use a high-entropy administrator token;
5. rotate the token by restarting API/dashboard with the new value.

## Webhook delivery

Webhook events are signed with:

```text
HMAC-SHA256(secret, timestamp + "." + raw_request_body)
```

Headers:

- `X-SoroSLO-Event-Id`
- `X-SoroSLO-Timestamp`
- `X-SoroSLO-Signature: sha256=<hex>`

Delivery is deduplicated per `(event_id, channel_id)`. Retryable transport failures and HTTP `408`, `425`, `429`, and `5xx` responses use bounded exponential backoff. Redirects are not followed.

Private/loopback webhook targets are rejected unless `SOROSLO_ALLOW_PRIVATE_WEBHOOKS=true`.

## Shutdown and restart

The runner stores schedule timestamps and leases in SQLite. On restart it does not replay an entire missed backlog; stale intervals are skipped and the next future interval is scheduled.

The API and runner both handle termination signals and close their runtime resources.
