# @soroslo/dashboard

Operational dashboard for SoroSLO.

M4 ships a Next.js dashboard backed by the local SoroSLO API.

## Views

- **Overview** — service/check state, last-run state, rolling SLI, SLO target, observer coverage, error-budget consumption, and active incidents.
- **Check detail** — operational state, SLO snapshot, recent runs, incident history, and manual-run control.
- **Run detail** — config hash, ledger, RPC fingerprint, ordered step evidence, normalized results, failures, and assertion evidence.
- **Incidents** — active/recovered history, opening/recovery evidence, and notification-attempt history.

## API connection

Server-side dashboard requests use:

`SOROSLO_API_URL=http://127.0.0.1:3001`

when set, otherwise the same loopback URL is used by default.

The browser-facing manual-run action is proxied through a same-origin Next.js route so the API does not need CORS enabled.
