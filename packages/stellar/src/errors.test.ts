import test from "node:test";
import assert from "node:assert/strict";
import { classifyObserverError } from "./errors.js";
import { deterministicRpcFixtures } from "./fixtures.js";

void test("classifies rate limiting as retryable", () => {
  const error = classifyObserverError(deterministicRpcFixtures.rateLimitedError);
  assert.equal(error.code, "rate_limited");
  assert.equal(error.retryable, true);
  assert.equal(error.status, 429);
});

void test("classifies upstream 5xx as retryable", () => {
  const error = classifyObserverError(deterministicRpcFixtures.unavailableError);
  assert.equal(error.code, "upstream_unavailable");
  assert.equal(error.retryable, true);
  assert.equal(error.status, 503);
});

void test("classifies timeout codes as retryable", () => {
  const error = classifyObserverError(deterministicRpcFixtures.timeoutError);
  assert.equal(error.code, "timeout");
  assert.equal(error.retryable, true);
});
