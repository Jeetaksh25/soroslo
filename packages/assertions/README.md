# @soroslo/assertions

Deterministic assertion engine for SoroSLO.

M2 supports:

- `equals` / `not_equals`;
- `gt`, `gte`, `lt`, `lte` with exact decimal/integer comparison;
- `exists` / `not_exists`;
- `age_lt` operational freshness checks;
- `contains`, `starts_with`, `ends_with` for deterministic string checks;
- structured reasons for missing paths, type mismatches, and failed comparisons.

## String operators

`contains`, `starts_with` and `ends_with` apply to normalized string values only.

- The expected value must be a string; anything else is reported as
  `invalid_expected_value`.
- The observed value must be a string; anything else is reported as
  `type_mismatch` and is never coerced.
- Comparison is case-sensitive and byte-for-byte, so a spec produces the same
  verdict on any runtime.
- No regex, glob or pattern language is involved. An empty expected string
  matches every string, which is standard substring and prefix behaviour.

```yaml
assertions:
  - path: $.memo
    op: starts_with
    value: "Payment"
  - path: $.event.type
    op: contains
    value: "transfer"
  - path: $.asset.code
    op: ends_with
    value: "USDC"
```

Assertion evidence records the operator, expected value, observed value and
reason, so a failed string check is readable from the stored run alone.

The package executes no JavaScript, regex configuration, shell commands, templates, or plugins.
