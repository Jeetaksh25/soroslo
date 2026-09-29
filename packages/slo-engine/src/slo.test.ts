import test from "node:test";
import assert from "node:assert/strict";
import { calculateSloSnapshot } from "./slo.js";

const now = new Date("2026-09-29T18:00:00.000Z");

void test("calculates a run-based SLI and error budget", () => {
  const snapshot = calculateSloSnapshot(
    [
      { state: "pass", finishedAt: "2026-09-29T17:55:00.000Z" },
      { state: "pass", finishedAt: "2026-09-29T17:50:00.000Z" },
      { state: "service_fail", finishedAt: "2026-09-29T17:45:00.000Z" },
      { state: "observer_error", finishedAt: "2026-09-29T17:40:00.000Z" }
    ],
    {
      target: 90,
      window: "1h",
      minEligibleRuns: 3,
      maxObserverErrorRate: 30
    },
    { now }
  );

  assert.equal(snapshot.eligibleRuns, 3);
  assert.equal(snapshot.passingRuns, 2);
  assert.equal(snapshot.serviceFailures, 1);
  assert.equal(snapshot.observerErrors, 1);
  assert.equal(snapshot.observedSli, (2 / 3) * 100);
  assert.equal(snapshot.dataCoverage, 75);
  assert.equal(snapshot.observerErrorRate, 25);
  assert.equal(snapshot.status, "breached");
  assert.ok(snapshot.errorBudgetConsumptionRatio !== null);
  assert.ok(snapshot.errorBudgetConsumptionRatio > 3);
});

void test("observer errors can make an SLO insufficient even with passing eligible runs", () => {
  const snapshot = calculateSloSnapshot(
    [
      { state: "pass", finishedAt: "2026-09-29T17:59:00.000Z" },
      { state: "observer_error", finishedAt: "2026-09-29T17:58:00.000Z" }
    ],
    {
      target: 99,
      window: "1h",
      minEligibleRuns: 1,
      maxObserverErrorRate: 10
    },
    { now }
  );

  assert.equal(snapshot.observedSli, 100);
  assert.equal(snapshot.observerErrorRate, 50);
  assert.equal(snapshot.status, "insufficient_data");
});

void test("runs outside the rolling window do not count", () => {
  const snapshot = calculateSloSnapshot(
    [
      { state: "service_fail", finishedAt: "2026-09-28T00:00:00.000Z" },
      { state: "pass", finishedAt: "2026-09-29T17:59:00.000Z" }
    ],
    {
      target: 99,
      window: "1h",
      minEligibleRuns: 1,
      maxObserverErrorRate: 10
    },
    { now }
  );

  assert.equal(snapshot.eligibleRuns, 1);
  assert.equal(snapshot.observedSli, 100);
  assert.equal(snapshot.status, "met");
});
