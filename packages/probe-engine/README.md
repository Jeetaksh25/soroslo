# @soroslo/probe-engine

Ordered synthetic check execution for SoroSLO.

M2 provides:

- ordered fail-fast step execution;
- typed Soroban argument conversion;
- read-only `$steps.<id>.result...` references;
- deterministic assertion evaluation;
- `pass`, `service_fail`, and `observer_error` classification;
- explicit handling of simulation errors and restore-required responses;
- a small `StepInvoker` boundary for deterministic tests and recorded RPC fixtures;
- a Stellar-backed invoker for production execution.

The engine never signs or submits a transaction.
