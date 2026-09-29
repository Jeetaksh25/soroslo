# Architecture overview

SoroSLO is split around explicit trust and product boundaries rather than framework boundaries.

```text
Config -> Runner -> Stellar adapter -> RPC
             |             |
             v             v
         Assertions     Evidence
             |             |
             +-------> Storage
                         |
                    SLO engine
                         |
                 Incidents/alerts
                         |
                      API/UI
```

## Boundary rules

- `packages/stellar` owns RPC-specific behavior and SDK translation.
- `packages/probe-engine` coordinates ordered steps but does not know persistence details.
- `packages/assertions` evaluates normalized values, never raw SDK objects.
- `packages/storage` persists domain records and is not allowed to introduce business semantics.
- `packages/slo-engine` consumes run classifications; it does not contact RPC.
- `packages/alerts` reacts to incident transitions, not individual raw RPC events.
- `apps/runner` composes the domain packages into scheduled execution.
- `apps/api` and `apps/dashboard` are product surfaces, not alternate business-logic implementations.

The full behavioral contract is frozen in [`../technical-spec-v0.1.md`](../technical-spec-v0.1.md).
