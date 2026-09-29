import { createHash, randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { signWebhookBody } from "./signature.js";
import type {
  IncidentNotificationEvent,
  NotificationDeliveryResult,
  NotificationLedger,
  WebhookChannel
} from "./types.js";
import { assertWebhookTargetAllowed } from "./url-policy.js";

export interface DeliverWebhookOptions {
  event: IncidentNotificationEvent;
  channels: readonly WebhookChannel[];
  ledger: NotificationLedger;
  fetchImpl?: typeof fetch;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  allowPrivateNetwork?: boolean;
  now?: () => Date;
  random?: () => number;
  sleepImpl?: (delayMs: number) => Promise<void>;
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function retryDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  random: () => number
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
  const jitter = 0.75 + random() * 0.5;
  return Math.max(1, Math.round(exponential * jitter));
}

function classifyError(error: unknown): string {
  if (error instanceof DOMException && error.name === "TimeoutError") return "timeout";
  if (error instanceof TypeError) return "transport_error";
  return "internal_error";
}

async function deliverChannel(options: {
  event: IncidentNotificationEvent;
  channel: WebhookChannel;
  ledger: NotificationLedger;
  body: string;
  payloadHash: string;
  fetchImpl: typeof fetch;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
  allowPrivateNetwork?: boolean;
  now: () => Date;
  random: () => number;
  sleepImpl: (delayMs: number) => Promise<void>;
}): Promise<NotificationDeliveryResult> {
  const claimedAt = options.now();
  const staleBefore = new Date(claimedAt.getTime() - Math.max(options.timeoutMs * 2, 60_000));

  const claimed = options.ledger.claimNotification({
    eventId: options.event.eventId,
    channelId: options.channel.id,
    incidentId: options.event.incidentId,
    payloadHash: options.payloadHash,
    claimedAt: claimedAt.toISOString(),
    staleBefore: staleBefore.toISOString()
  });

  if (!claimed) {
    return {
      channelId: options.channel.id,
      eventId: options.event.eventId,
      state: "deduplicated",
      attempts: 0,
      responseCode: null,
      errorClass: null
    };
  }

  let lastResponseCode: number | null = null;
  let lastErrorClass: string | null = null;
  let attempts = 0;

  try {
    await assertWebhookTargetAllowed(options.channel.url, {
      ...(options.allowPrivateNetwork !== undefined
        ? { allowPrivateNetwork: options.allowPrivateNetwork }
        : {})
    });

    for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
      attempts = attempt;
      const startedAt = options.now();
      const timestamp = startedAt.toISOString();
      let state: "delivered" | "retrying" | "failed" = "failed";
      let responseCode: number | undefined;
      let attemptError: string | undefined;

      try {
        const response = await options.fetchImpl(options.channel.url, {
          method: "POST",
          redirect: "manual",
          signal: AbortSignal.timeout(options.timeoutMs),
          headers: {
            "content-type": "application/json",
            "user-agent": "SoroSLO/0.1",
            "x-soroslo-event-id": options.event.eventId,
            "x-soroslo-timestamp": timestamp,
            "x-soroslo-signature": signWebhookBody(options.channel.secret, timestamp, options.body)
          },
          body: options.body
        });

        responseCode = response.status;
        lastResponseCode = response.status;

        if (response.ok) {
          state = "delivered";
        } else if (retryableStatus(response.status) && attempt < options.maxAttempts) {
          state = "retrying";
          attemptError = `http_${response.status}`;
        } else {
          state = "failed";
          attemptError = `http_${response.status}`;
        }
      } catch (error) {
        attemptError = classifyError(error);
        if (attempt < options.maxAttempts) state = "retrying";
        lastErrorClass = attemptError;
      }

      const finishedAt = options.now().toISOString();
      options.ledger.recordNotificationAttempt({
        id: randomUUID(),
        eventId: options.event.eventId,
        incidentId: options.event.incidentId,
        channelId: options.channel.id,
        eventType: options.event.eventType,
        payloadHash: options.payloadHash,
        attempt,
        startedAt: startedAt.toISOString(),
        finishedAt,
        state,
        ...(responseCode !== undefined ? { responseCode } : {}),
        ...(attemptError !== undefined ? { errorClass: attemptError } : {})
      });

      if (state === "delivered") {
        options.ledger.completeNotification({
          eventId: options.event.eventId,
          channelId: options.channel.id,
          state: "delivered",
          finishedAt
        });
        return {
          channelId: options.channel.id,
          eventId: options.event.eventId,
          state: "delivered",
          attempts: attempt,
          responseCode: responseCode ?? null,
          errorClass: null
        };
      }

      lastErrorClass = attemptError ?? lastErrorClass;

      if (state === "retrying") {
        await options.sleepImpl(
          retryDelay(attempt, options.baseDelayMs, options.maxDelayMs, options.random)
        );
        continue;
      }

      break;
    }
  } catch (error) {
    lastErrorClass = error instanceof Error ? error.message : String(error);
  }

  const finishedAt = options.now().toISOString();
  options.ledger.completeNotification({
    eventId: options.event.eventId,
    channelId: options.channel.id,
    state: "failed",
    finishedAt,
    ...(lastErrorClass !== null ? { lastError: lastErrorClass } : {})
  });

  return {
    channelId: options.channel.id,
    eventId: options.event.eventId,
    state: "failed",
    attempts,
    responseCode: lastResponseCode,
    errorClass: lastErrorClass
  };
}

export async function deliverWebhookEvent(
  options: DeliverWebhookOptions
): Promise<NotificationDeliveryResult[]> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 2_000;
  const timeoutMs = options.timeoutMs ?? 10_000;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    throw new RangeError("maxAttempts must be an integer between 1 and 10");
  }

  const body = JSON.stringify(options.event);
  const payloadHash = createHash("sha256").update(body).digest("hex");
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const random = options.random ?? Math.random;
  const sleepImpl = options.sleepImpl ?? (async (delayMs: number) => sleep(delayMs));

  return Promise.all(
    options.channels.map((channel) =>
      deliverChannel({
        event: options.event,
        channel,
        ledger: options.ledger,
        body,
        payloadHash,
        fetchImpl,
        maxAttempts,
        baseDelayMs,
        maxDelayMs,
        timeoutMs,
        ...(options.allowPrivateNetwork !== undefined
          ? { allowPrivateNetwork: options.allowPrivateNetwork }
          : {}),
        now,
        random,
        sleepImpl
      })
    )
  );
}
