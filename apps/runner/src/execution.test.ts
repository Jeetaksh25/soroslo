import test from "node:test";
import assert from "node:assert/strict";
import type { CheckConfig, SoroSloConfig } from "@soroslo/config";
import type { StepInvoker } from "@soroslo/probe-engine";
import { SoroSloStorage, qualifiedCheckId } from "@soroslo/storage";
import { runCheckAndPersist } from "./execution.js";

const CONTRACT_ID = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";

const check: CheckConfig = {
  id: "health",
  name: "Health",
  network: "testnet",
  every: "5m",
  incidentPolicy: {
    failuresToOpen: 2,
    passesToRecover: 2
  },
  slo: {
    target: 90,
    window: "1h",
    minEligibleRuns: 1,
    maxObserverErrorRate: 50
  },
  steps: [
    {
      id: "read",
      contract: CONTRACT_ID,
      function: "value",
      args: [],
      assertions: [{ path: "$", op: "gt", value: "0" }]
    }
  ]
};

const config: SoroSloConfig = {
  version: 1,
  runtime: {
    timezone: "UTC",
    dataDir: "./.soroslo",
    defaultTimeout: "15s"
  },
  networks: {
    testnet: { preset: "testnet" }
  },
  services: [
    {
      id: "payments",
      name: "Payments",
      checks: [check]
    }
  ]
};

function clock(values: readonly string[]): () => Date {
  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)]!;
    index += 1;
    return new Date(value);
  };
}

function invokerFor(value: string): StepInvoker {
  return {
    invoke() {
      return Promise.resolve({
        status: "success",
        latestLedger: 123,
        endpointFingerprint: "rpc123",
        elapsedMs: 5,
        diagnosticEventCount: 0,
        result: value
      });
    }
  };
}

void test("persists runs, opens an incident, computes SLO, then recovers", async () => {
  const storage = SoroSloStorage.open();
  try {
    storage.migrate();
    storage.syncConfiguration(config, "config-a");

    const failure1 = await runCheckAndPersist({
      storage,
      serviceId: "payments",
      check,
      configHash: "config-a",
      invoker: invokerFor("0"),
      idempotencyKey: "manual:1",
      now: clock([
        "2026-09-29T18:00:00.000Z",
        "2026-09-29T18:00:01.000Z"
      ])
    });
    assert.equal(failure1.result.state, "service_fail");
    assert.equal(failure1.incidentEvent, null);

    const failure2 = await runCheckAndPersist({
      storage,
      serviceId: "payments",
      check,
      configHash: "config-a",
      invoker: invokerFor("0"),
      idempotencyKey: "manual:2",
      now: clock([
        "2026-09-29T18:05:00.000Z",
        "2026-09-29T18:05:01.000Z"
      ])
    });
    assert.equal(failure2.incidentEvent, "opened");
    assert.ok(failure2.incidentId);
    assert.equal(failure2.slo?.status, "breached");

    const pass1 = await runCheckAndPersist({
      storage,
      serviceId: "payments",
      check,
      configHash: "config-a",
      invoker: invokerFor("1"),
      idempotencyKey: "manual:3",
      now: clock([
        "2026-09-29T18:10:00.000Z",
        "2026-09-29T18:10:01.000Z"
      ])
    });
    assert.equal(pass1.incidentEvent, null);

    const pass2 = await runCheckAndPersist({
      storage,
      serviceId: "payments",
      check,
      configHash: "config-a",
      invoker: invokerFor("1"),
      idempotencyKey: "manual:4",
      now: clock([
        "2026-09-29T18:15:00.000Z",
        "2026-09-29T18:15:01.000Z"
      ])
    });
    assert.equal(pass2.incidentEvent, "recovered");

    const runtime = storage.getIncidentRuntime(
      qualifiedCheckId("payments", "health")
    );
    assert.equal(runtime.state, "healthy");
    assert.equal(runtime.activeIncidentId, null);
  } finally {
    storage.close();
  }
});
