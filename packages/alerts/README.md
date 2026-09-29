# @soroslo/alerts

Signed generic webhook notifications for SoroSLO incidents.

M5 provides:

- deterministic incident event IDs;
- HMAC-SHA256 signatures over `timestamp.body`;
- event-id and timestamp headers;
- redirect refusal;
- bounded retry with exponential backoff and jitter;
- persistent delivery deduplication via the storage ledger interface;
- per-attempt persistence hooks;
- public-network webhook URL validation by default.

Webhook secrets remain runtime-only configuration values and are never persisted in notification evidence.
