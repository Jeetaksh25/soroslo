import { randomUUID } from "node:crypto";
import type { CheckConfig } from "@soroslo/config";
import { executeCheck, type CheckRunResult, type StepInvoker } from "@soroslo/probe-engine";
import { parseDurationMs } from "@soroslo/shared";
import {
  advanceIncidentState,
  calculateSloSnapshot,
  defaultIncidentPolicy,
  type IncidentTransitionEvent,
  type SloSnapshot
} from "@soroslo/slo-engine";
import { SoroSloStorage, qualifiedCheckId, type PersistedRunInput } from "@soroslo/storage";

export interface PersistedExecutionResult {
  runId: string;
  result: CheckRunResult;
  incidentEvent: IncidentTransitionEvent;
  incidentId: string | null;
  slo: SloSnapshot | null;
}

function observerTimeoutResult(checkId: string): CheckRunResult {
  return {
    checkId,
    state: "observer_error",
    steps: [],
    observedLedger: undefined,
    endpointFingerprint: undefined,
    observerErrorCode: "timeout"
  };
}

async function executeWithDeadline(
  check: CheckConfig,
  invoker: StepInvoker,
  timeoutMs: number,
  observedAtMs: number
): Promise<CheckRunResult> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
    throw new RangeError("Check timeout must be at least 1ms");
  }

  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      executeCheck(check, invoker, { observedAtMs }),
      new Promise<CheckRunResult>((resolve) => {
        timer = setTimeout(() => resolve(observerTimeoutResult(check.id)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function persistenceInput(options: {
  runId: string;
  idempotencyKey: string;
  checkId: string;
  check: CheckConfig;
  configHash: string;
  scheduledAt?: string;
  startedAt: string;
  finishedAt: string;
  result: CheckRunResult;
}): PersistedRunInput {
  const lastFailure = [...options.result.steps].reverse().find((step) => step.failure)?.failure;

  return {
    id: options.runId,
    idempotencyKey: options.idempotencyKey,
    checkId: options.checkId,
    ...(options.scheduledAt !== undefined ? { scheduledAt: options.scheduledAt } : {}),
    startedAt: options.startedAt,
    finishedAt: options.finishedAt,
    state: options.result.state,
    ...(options.result.observedLedger !== undefined
      ? { observedLedger: options.result.observedLedger }
      : {}),
    ...(options.result.endpointFingerprint !== undefined
      ? { rpcEndpointFingerprint: options.result.endpointFingerprint }
      : {}),
    configHash: options.configHash,
    ...(options.result.observerErrorCode !== undefined
      ? { observerErrorCode: options.result.observerErrorCode }
      : {}),
    ...(options.result.state === "observer_error"
      ? { observerErrorMessage: lastFailure?.message ?? "Check execution timed out" }
      : {}),
    steps: options.result.steps.map((step) => {
      const configuredStep = options.check.steps[step.ordinal];
      if (!configuredStep) {
        throw new Error(`Missing configured step at ordinal ${step.ordinal}`);
      }

      return {
        stepId: step.stepId,
        ordinal: step.ordinal,
        state: step.state,
        contractId: configuredStep.contract,
        functionName: configuredStep.function,
        ...(step.evidence?.result !== undefined ? { result: step.evidence.result } : {}),
        ...(step.evidence?.rawReturnXdr !== undefined
          ? { rawReturnXdr: step.evidence.rawReturnXdr }
          : {}),
        ...(step.evidence?.minResourceFee !== undefined
          ? { minResourceFee: step.evidence.minResourceFee }
          : {}),
        ...(step.evidence?.elapsedMs !== undefined ? { elapsedMs: step.evidence.elapsedMs } : {}),
        ...(step.evidence !== undefined ? { evidence: step.evidence } : {}),
        ...(step.failure !== undefined
          ? {
              failureKind: step.failure.kind,
              failureMessage: step.failure.message
            }
          : {}),
        assertions: step.assertions.map((assertion) => ({
          path: assertion.path,
          operator: assertion.operator,
          ...(assertion.expected !== undefined ? { expected: assertion.expected } : {}),
          ...(assertion.observed !== undefined ? { observed: assertion.observed } : {}),
          passed: assertion.passed,
          reason: assertion.reason
        }))
      };
    })
  };
}

export async function runCheckAndPersist(options: {
  storage: SoroSloStorage;
  serviceId: string;
  check: CheckConfig;
  configHash: string;
  invoker: StepInvoker;
  idempotencyKey: string;
  scheduledAt?: string;
  timeoutMs?: number;
  now?: () => Date;
}): Promise<PersistedExecutionResult> {
  const now = options.now ?? (() => new Date());
  const started = now();
  const timeoutMs =
    options.timeoutMs ?? (options.check.timeout ? parseDurationMs(options.check.timeout) : 15_000);
  const runId = randomUUID();

  const result = await executeWithDeadline(
    options.check,
    options.invoker,
    timeoutMs,
    started.getTime()
  );
  const finished = now();
  const checkId = qualifiedCheckId(options.serviceId, options.check.id);

  const stored = options.storage.recordRun(
    persistenceInput({
      runId,
      idempotencyKey: options.idempotencyKey,
      checkId,
      check: options.check,
      configHash: options.configHash,
      ...(options.scheduledAt !== undefined ? { scheduledAt: options.scheduledAt } : {}),
      startedAt: started.toISOString(),
      finishedAt: finished.toISOString(),
      result
    })
  );

  if (!stored) {
    throw new Error(`Run idempotency key already exists: ${options.idempotencyKey}`);
  }

  const runtime = options.storage.getIncidentRuntime(checkId);
  const policy = options.check.incidentPolicy ?? defaultIncidentPolicy;
  const transition = advanceIncidentState(runtime, result.state, policy);

  let activeIncidentId = runtime.activeIncidentId;
  if (transition.event === "opened") {
    activeIncidentId = randomUUID();
    options.storage.openIncident({
      id: activeIncidentId,
      checkId,
      openedAt: finished.toISOString(),
      openingRunId: runId,
      failureCount: transition.next.consecutiveFailures,
      summary: `${options.check.name} failed ${transition.next.consecutiveFailures} consecutive runs`
    });
  } else if (transition.event === "recovered" && activeIncidentId) {
    options.storage.recoverIncident({
      id: activeIncidentId,
      recoveredAt: finished.toISOString(),
      recoveryRunId: runId
    });
    activeIncidentId = null;
  }

  options.storage.saveIncidentRuntime(
    checkId,
    transition.next,
    activeIncidentId,
    finished.toISOString()
  );

  let slo: SloSnapshot | null = null;
  if (options.check.slo) {
    const since = new Date(
      finished.getTime() - parseDurationMs(options.check.slo.window)
    ).toISOString();
    const runs = options.storage.listReliabilityRuns(checkId, since, finished.toISOString());
    slo = calculateSloSnapshot(runs, options.check.slo, { now: finished });
  }

  return {
    runId,
    result,
    incidentEvent: transition.event,
    incidentId: activeIncidentId,
    slo
  };
}
