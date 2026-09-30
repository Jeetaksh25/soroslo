# @soroslo/assertions

Deterministic assertion engine for SoroSLO.

M2 supports:

- `equals` / `not_equals`;
- `gt`, `gte`, `lt`, `lte` with exact decimal/integer comparison;
- `exists` / `not_exists`;
- `age_lt` operational freshness checks;
- `between` inclusive numeric intervals with exact bounds;
- structured reasons for missing paths, type mismatches, and failed comparisons.

The package executes no JavaScript, regex configuration, shell commands, templates, or plugins.
