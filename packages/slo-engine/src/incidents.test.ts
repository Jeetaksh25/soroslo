import test from "node:test";
import assert from "node:assert/strict";
import { advanceIncidentState, initialIncidentRuntimeState } from "./incidents.js";

void test("opens after the configured consecutive service failures", () => {
  const first = advanceIncidentState(initialIncidentRuntimeState(), "service_fail", {
    failuresToOpen: 2,
    passesToRecover: 2
  });
  assert.equal(first.next.state, "pending_failure");
  assert.equal(first.event, null);

  const second = advanceIncidentState(first.next, "service_fail", {
    failuresToOpen: 2,
    passesToRecover: 2
  });
  assert.equal(second.next.state, "incident_open");
  assert.equal(second.event, "opened");
});

void test("observer errors neither open nor recover service incidents", () => {
  const open = {
    state: "incident_open" as const,
    consecutiveFailures: 2,
    consecutivePasses: 0
  };

  const transition = advanceIncidentState(open, "observer_error");
  assert.deepEqual(transition.next, open);
  assert.equal(transition.event, null);
});

void test("recovers after consecutive passing runs", () => {
  const open = {
    state: "incident_open" as const,
    consecutiveFailures: 3,
    consecutivePasses: 0
  };

  const first = advanceIncidentState(open, "pass", {
    failuresToOpen: 2,
    passesToRecover: 2
  });
  assert.equal(first.next.state, "pending_recovery");

  const second = advanceIncidentState(first.next, "pass", {
    failuresToOpen: 2,
    passesToRecover: 2
  });
  assert.equal(second.next.state, "healthy");
  assert.equal(second.event, "recovered");
});
