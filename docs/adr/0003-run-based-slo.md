# ADR 0003: Run-based SLO semantics

**Status:** Accepted

## Decision

v0.1 availability is calculated from eligible synthetic runs rather than inferred wall-clock downtime.

`eligible = pass + service_fail`

`SLI = pass / eligible`

`observer_error` is excluded from the availability denominator and reported separately as monitoring coverage.

## Why

A periodic synthetic monitor samples behavior; it does not continuously observe every second. Converting sparse failures into exact minutes of downtime would overstate measurement precision.

## Consequences

The dashboard must show eligible runs and observer-error coverage beside the SLO. Duration-based uptime may be added only if a future measurement model can justify it.
