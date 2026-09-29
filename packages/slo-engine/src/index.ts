export { calculateSloSnapshot } from "./slo.js";
export type { ReliabilityRun, SloPolicy, SloSnapshot, SloStatus } from "./slo.js";
export {
  advanceIncidentState,
  defaultIncidentPolicy,
  initialIncidentRuntimeState
} from "./incidents.js";
export type {
  IncidentPolicy,
  IncidentRuntimeState,
  IncidentTransition,
  IncidentTransitionEvent,
  OperationalState
} from "./incidents.js";
export const packageName = "@soroslo/slo-engine" as const;
