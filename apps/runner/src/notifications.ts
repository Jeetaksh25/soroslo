import {
  createIncidentNotificationEvent,
  deliverWebhookEvent,
  type NotificationDeliveryResult
} from "@soroslo/alerts";
import type { CheckConfig, SoroSloConfig } from "@soroslo/config";
import { qualifiedCheckId, type SoroSloStorage } from "@soroslo/storage";
import type { PersistedExecutionResult } from "./execution.js";

export async function notifyExecutionTransition(options: {
  storage: SoroSloStorage;
  config: SoroSloConfig;
  serviceId: string;
  check: CheckConfig;
  execution: PersistedExecutionResult;
  dashboardUrl?: string;
  allowPrivateNetwork?: boolean;
}): Promise<NotificationDeliveryResult[]> {
  const eventType = options.execution.incidentEvent;
  const incidentId = options.execution.transitionIncidentId;
  const channels = options.config.notifications?.webhooks ?? [];

  if (!eventType || !incidentId || channels.length === 0) return [];

  const service = options.config.services.find(
    (candidate) => candidate.id === options.serviceId
  );
  if (!service) {
    throw new Error(`Unknown service '${options.serviceId}' for notification`);
  }

  const event = createIncidentNotificationEvent({
    eventType,
    incidentId,
    runId: options.execution.runId,
    serviceId: service.id,
    serviceName: service.name,
    checkId: qualifiedCheckId(service.id, options.check.id),
    checkName: options.check.name,
    currentState:
      eventType === "opened" ? "incident_open" : "healthy",
    observedSli: options.execution.slo?.observedSli ?? null,
    sloStatus: options.execution.slo?.status ?? null,
    timestamp: options.execution.finishedAt,
    ...(options.dashboardUrl !== undefined
      ? { dashboardUrl: options.dashboardUrl }
      : {})
  });

  return deliverWebhookEvent({
    event,
    channels,
    ledger: options.storage,
    ...(options.allowPrivateNetwork !== undefined
      ? { allowPrivateNetwork: options.allowPrivateNetwork }
      : {})
  });
}
