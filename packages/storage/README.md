# @soroslo/storage

SQLite persistence and restart-safe operational state for SoroSLO.

M3 provides:

- append-only, versioned migrations;
- the v0.1 service/check/run/step/assertion/incident/scheduler tables;
- an additional persisted check runtime-state table for incident recovery;
- configuration synchronization without deleting historical rows;
- transactional run evidence persistence;
- scheduled-run idempotency support;
- scheduler leases and restart-safe timestamps;
- rolling reliability-run queries;
- incident open/recovery persistence.

The implementation uses Node.js 22's built-in `node:sqlite` module and requires no external database service.
