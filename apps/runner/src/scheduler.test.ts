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
    nextFutureSchedule("2026-09-29T18:00:00.000Z", 5 * 60_000, "2026-09-29T18:12:00.000Z"),
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
    assert.equal(storage.getSchedulerState(checkId)?.nextScheduledAt, "2026-09-29T18:10:00.000Z");
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
    assert.equal(storage.getSchedulerState(checkId)?.nextScheduledAt, "2026-09-29T18:15:00.000Z");
  } finally {
    storage.close();
  }
});

void test("jittered checks get distinct first schedules that survive a restart", async () => {
  const storage = SoroSloStorage.open();
  try {
    storage.migrate();
    const jittered: CheckConfig = { ...check, jitter: 0.2 };
    const twoChecks: SoroSloConfig = {
      ...config,
      services: [
        { id: "alpha", name: "Alpha", checks: [jittered] },
        { id: "beta", name: "Beta", checks: [jittered] },
        { id: "gamma", name: "Gamma", checks: [jittered] }
      ]
    };
    storage.syncConfiguration(twoChecks, "config-a");

    const scheduler = new RestartSafeScheduler({
      ownerId: "runner-a",
      store: storage,
      executor() {
        return Promise.resolve();
      }
    });

    const now = new Date("2026-09-29T18:00:00.000Z");
    await scheduler.tick(
      ["alpha", "beta", "gamma"].map((serviceId) => ({
        serviceId,
        check: jittered,
        configHash: "config-a",
        defaultTimeoutMs: 15_000
      })),
      now
    );

    const due = ["alpha", "beta", "gamma"].map(
      (serviceId) => storage.getSchedulerState(qualifiedCheckId(serviceId, "health"))?.nextScheduledAt
    );

    // Every check was scheduled, and the offsets differ: that is the property
    // that stops three same-interval checks from firing together.
    assert.ok(due.every((value) => typeof value === "string"), "every check must be scheduled");
    assert.equal(new Set(due).size, 3, `expected distinct schedules, got ${JSON.stringify(due)}`);

    // Each due time stays inside the unjittered schedule plus the policy window.
    const base = Date.parse("2026-09-29T18:05:00.000Z");
    const cap = Date.parse("2026-09-29T18:05:00.000Z") + 5 * 60_000 * 0.2;
    for (const value of due) {
      const at = Date.parse(value!);
      assert.ok(at >= base, `a jittered run must not be earlier than the anchor: ${value}`);
      assert.ok(at <= cap, `a jittered run must stay inside the policy window: ${value}`);
    }

    // A restart must reproduce the same first schedules, not reshuffle them.
    const second = SoroSloStorage.open();
    try {
      second.migrate();
      second.syncConfiguration(twoChecks, "config-a");
      const restarted = new RestartSafeScheduler({
        ownerId: "runner-b",
        store: second,
        executor() {
          return Promise.resolve();
        }
      });
      await restarted.tick(
        ["alpha", "beta", "gamma"].map((serviceId) => ({
          serviceId,
          check: jittered,
          configHash: "config-a",
          defaultTimeoutMs: 15_000
        })),
        now
      );
      const repeated = ["alpha", "beta", "gamma"].map(
        (serviceId) =>
          second.getSchedulerState(qualifiedCheckId(serviceId, "health"))?.nextScheduledAt
      );
      assert.deepEqual(repeated, due, "a restart must reproduce the same jittered schedules");
    } finally {
      second.close();
    }
  } finally {
    storage.close();
  }
});

void test("a check without jitter keeps its exact unjittered schedule", async () => {
  const storage = SoroSloStorage.open();
  try {
    storage.migrate();
    storage.syncConfiguration(config, "config-a");

    const scheduler = new RestartSafeScheduler({
      ownerId: "runner-a",
      store: storage,
      executor() {
        return Promise.resolve();
      }
    });

    await scheduler.tick(
      [{ serviceId: "payments", check, configHash: "config-a", defaultTimeoutMs: 15_000 }],
      new Date("2026-09-29T18:00:00.000Z")
    );

    // The default path must be byte-for-byte what it was before jitter existed.
    assert.equal(
      storage.getSchedulerState(qualifiedCheckId("payments", "health"))?.nextScheduledAt,
      "2026-09-29T18:05:00.000Z"
    );
  } finally {
    storage.close();
  }
});
