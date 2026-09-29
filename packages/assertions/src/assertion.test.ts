import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAssertion } from "./assertion.js";
import { compareExactNumeric } from "./numeric.js";

void test("compares integers beyond JavaScript safe integer range exactly", () => {
  assert.equal(compareExactNumeric("9007199254740993", "9007199254740992"), 1);
  assert.equal(compareExactNumeric("1.2500", "1.25"), 0);
  assert.equal(compareExactNumeric("1e3", "1000"), 0);
});

void test("resolves nested paths and reports missing paths", () => {
  const root = { quote: { value: "42" } };

  assert.equal(
    evaluateAssertion({ path: "$.quote.value", op: "gt", value: "41" }, root).passed,
    true
  );
  assert.deepEqual(
    evaluateAssertion({ path: "$.missing", op: "exists" }, root),
    {
      path: "$.missing",
      operator: "exists",
      expected: undefined,
      observed: undefined,
      passed: false,
      reason: "missing_path"
    }
  );
});

void test("supports existence and deterministic equality assertions", () => {
  const root = { state: { healthy: true }, items: [1, 2] };

  assert.equal(
    evaluateAssertion({ path: "$.state", op: "equals", value: { healthy: true } }, root).passed,
    true
  );
  assert.equal(
    evaluateAssertion({ path: "$.items[1]", op: "equals", value: 2 }, root).passed,
    true
  );
  assert.equal(
    evaluateAssertion({ path: "$.unknown", op: "not_exists" }, root).passed,
    true
  );
});

void test("evaluates freshness with an explicit observation clock", () => {
  const observedAtMs = 1_800_000_000_000;
  const root = { updated_at: observedAtMs / 1_000 - 30 };

  assert.equal(
    evaluateAssertion(
      { path: "$.updated_at", op: "age_lt", value: "60s" },
      root,
      { observedAtMs }
    ).passed,
    true
  );
  assert.equal(
    evaluateAssertion(
      { path: "$.updated_at", op: "age_lt", value: "10s" },
      root,
      { observedAtMs }
    ).passed,
    false
  );
});

void test("returns structured type mismatches instead of coercing", () => {
  const result = evaluateAssertion({ path: "$.value", op: "gt", value: "1" }, { value: "abc" });
  assert.equal(result.passed, false);
  assert.equal(result.reason, "type_mismatch");
});
