import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAssertion } from "./assertion.js";
import { compareExactNumeric } from "@soroslo/shared";

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
  assert.deepEqual(evaluateAssertion({ path: "$.missing", op: "exists" }, root), {
    path: "$.missing",
    operator: "exists",
    expected: undefined,
    observed: undefined,
    passed: false,
    reason: "missing_path"
  });
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
  assert.equal(evaluateAssertion({ path: "$.unknown", op: "not_exists" }, root).passed, true);
});

void test("evaluates freshness with an explicit observation clock", () => {
  const observedAtMs = 1_800_000_000_000;
  const root = { updated_at: observedAtMs / 1_000 - 30 };

  assert.equal(
    evaluateAssertion({ path: "$.updated_at", op: "age_lt", value: "60s" }, root, { observedAtMs })
      .passed,
    true
  );
  assert.equal(
    evaluateAssertion({ path: "$.updated_at", op: "age_lt", value: "10s" }, root, { observedAtMs })
      .passed,
    false
  );
});

void test("returns structured type mismatches instead of coercing", () => {
  const result = evaluateAssertion({ path: "$.value", op: "gt", value: "1" }, { value: "abc" });
  assert.equal(result.passed, false);
  assert.equal(result.reason, "type_mismatch");
});

void test("evaluates between inclusively at both bounds", () => {
  const root = { value: 10 };

  assert.equal(
    evaluateAssertion({ path: "$.value", op: "between", value: { lower: 10, upper: 10 } }, root)
      .passed,
    true
  );
  assert.equal(
    evaluateAssertion({ path: "$.value", op: "between", value: { lower: 10, upper: 20 } }, root)
      .passed,
    true
  );
  assert.equal(
    evaluateAssertion({ path: "$.value", op: "between", value: { lower: 1, upper: 10 } }, root)
      .passed,
    true
  );
  assert.equal(
    evaluateAssertion({ path: "$.value", op: "between", value: { lower: 11, upper: 20 } }, root)
      .passed,
    false
  );
  assert.equal(
    evaluateAssertion({ path: "$.value", op: "between", value: { lower: 1, upper: 9 } }, root)
      .passed,
    false
  );
});

void test("compares between bounds beyond IEEE-754 precision exactly", () => {
  const root = { value: "9007199254740993" };

  // Number(9007199254740993) === 9007199254740992 in IEEE-754, so a float
  // comparison would treat these as the same value and pass the first case.
  assert.equal(
    evaluateAssertion(
      { path: "$.value", op: "between", value: { lower: "9007199254740993", upper: "9007199254740994" } },
      root
    ).passed,
    true
  );
  assert.equal(
    evaluateAssertion(
      { path: "$.value", op: "between", value: { lower: "9007199254740992", upper: "9007199254740992" } },
      root
    ).passed,
    false
  );
});

void test("evaluates between on decimals exactly", () => {
  const root = { value: "1.25" };

  assert.equal(
    evaluateAssertion({ path: "$.value", op: "between", value: { lower: "1.2", upper: "1.3" } }, root)
      .passed,
    true
  );
  assert.equal(
    evaluateAssertion({ path: "$.value", op: "between", value: { lower: "1.2500", upper: "1.2500" } }, root)
      .passed,
    true
  );
  assert.equal(
    evaluateAssertion({ path: "$.value", op: "between", value: { lower: 1, upper: 1 } }, root).passed,
    false
  );
});

void test("records both bounds and the observed value in between evidence", () => {
  const root = { value: 7 };
  assert.deepEqual(
    evaluateAssertion({ path: "$.value", op: "between", value: { lower: 1, upper: 5 } }, root),
    {
      path: "$.value",
      operator: "between",
      expected: { lower: 1, upper: 5 },
      observed: 7,
      passed: false,
      reason: "comparison_failed"
    }
  );
});

void test("rejects malformed between bounds and non-numeric observed values", () => {
  assert.equal(
    evaluateAssertion({ path: "$.value", op: "between", value: { lower: 1 } }, { value: 5 }).reason,
    "invalid_expected_value"
  );
  assert.equal(
    evaluateAssertion({ path: "$.value", op: "between", value: [1, 5] }, { value: 5 }).reason,
    "invalid_expected_value"
  );
  assert.equal(
    evaluateAssertion({ path: "$.value", op: "between", value: { lower: 5, upper: 1 } }, { value: 3 })
      .reason,
    "invalid_expected_value"
  );
  assert.equal(
    evaluateAssertion({ path: "$.value", op: "between", value: { lower: 1, upper: 5 } }, { value: "abc" })
      .reason,
    "type_mismatch"
  );
  // A non-numeric *bound* is the expected value's fault, not the observed
  // value's, so it reads as invalid_expected_value even though the observed
  // value here is a number.
  assert.equal(
    evaluateAssertion({ path: "$.value", op: "between", value: { lower: "a", upper: "b" } }, { value: 3 })
      .reason,
    "invalid_expected_value"
  );
});
