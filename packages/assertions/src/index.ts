export { evaluateAssertion, evaluateAssertions } from "./assertion.js";
export type {
  AssertionOperator,
  AssertionReason,
  AssertionResult,
  AssertionSpec
} from "./assertion.js";
// Re-exported for existing consumers; the implementation now lives in
// @soroslo/shared so the config schema can use the same exact comparison.
export { compareExactNumeric } from "@soroslo/shared";
export const packageName = "@soroslo/assertions" as const;
