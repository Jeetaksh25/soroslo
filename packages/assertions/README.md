# @soroslo/assertions

Deterministic assertion engine for SoroSLO.

M2 baseline supports:

- `equals` / `not_equals`;
- `gt`, `gte`, `lt`, `lte` with exact decimal/integer comparison;
- `exists` / `not_exists`;
- `age_lt` operational freshness checks;
- structured reasons for missing paths, type mismatches, and failed comparisons.

The package executes no JavaScript, regex configuration, shell commands, templates, or plugins.

## Post-v0.1 additions

These operators are merged after the v0.1/M2 baseline, so a configuration that
uses them is not portable to a baseline runtime.

- `between` — inclusive numeric interval. Both bounds are inclusive, so an
  observed value equal to `lower` or to `upper` passes. Bounds may be numbers or
  decimal strings and are compared exactly, so a bound beyond IEEE-754 precision
  is not routed through a float. A configuration whose `lower` exceeds its
  `upper` is rejected at load time, because such a check could never pass. A
  non-numeric bound reports `invalid_expected_value`; a non-numeric observed
  value reports `type_mismatch`.
