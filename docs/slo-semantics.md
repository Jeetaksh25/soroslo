# SLI, SLO, and error-budget semantics

SoroSLO v0.1 measures the outcome of scheduled synthetic runs. It does not convert sparse probes into an unsupported claim about exact seconds of uptime.

## Run classification

Every run is exactly one of:

- `pass` — required simulations and assertions passed;
- `service_fail` — SoroSLO obtained enough evidence to determine the declared service behavior failed;
- `observer_error` — the monitor could not obtain trustworthy evidence;
- `cancelled` — the run was administratively cancelled.

## Eligibility

Only `pass` and `service_fail` are availability-eligible.

```text
eligible_runs = pass + service_fail
SLI = pass / eligible_runs
```

`observer_error` and `cancelled` do not reduce service availability. Observer failures are reported as monitor-health coverage instead.

## Coverage

```text
monitor_samples = pass + service_fail + observer_error
data_coverage = eligible_runs / monitor_samples
observer_error_rate = observer_error / monitor_samples
```

A check can require a minimum eligible sample count and cap the observer-error rate before the SLO is considered evaluable.

## Status

The status is:

- `insufficient_data` when sample/observer-health requirements are not satisfied;
- `met` when the SLO is evaluable and observed SLI is at least the target;
- `breached` when the SLO is evaluable and observed SLI is below the target.

## Error budget

For target percentage `T`:

```text
allowed_failure_fraction = 1 - (T / 100)
consumed_failure_fraction = service_fail / eligible_runs
error_budget_consumption_ratio =
  consumed_failure_fraction / allowed_failure_fraction
```

A ratio of `1.0` means the full error budget for the current rolling window has been consumed. Values above `1.0` mean the budget has been exceeded.

For a 100% target, any service failure means there is no finite positive error budget ratio; the implementation reports the edge case without inventing a misleading finite value.

## Incident semantics are separate

SLO evaluation and incident state are related but not identical.

The default incident state machine opens only after two consecutive `service_fail` runs and recovers after two consecutive `pass` runs. `observer_error` neither opens nor recovers a service incident.
