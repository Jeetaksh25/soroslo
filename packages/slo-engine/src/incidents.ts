import type { RunState } from "@soroslo/shared";

export type OperationalState = "healthy" | "pending_failure" | "incident_open" | "pending_recovery";

export interface IncidentPolicy {
  failuresToOpen: number;
  passesToRecover: number;
}

export interface IncidentRuntimeState {
  state: OperationalState;
  consecutiveFailures: number;
  consecutivePasses: number;
}

export type IncidentTransitionEvent = "opened" | "recovered" | null;

export interface IncidentTransition {
  previousState: OperationalState;
  next: IncidentRuntimeState;
  event: IncidentTransitionEvent;
}

export const defaultIncidentPolicy: IncidentPolicy = {
  failuresToOpen: 2,
  passesToRecover: 2
};

function validatePolicy(policy: IncidentPolicy): void {
  if (!Number.isInteger(policy.failuresToOpen) || policy.failuresToOpen < 1) {
    throw new RangeError("failuresToOpen must be an integer >= 1");
  }
  if (!Number.isInteger(policy.passesToRecover) || policy.passesToRecover < 1) {
    throw new RangeError("passesToRecover must be an integer >= 1");
  }
}

export function initialIncidentRuntimeState(): IncidentRuntimeState {
  return {
    state: "healthy",
    consecutiveFailures: 0,
    consecutivePasses: 0
  };
}

export function advanceIncidentState(
  current: IncidentRuntimeState,
  runState: RunState,
  policy: IncidentPolicy = defaultIncidentPolicy
): IncidentTransition {
  validatePolicy(policy);
  const previousState = current.state;

  if (runState === "observer_error" || runState === "cancelled") {
    return {
      previousState,
      next: { ...current },
      event: null
    };
  }

  if (runState === "service_fail") {
    const consecutiveFailures = current.consecutiveFailures + 1;

    if (current.state === "incident_open" || current.state === "pending_recovery") {
      return {
        previousState,
        next: {
          state: "incident_open",
          consecutiveFailures,
          consecutivePasses: 0
        },
        event: null
      };
    }

    if (consecutiveFailures >= policy.failuresToOpen) {
      return {
        previousState,
        next: {
          state: "incident_open",
          consecutiveFailures,
          consecutivePasses: 0
        },
        event: "opened"
      };
    }

    return {
      previousState,
      next: {
        state: "pending_failure",
        consecutiveFailures,
        consecutivePasses: 0
      },
      event: null
    };
  }

  if (current.state === "healthy") {
    return {
      previousState,
      next: {
        state: "healthy",
        consecutiveFailures: 0,
        consecutivePasses: current.consecutivePasses + 1
      },
      event: null
    };
  }

  if (current.state === "pending_failure") {
    return {
      previousState,
      next: {
        state: "healthy",
        consecutiveFailures: 0,
        consecutivePasses: 1
      },
      event: null
    };
  }

  const consecutivePasses = current.consecutivePasses + 1;
  if (consecutivePasses >= policy.passesToRecover) {
    return {
      previousState,
      next: {
        state: "healthy",
        consecutiveFailures: 0,
        consecutivePasses
      },
      event: "recovered"
    };
  }

  return {
    previousState,
    next: {
      state: "pending_recovery",
      consecutiveFailures: 0,
      consecutivePasses
    },
    event: null
  };
}
