import type { RunState } from "@soroslo/shared";
import type { IncidentRuntimeState } from "@soroslo/slo-engine";

export interface PersistedAssertionInput {
  path: string;
  operator: string;
  expected?: unknown;
  observed?: unknown;
  passed: boolean;
  reason: string;
}

export interface PersistedStepInput {
  stepId: string;
  ordinal: number;
  state: RunState;
  contractId: string;
  functionName: string;
  result?: unknown;
  rawReturnXdr?: string;
  minResourceFee?: string;
  elapsedMs?: number;
  evidence?: unknown;
  failureKind?: string;
  failureMessage?: string;
  assertions: readonly PersistedAssertionInput[];
}

export interface PersistedRunInput {
  id: string;
  idempotencyKey: string;
  checkId: string;
  scheduledAt?: string;
  startedAt: string;
  finishedAt: string;
  state: RunState;
  observedLedger?: number;
  rpcEndpointFingerprint?: string;
  configHash: string;
  observerErrorCode?: string;
  observerErrorMessage?: string;
  steps: readonly PersistedStepInput[];
}

export interface StoredReliabilityRun {
  id: string;
  state: RunState;
  finishedAt: string;
}

export interface SchedulerState {
  checkId: string;
  lastScheduledAt: string | null;
  nextScheduledAt: string;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
}

export interface StoredIncidentRuntime extends IncidentRuntimeState {
  activeIncidentId: string | null;
}

export interface StoredIncident {
  id: string;
  checkId: string;
  openedAt: string;
  recoveredAt: string | null;
  state: "open" | "recovered";
  openingRunId: string;
  recoveryRunId: string | null;
  failureCount: number;
  summary: string;
}
