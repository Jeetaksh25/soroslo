import test from "node:test";
import assert from "node:assert/strict";
import type { SoroSloConfig } from "@soroslo/config";
import { SoroSloStorage } from "@soroslo/storage";
import { buildApi } from "./server.js";

const CONTRACT_ID = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";

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
      checks: [
        {
          id: "health",
          name: "Health",
          network: "testnet",
          every: "5m",
          slo: {
            target: 99,
            window: "1h",
            minEligibleRuns: 1,
            maxObserverErrorRate: 10
          },
          steps: [
            {
              id: "read",
              contract: CONTRACT_ID,
              function: "value",
              args: [],
              assertions: []
            }
          ]
        }
      ]
    }
  ]
};

function seededStorage(): SoroSloStorage {
  const storage = SoroSloStorage.open();
  storage.migrate();
  storage.syncConfiguration(config, "config-a", "2026-09-29T18:00:00.000Z");
  storage.recordRun({
    id: "run-1",
    idempotencyKey: "manual:1",
    checkId: "payments:health",
    startedAt: "2026-09-29T18:00:00.000Z",
    finishedAt: "2026-09-29T18:00:01.000Z",
    state: "pass",
    observedLedger: 123,
    rpcEndpointFingerprint: "rpc123",
    configHash: "config-a",
    steps: []
  });
  return storage;
}

void test("serves operational and service read endpoints", async () => {
  const storage = seededStorage();
  const app = buildApi({ storage, config, configHash: "config-a", version: "0.1.0-dev" });

  try {
    const health = await app.inject({ method: "GET", url: "/healthz" });
    assert.equal(health.statusCode, 200);
    assert.deepEqual(health.json(), { status: "ok" });

    const services = await app.inject({ method: "GET", url: "/api/v1/services" });
    assert.equal(services.statusCode, 200);
    assert.equal(services.json().services[0].id, "payments");

    const check = await app.inject({
      method: "GET",
      url: "/api/v1/checks/payments%3Ahealth"
    });
    assert.equal(check.statusCode, 200);
    assert.equal(check.json().check.lastRunState, "pass");
  } finally {
    await app.close();
    storage.close();
  }
});

void test("returns run details and rolling SLO state", async () => {
  const storage = seededStorage();
  const app = buildApi({ storage, config, configHash: "config-a" });

  try {
    const run = await app.inject({ method: "GET", url: "/api/v1/runs/run-1" });
    assert.equal(run.statusCode, 200);
    assert.equal(run.json().run.observedLedger, 123);

    const slo = await app.inject({
      method: "GET",
      url: "/api/v1/checks/payments%3Ahealth/slo"
    });
    assert.equal(slo.statusCode, 200);
    assert.equal(slo.json().slo.status, "insufficient_data");
  } finally {
    await app.close();
    storage.close();
  }
});

void test("manual run endpoint delegates to the configured runner", async () => {
  const storage = seededStorage();
  let calls = 0;
  const app = buildApi({
    storage,
    config,
    configHash: "config-a",
    manualRun(input) {
      calls += 1;
      assert.equal(input.serviceId, "payments");
      assert.equal(input.check.id, "health");
      assert.match(input.requestId, /^[0-9a-f-]{36}$/);
      return Promise.resolve({
        runId: "manual-run",
        state: "pass",
        incidentEvent: null
      });
    }
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/checks/payments%3Ahealth/run"
    });

    assert.equal(response.statusCode, 202);
    assert.equal(response.json().runId, "manual-run");
    assert.equal(calls, 1);
  } finally {
    await app.close();
    storage.close();
  }
});

void test("invalid list limits return a structured 400", async () => {
  const storage = seededStorage();
  const app = buildApi({ storage, config, configHash: "config-a" });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/checks/payments%3Ahealth/runs?limit=999"
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error, "bad_request");
  } finally {
    await app.close();
    storage.close();
  }
});
