# @soroslo/shared

Shared deterministic domain utilities used across SoroSLO packages.

The package currently provides:

- canonical JSON serialization with stable object-key ordering;
- strict duration parsing and validation;
- deterministic JSON-path lookup for supported object/array paths;
- the canonical run-state set: `pass`, `service_fail`, `observer_error`, and `cancelled`;
- availability eligibility semantics for run states.

Keep this package dependency-light and domain-focused. Product-specific behavior belongs in the package that owns that concern.
