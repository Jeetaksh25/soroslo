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

void test("matches the string operators case-sensitively", () => {
  const root = {
    memo: "Payment received",
    type: "transfer",
    issuer: "GABCDEF",
    nested: { text: "Soroban" }
  };

  assert.equal(
    evaluateAssertion({ path: "$.memo", op: "contains", value: "Payment" }, root).passed,
    true
  );
  assert.equal(
    evaluateAssertion({ path: "$.memo", op: "contains", value: "payment" }, root).passed,
    false
  );
  assert.equal(
    evaluateAssertion({ path: "$.type", op: "starts_with", value: "trans" }, root).passed,
    true
  );
  assert.equal(
    evaluateAssertion({ path: "$.type", op: "starts_with", value: "Trans" }, root).passed,
    false
  );
  assert.equal(
    evaluateAssertion({ path: "$.issuer", op: "ends_with", value: "DEF" }, root).passed,
    true
  );
  assert.equal(
    evaluateAssertion({ path: "$.nested.text", op: "contains", value: "roba" }, root).passed,
    true
  );
});

void test("records operator, expected, observed and reason for string operators", () => {
  const root = { memo: "Payment received" };

  assert.deepEqual(
    evaluateAssertion({ path: "$.memo", op: "starts_with", value: "Payment" }, root),
    {
      path: "$.memo",
      operator: "starts_with",
      expected: "Payment",
      observed: "Payment received",
      passed: true,
      reason: "matched"
    }
  );

  assert.deepEqual(evaluateAssertion({ path: "$.memo", op: "ends_with", value: "refund" }, root), {
    path: "$.memo",
    operator: "ends_with",
    expected: "refund",
    observed: "Payment received",
    passed: false,
    reason: "comparison_failed"
  });
});

void test("rejects a non-string observed value with a type mismatch", () => {
  for (const value of [42, true, null, { a: 1 }, [1]]) {
    const result = evaluateAssertion({ path: "$.value", op: "contains", value: "4" }, { value });
    assert.equal(result.passed, false);
    assert.equal(result.reason, "type_mismatch");
    assert.equal(result.observed, value);
  }
});

void test("rejects a non-string expected value as invalid", () => {
  for (const value of [42, true, null, ["a"], { a: 1 }]) {
    const result = evaluateAssertion(
      { path: "$.memo", op: "contains", value },
      { memo: "Payment received" }
    );
    assert.equal(result.passed, false);
    assert.equal(result.reason, "invalid_expected_value");
  }
});

void test("treats an absent path as missing for string operators", () => {
  const result = evaluateAssertion({ path: "$.nope", op: "contains", value: "x" }, {});
  assert.equal(result.passed, false);
  assert.equal(result.reason, "missing_path");
});

void test("the empty expected string is a valid substring and prefix", () => {
  const root = { memo: "Payment received" };

  assert.equal(evaluateAssertion({ path: "$.memo", op: "contains", value: "" }, root).passed, true);
  assert.equal(
    evaluateAssertion({ path: "$.memo", op: "starts_with", value: "" }, root).passed,
    true
  );
  assert.equal(
    evaluateAssertion({ path: "$.memo", op: "ends_with", value: "" }, root).passed,
    true
  );
});
