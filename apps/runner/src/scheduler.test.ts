import test from "node:test";
import assert from "node:assert/strict";
import type { CheckConfig, SoroSloConfig } from "@soroslo/config";
import { SoroSloStorage, qualifiedCheckId } from "@soroslo/storage";
import {
  RestartSafeScheduler,
  nextFutureSchedule,
  scheduledRunIdempotencyKey
} from "./scheduler.js";

const CONTRACT_ID = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";

const check: CheckConfig = {
  id: "health",
  name: "Health",
  network: "testnet",
  every: "5m",
  timeout: "10s",
  steps: [
    {
      id: "read",
      contract: CONTRACT_ID,
      function: "value",
      args: [],
      assertions: []
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

void test("generates stable scheduled-run idempotency keys", () => {
  const first = scheduledRunIdempotencyKey(
    "payments:health",
    "2026-09-29T18:05:00.000Z",
    "config-a"
  );
  const second = scheduledRunIdempotencyKey(
    "payments:health",
    "2026-09-29T18:05:00.000Z",
    "config-a"
  );

  assert.equal(first, second);
  assert.match(first, /^scheduled:[0-9a-f]{64}$/);
});

void test("advances a missed schedule to the next future interval", () => {
  assert.equal(
    nextFutureSchedule(
      "2026-09-29T18:00:00.000Z",
      5 * 60_000,
      "2026-09-29T18:12:00.000Z"
    ),
    "2026-09-29T18:15:00.000Z"
  );
});

void test("executes a due check once and advances persisted scheduler state", async () => {
  const storage = SoroSloStorage.open();
  try {
    storage.migrate();
    storage.syncConfiguration(config, "config-a");
    const checkId = qualifiedCheckId("payments", "health");
    storage.ensureSchedulerState(checkId, "2026-09-29T18:05:00.000Z");

    const contexts: string[] = [];
    const scheduler = new RestartSafeScheduler({
      ownerId: "runner-a",
      store: storage,
      executor(context) {
        contexts.push(context.idempotencyKey);
        return Promise.resolve();
      }
    });

    const results = await scheduler.tick(
      [
        {
          serviceId: "payments",
          check,
          configHash: "config-a",
          defaultTimeoutMs: 15_000
        }
      ],
      new Date("2026-09-29T18:05:01.000Z")
    );

    assert.equal(results[0]?.outcome, "executed");
    assert.equal(contexts.length, 1);
    assert.equal(
      storage.getSchedulerState(checkId)?.nextScheduledAt,
      "2026-09-29T18:10:00.000Z"
    );
  } finally {
    storage.close();
  }
});

void test("skips stale missed intervals instead of replaying them", async () => {
  const storage = SoroSloStorage.open();
  try {
    storage.migrate();
    storage.syncConfiguration(config, "config-a");
    const checkId = qualifiedCheckId("payments", "health");
    storage.ensureSchedulerState(checkId, "2026-09-29T18:00:00.000Z");

    let calls = 0;
    const scheduler = new RestartSafeScheduler({
      ownerId: "runner-a",
      store: storage,
      executor() {
        calls += 1;
        return Promise.resolve();
      }
    });

    const results = await scheduler.tick(
      [
        {
          serviceId: "payments",
          check,
          configHash: "config-a",
          defaultTimeoutMs: 15_000
        }
      ],
      new Date("2026-09-29T18:12:00.000Z")
    );

    assert.equal(results[0]?.outcome, "missed_skipped");
    assert.equal(calls, 0);
    assert.equal(
      storage.getSchedulerState(checkId)?.nextScheduledAt,
      "2026-09-29T18:15:00.000Z"
    );
  } finally {
    storage.close();
  }
});
