import test from "node:test";
import assert from "node:assert/strict";
import {
  createIncidentNotificationEvent,
  deliverWebhookEvent,
  incidentEventId,
  signWebhookBody,
  type NotificationAttemptInput,
  type NotificationClaimInput,
  type NotificationLedger
} from "./index.js";

class MemoryLedger implements NotificationLedger {
  readonly events = new Map<string, "delivering" | "delivered" | "failed">();
  readonly attempts: NotificationAttemptInput[] = [];

  claimNotification(input: NotificationClaimInput): boolean {
    const key = `${input.eventId}:${input.channelId}`;
    const state = this.events.get(key);
    if (state === "delivered" || state === "delivering") return false;
    this.events.set(key, "delivering");
    return true;
  }

  recordNotificationAttempt(input: NotificationAttemptInput): void {
    this.attempts.push(input);
  }

  completeNotification(input: {
    eventId: string;
    channelId: string;
    state: "delivered" | "failed";
  }): void {
    this.events.set(`${input.eventId}:${input.channelId}`, input.state);
  }
}

function sampleEvent() {
  return createIncidentNotificationEvent({
    eventType: "opened",
    incidentId: "incident-1",
    runId: "run-2",
    serviceId: "payments",
    serviceName: "Payments",
    checkId: "payments:health",
    checkName: "Health",
    currentState: "incident_open",
    observedSli: 95,
    sloStatus: "breached",
    timestamp: "2026-09-29T18:00:00.000Z",
    dashboardUrl: "https://status.example.test"
  });
}

void test("creates deterministic event IDs and webhook signatures", () => {
  assert.equal(incidentEventId("incident-1", "opened"), incidentEventId("incident-1", "opened"));
  assert.notEqual(
    incidentEventId("incident-1", "opened"),
    incidentEventId("incident-1", "recovered")
  );

  assert.equal(
    signWebhookBody("secret", "2026-09-29T18:00:00.000Z", "{}"),
    signWebhookBody("secret", "2026-09-29T18:00:00.000Z", "{}")
  );
  assert.match(
    signWebhookBody("secret", "2026-09-29T18:00:00.000Z", "{}"),
    /^sha256=[0-9a-f]{64}$/
  );
});

void test("retries retryable webhook failures and records attempts", async () => {
  const ledger = new MemoryLedger();
  let calls = 0;
  const fetchImpl: typeof fetch = async (_input, init) => {
    calls += 1;
    assert.equal(init?.redirect, "manual");
    const headers = new Headers(init?.headers);
    assert.match(headers.get("x-soroslo-signature") ?? "", /^sha256=[0-9a-f]{64}$/);
    assert.equal(headers.get("x-soroslo-event-id"), sampleEvent().eventId);
    return new Response(calls < 3 ? "" : null, { status: calls < 3 ? 503 : 204 });
  };

  const result = await deliverWebhookEvent({
    event: sampleEvent(),
    channels: [{ id: "ops", url: "https://127.0.0.1/hook", secret: "secret" }],
    ledger,
    fetchImpl,
    allowPrivateNetwork: true,
    maxAttempts: 3,
    baseDelayMs: 1,
    maxDelayMs: 1,
    random: () => 0.5,
    sleepImpl: () => Promise.resolve()
  });

  assert.equal(calls, 3);
  assert.equal(result[0]?.state, "delivered");
  assert.equal(result[0]?.attempts, 3);
  assert.deepEqual(
    ledger.attempts.map((attempt) => attempt.state),
    ["retrying", "retrying", "delivered"]
  );
});

void test("deduplicates an event after successful delivery", async () => {
  const ledger = new MemoryLedger();
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return new Response(null, { status: 204 });
  };

  const options = {
    event: sampleEvent(),
    channels: [{ id: "ops", url: "https://127.0.0.1/hook", secret: "secret" }],
    ledger,
    fetchImpl,
    allowPrivateNetwork: true,
    sleepImpl: () => Promise.resolve()
  } as const;

  const first = await deliverWebhookEvent(options);
  const second = await deliverWebhookEvent(options);

  assert.equal(first[0]?.state, "delivered");
  assert.equal(second[0]?.state, "deduplicated");
  assert.equal(calls, 1);
});

void test("does not retry deterministic 4xx responses", async () => {
  const ledger = new MemoryLedger();
  let calls = 0;

  const result = await deliverWebhookEvent({
    event: sampleEvent(),
    channels: [{ id: "ops", url: "https://127.0.0.1/hook", secret: "secret" }],
    ledger,
    fetchImpl: async () => {
      calls += 1;
      return new Response("", { status: 400 });
    },
    allowPrivateNetwork: true,
    maxAttempts: 3,
    sleepImpl: () => Promise.resolve()
  });

  assert.equal(calls, 1);
  assert.equal(result[0]?.state, "failed");
  assert.equal(result[0]?.responseCode, 400);
});
