export type IncidentNotificationType = "opened" | "updated" | "recovered";

export interface IncidentNotificationEvent {
  schemaVersion: 1;
  eventId: string;
  eventType: IncidentNotificationType;
  incidentId: string;
  runId: string;
  serviceId: string;
  serviceName: string;
  checkId: string;
  checkName: string;
  currentState: string;
  observedSli: number | null;
  sloStatus: string | null;
  timestamp: string;
  dashboardUrl?: string;
}

export interface WebhookChannel {
  id: string;
  url: string;
  secret: string;
}

export type NotificationDeliveryState = "delivered" | "deduplicated" | "failed";

export interface NotificationDeliveryResult {
  channelId: string;
  eventId: string;
  state: NotificationDeliveryState;
  attempts: number;
  responseCode: number | null;
  errorClass: string | null;
}

export interface NotificationClaimInput {
  eventId: string;
  channelId: string;
  incidentId: string;
  payloadHash: string;
  claimedAt: string;
  staleBefore: string;
}

export interface NotificationAttemptInput {
  id: string;
  eventId: string;
  incidentId: string;
  channelId: string;
  eventType: string;
  payloadHash: string;
  attempt: number;
  startedAt: string;
  finishedAt: string;
  state: "delivered" | "retrying" | "failed";
  responseCode?: number;
  errorClass?: string;
}

export interface NotificationLedger {
  claimNotification(input: NotificationClaimInput): boolean;
  recordNotificationAttempt(input: NotificationAttemptInput): void;
  completeNotification(input: {
    eventId: string;
    channelId: string;
    state: "delivered" | "failed";
    finishedAt: string;
    lastError?: string;
  }): void;
}
