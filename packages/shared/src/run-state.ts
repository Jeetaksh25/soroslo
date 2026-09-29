export const runStates = ["pass", "service_fail", "observer_error", "cancelled"] as const;

export type RunState = (typeof runStates)[number];

export function isEligibleForAvailability(state: RunState): boolean {
  return state === "pass" || state === "service_fail";
}
