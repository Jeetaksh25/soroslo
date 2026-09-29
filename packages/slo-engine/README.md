# @soroslo/slo-engine

Run-based reliability semantics for SoroSLO.

M3 implements:

- rolling run-based SLI calculations;
- observer-health coverage and observer-error rate;
- minimum-sample and maximum-observer-error sufficiency checks;
- SLO status: `met`, `breached`, or `insufficient_data`;
- error-budget consumption;
- the incident state machine:
  `healthy -> pending_failure -> incident_open -> pending_recovery -> healthy`.

Observer errors and cancelled runs never count as service failures.
