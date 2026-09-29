export const apiBaseUrl =
  process.env.SOROSLO_API_URL ?? "http://127.0.0.1:3001";

export interface ServiceSummary {
  id: string;
  name: string;
  configHash: string;
  createdAt: string;
  updatedAt: string;
  checkCount: number;
  enabledCheckCount: number;
}

export interface CheckSummary {
  id: string;
  localId: string;
  serviceId: string;
  name: string;
  network: string;
  schedule: string;
  configHash: string;
  enabled: boolean;
  operationalState: string;
  activeIncidentId: string | null;
  lastRunId: string | null;
  lastRunState: string | null;
  lastRunFinishedAt: string | null;
}

export interface RunSummary {
  id: string;
  checkId: string;
  scheduledAt: string | null;
  startedAt: string;
  finishedAt: string;
  state: string;
  observedLedger: number | null;
  rpcEndpointFingerprint: string | null;
  configHash: string;
  observerErrorCode: string | null;
  observerErrorMessage: string | null;
}

export interface AssertionDetail {
  id: string;
  ordinal: number;
  path: string;
  operator: string;
  expected: unknown;
  observed: unknown;
  passed: boolean;
  reason: string;
}

export interface StepResultDetail {
  id: string;
  stepId: string;
  ordinal: number;
  state: string;
  contractId: string;
  functionName: string;
  result: unknown;
  rawReturnXdr: string | null;
  minResourceFee: string | null;
  elapsedMs: number | null;
  evidence: unknown;
  failureKind: string | null;
  failureMessage: string | null;
  assertions: AssertionDetail[];
}

export interface RunDetail extends RunSummary {
  steps: StepResultDetail[];
}

export interface IncidentSummary {
  id: string;
  checkId: string;
  openedAt: string;
  recoveredAt: string | null;
  state: "open" | "recovered";
  openingRunId: string;
  recoveryRunId: string | null;
  failureCount: number;
  summary: string;
  checkName?: string;
  serviceId?: string;
  serviceName?: string;
}


export interface NotificationAttemptSummary {
  id: string;
  incidentId: string;
  channelId: string;
  eventType: string;
  attempt: number;
  startedAt: string;
  finishedAt: string | null;
  state: string;
  responseCode: number | null;
  errorClass: string | null;
}

export interface SloSnapshot {
  windowStart: string;
  windowEnd: string;
  target: number;
  observedSli: number | null;
  eligibleRuns: number;
  passingRuns: number;
  serviceFailures: number;
  observerErrors: number;
  cancelledRuns: number;
  dataCoverage: number | null;
  observerErrorRate: number | null;
  errorBudgetConsumptionRatio: number | null;
  status: string;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`SoroSLO API returned HTTP ${response.status} for ${path}`);
  }

  return (await response.json()) as T;
}

export async function getServices(): Promise<ServiceSummary[]> {
  const data = await getJson<{ services: ServiceSummary[] }>("/api/v1/services");
  return data.services;
}

export async function getService(serviceId: string): Promise<{
  service: ServiceSummary & { checks: CheckSummary[] };
}> {
  return getJson(`/api/v1/services/${encodeURIComponent(serviceId)}`);
}

export async function getCheck(checkId: string): Promise<{
  check: CheckSummary;
  policy: {
    timeout: string;
    incidentPolicy: { failuresToOpen: number; passesToRecover: number };
    slo: unknown;
  } | null;
  recentRuns: RunSummary[];
  incidents: IncidentSummary[];
}> {
  return getJson(`/api/v1/checks/${encodeURIComponent(checkId)}`);
}

export async function getSlo(checkId: string): Promise<SloSnapshot | null> {
  const data = await getJson<{ checkId: string; slo: SloSnapshot | null }>(
    `/api/v1/checks/${encodeURIComponent(checkId)}/slo`
  );
  return data.slo;
}

export async function getRun(runId: string): Promise<RunDetail> {
  const data = await getJson<{ run: RunDetail }>(
    `/api/v1/runs/${encodeURIComponent(runId)}`
  );
  return data.run;
}

export async function getIncidents(): Promise<IncidentSummary[]> {
  const data = await getJson<{ incidents: IncidentSummary[] }>("/api/v1/incidents?limit=200");
  return data.incidents;
}

export async function getIncident(incidentId: string): Promise<{
  incident: IncidentSummary;
  notifications: NotificationAttemptSummary[];
}> {
  return getJson(`/api/v1/incidents/${encodeURIComponent(incidentId)}`);
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(2)}%`;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
