import { parseDurationMs, type RunState } from "@soroslo/shared";

export interface SloPolicy {
  target: number;
  window: string;
  minEligibleRuns: number;
  maxObserverErrorRate: number;
}

export interface ReliabilityRun {
  state: RunState;
  finishedAt: string | Date;
}

export type SloStatus = "met" | "breached" | "insufficient_data";

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
  allowedFailureFraction: number;
  consumedFailureFraction: number | null;
  errorBudgetConsumptionRatio: number | null;
  status: SloStatus;
}

function percentage(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return (numerator / denominator) * 100;
}

export function calculateSloSnapshot(
  runs: readonly ReliabilityRun[],
  policy: SloPolicy,
  options: { now?: Date } = {}
): SloSnapshot {
  if (!(policy.target > 0 && policy.target <= 100)) {
    throw new RangeError("SLO target must be greater than 0 and at most 100");
  }
  if (!Number.isInteger(policy.minEligibleRuns) || policy.minEligibleRuns < 0) {
    throw new RangeError("minEligibleRuns must be a non-negative integer");
  }
  if (policy.maxObserverErrorRate < 0 || policy.maxObserverErrorRate > 100) {
    throw new RangeError("maxObserverErrorRate must be between 0 and 100");
  }

  const now = options.now ?? new Date();
  const windowMs = parseDurationMs(policy.window);
  const windowStartMs = now.getTime() - windowMs;

  const inWindow = runs.filter((run) => {
    const timestamp =
      run.finishedAt instanceof Date ? run.finishedAt.getTime() : Date.parse(run.finishedAt);
    return Number.isFinite(timestamp) && timestamp >= windowStartMs && timestamp <= now.getTime();
  });

  let passingRuns = 0;
  let serviceFailures = 0;
  let observerErrors = 0;
  let cancelledRuns = 0;

  for (const run of inWindow) {
    switch (run.state) {
      case "pass":
        passingRuns += 1;
        break;
      case "service_fail":
        serviceFailures += 1;
        break;
      case "observer_error":
        observerErrors += 1;
        break;
      case "cancelled":
        cancelledRuns += 1;
        break;
    }
  }

  const eligibleRuns = passingRuns + serviceFailures;
  const monitorSamples = eligibleRuns + observerErrors;
  const observedSli = percentage(passingRuns, eligibleRuns);
  const dataCoverage = percentage(eligibleRuns, monitorSamples);
  const observerErrorRate = percentage(observerErrors, monitorSamples);
  const allowedFailureFraction = 1 - policy.target / 100;
  const consumedFailureFraction =
    eligibleRuns === 0 ? null : serviceFailures / eligibleRuns;

  let errorBudgetConsumptionRatio: number | null = null;
  if (consumedFailureFraction !== null) {
    if (allowedFailureFraction === 0) {
      errorBudgetConsumptionRatio = consumedFailureFraction === 0 ? 0 : null;
    } else {
      errorBudgetConsumptionRatio = consumedFailureFraction / allowedFailureFraction;
    }
  }

  const insufficientCoverage =
    eligibleRuns < policy.minEligibleRuns ||
    observerErrorRate === null ||
    observerErrorRate > policy.maxObserverErrorRate;

  const status: SloStatus = insufficientCoverage
    ? "insufficient_data"
    : observedSli !== null && observedSli >= policy.target
      ? "met"
      : "breached";

  return {
    windowStart: new Date(windowStartMs).toISOString(),
    windowEnd: now.toISOString(),
    target: policy.target,
    observedSli,
    eligibleRuns,
    passingRuns,
    serviceFailures,
    observerErrors,
    cancelledRuns,
    dataCoverage,
    observerErrorRate,
    allowedFailureFraction,
    consumedFailureFraction,
    errorBudgetConsumptionRatio,
    status
  };
}
