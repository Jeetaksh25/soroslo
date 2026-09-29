import { createHash } from "node:crypto";
import type { IncidentNotificationEvent, IncidentNotificationType } from "./types.js";

export function incidentEventId(
  incidentId: string,
  eventType: IncidentNotificationType
): string {
  return createHash("sha256")
    .update("soroslo:incident:")
    .update(incidentId)
    .update(":")
    .update(eventType)
    .digest("hex");
}

export function createIncidentNotificationEvent(input: {
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
}): IncidentNotificationEvent {
  return {
    schemaVersion: 1,
    eventId: incidentEventId(input.incidentId, input.eventType),
    eventType: input.eventType,
    incidentId: input.incidentId,
    runId: input.runId,
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    checkId: input.checkId,
    checkName: input.checkName,
    currentState: input.currentState,
    observedSli: input.observedSli,
    sloStatus: input.sloStatus,
    timestamp: input.timestamp,
    ...(input.dashboardUrl !== undefined ? { dashboardUrl: input.dashboardUrl } : {})
  };
}
