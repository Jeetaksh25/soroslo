# @soroslo/runner

Restart-safe synthetic-check scheduling and execution.

M3 provides:

- persisted next/last schedule timestamps;
- per-check leases for duplicate suppression;
- deterministic scheduled-run idempotency keys;
- skip-missed catch-up behavior;
- bounded scheduler concurrency;
- check-level deadlines;
- transactional run-evidence persistence;
- incident state transitions after persisted runs;
- rolling SLO snapshots after each run.

Manual runs use the same execution path but supply their own idempotency key and do not modify scheduler timestamps.
