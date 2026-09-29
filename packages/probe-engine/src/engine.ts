import { evaluateAssertions, type AssertionResult } from "@soroslo/assertions";
import type { CheckConfig, StepConfig } from "@soroslo/config";
import { parseDurationMs, type RunState } from "@soroslo/shared";
import {
  classifyObserverError,
  simulateInvocation,
  type ObserverErrorCode,
  type SimulationEvidence,
  type StellarRpcClient
} from "@soroslo/stellar";
import type { xdr } from "@stellar/stellar-sdk";
import {
  ReferenceResolutionError,
  resolveArguments,
  type CompletedStepValue
} from "./arguments.js";

export interface StepInvocation {
  contractId: string;
  functionName: string;
  args: xdr.ScVal[];
  timeoutSeconds: number | undefined;
}

export interface StepInvoker {
  invoke(input: StepInvocation): Promise<SimulationEvidence>;
}

export type StepFailureKind =
  | "argument_resolution_failed"
  | "argument_type_mismatch"
  | "simulation_error"
  | "restore_required"
  | "assertion_failed"
  | "observer_error";

export interface StepFailure {
  kind: StepFailureKind;
  message: string;
}

export interface StepExecutionResult {
  stepId: string;
  ordinal: number;
  state: Exclude<RunState, "cancelled">;
  evidence: SimulationEvidence | undefined;
  assertions: AssertionResult[];
  failure: StepFailure | undefined;
  observerErrorCode: ObserverErrorCode | undefined;
}

export interface CheckRunResult {
  checkId: string;
  state: Exclude<RunState, "cancelled">;
  steps: StepExecutionResult[];
  observedLedger: number | undefined;
  endpointFingerprint: string | undefined;
  observerErrorCode: ObserverErrorCode | undefined;
}

function timeoutSeconds(check: CheckConfig): number | undefined {
  if (!check.timeout) return undefined;
  return Math.max(1, Math.ceil(parseDurationMs(check.timeout) / 1_000));
}

function serviceFailure(
  step: StepConfig,
  ordinal: number,
  kind: StepFailureKind,
  message: string,
  evidence?: SimulationEvidence,
  assertions: AssertionResult[] = []
): StepExecutionResult {
  return {
    stepId: step.id,
    ordinal,
    state: "service_fail",
    evidence,
    assertions,
    failure: { kind, message },
    observerErrorCode: undefined
  };
}

function runFromSteps(checkId: string, steps: StepExecutionResult[]): CheckRunResult {
  const lastEvidence = [...steps].reverse().find((step) => step.evidence)?.evidence;
  const finalStep = steps.at(-1);

  return {
    checkId,
    state: finalStep?.state ?? "observer_error",
    steps,
    observedLedger: lastEvidence?.latestLedger,
    endpointFingerprint: lastEvidence?.endpointFingerprint,
    observerErrorCode: finalStep?.observerErrorCode
  };
}

async function executeStep(
  step: StepConfig,
  ordinal: number,
  check: CheckConfig,
  completedSteps: Map<string, CompletedStepValue>,
  invoker: StepInvoker,
  observedAtMs: number
): Promise<StepExecutionResult> {
  let args: xdr.ScVal[];

  try {
    args = resolveArguments(step.args, completedSteps);
  } catch (error) {
    if (error instanceof ReferenceResolutionError) {
      return serviceFailure(step, ordinal, "argument_resolution_failed", error.message);
    }

    return serviceFailure(
      step,
      ordinal,
      "argument_type_mismatch",
      error instanceof Error ? error.message : String(error)
    );
  }

  let evidence: SimulationEvidence;
  try {
    evidence = await invoker.invoke({
      contractId: step.contract,
      functionName: step.function,
      args,
      timeoutSeconds: timeoutSeconds(check)
    });
  } catch (error) {
    const observerError = classifyObserverError(error);
    return {
      stepId: step.id,
      ordinal,
      state: "observer_error",
      evidence: undefined,
      assertions: [],
      failure: {
        kind: "observer_error",
        message: observerError.message
      },
      observerErrorCode: observerError.code
    };
  }

  if (evidence.status === "simulation_error") {
    return serviceFailure(
      step,
      ordinal,
      "simulation_error",
      evidence.error ?? "Soroban simulation returned an application error",
      evidence
    );
  }

  if (evidence.status === "restore_required") {
    return serviceFailure(
      step,
      ordinal,
      "restore_required",
      "Soroban simulation requires state restoration; SoroSLO v0.1 is read-only",
      evidence
    );
  }

  const assertionResults = evaluateAssertions(step.assertions, evidence.result, {
    observedAtMs
  });
  const failedAssertion = assertionResults.find((assertion) => !assertion.passed);

  if (failedAssertion) {
    return serviceFailure(
      step,
      ordinal,
      "assertion_failed",
      `Assertion ${failedAssertion.path} ${failedAssertion.operator} failed (${failedAssertion.reason})`,
      evidence,
      assertionResults
    );
  }

  completedSteps.set(step.id, { result: evidence.result });

  return {
    stepId: step.id,
    ordinal,
    state: "pass",
    evidence,
    assertions: assertionResults,
    failure: undefined,
    observerErrorCode: undefined
  };
}

export async function executeCheck(
  check: CheckConfig,
  invoker: StepInvoker,
  options: { observedAtMs?: number } = {}
): Promise<CheckRunResult> {
  const completedSteps = new Map<string, CompletedStepValue>();
  const steps: StepExecutionResult[] = [];
  const observedAtMs = options.observedAtMs ?? Date.now();

  for (const [ordinal, step] of check.steps.entries()) {
    const result = await executeStep(step, ordinal, check, completedSteps, invoker, observedAtMs);
    steps.push(result);

    if (result.state !== "pass") {
      return runFromSteps(check.id, steps);
    }
  }

  return runFromSteps(check.id, steps);
}

export function createStellarStepInvoker(client: StellarRpcClient): StepInvoker {
  return {
    invoke(input): Promise<SimulationEvidence> {
      return simulateInvocation(client, {
        contractId: input.contractId,
        functionName: input.functionName,
        args: input.args,
        ...(input.timeoutSeconds !== undefined ? { timeoutSeconds: input.timeoutSeconds } : {})
      });
    }
  };
}
