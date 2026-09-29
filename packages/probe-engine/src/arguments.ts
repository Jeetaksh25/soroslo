import { nativeToScVal, type xdr } from "@stellar/stellar-sdk";
import type { ArgumentConfig } from "@soroslo/config";
import { getJsonPath } from "@soroslo/shared";

export interface CompletedStepValue {
  result: unknown;
}

export class ReferenceResolutionError extends Error {
  readonly reference: string;

  constructor(reference: string) {
    super(`Unable to resolve prior-step reference '${reference}'`);
    this.name = "ReferenceResolutionError";
    this.reference = reference;
  }
}

function resolveReference(
  reference: string,
  completedSteps: ReadonlyMap<string, CompletedStepValue>
): unknown {
  const match =
    /^\$steps\.([a-z0-9][a-z0-9-]{0,62})\.result((?:\.[A-Za-z_][A-Za-z0-9_-]*|\[\d+\])*)$/.exec(
      reference
    );

  if (!match) throw new ReferenceResolutionError(reference);

  const stepId = match[1]!;
  const suffix = match[2] ?? "";
  const completed = completedSteps.get(stepId);
  if (!completed) throw new ReferenceResolutionError(reference);

  const path = `$${suffix}`;
  const resolved = getJsonPath(completed.result, path);
  if (!resolved.found) throw new ReferenceResolutionError(reference);

  return resolved.value;
}

function integerValue(value: unknown): string | number | bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return value;
  throw new TypeError("Expected an integer-compatible value");
}

export function argumentToScVal(
  argument: ArgumentConfig,
  completedSteps: ReadonlyMap<string, CompletedStepValue>
): xdr.ScVal {
  const value = "from" in argument
    ? resolveReference(argument.from, completedSteps)
    : argument.value;

  switch (argument.type) {
    case "bool":
      if (typeof value !== "boolean") throw new TypeError("bool argument requires a boolean");
      return nativeToScVal(value);

    case "u32":
    case "i32":
    case "u64":
    case "i64":
    case "u128":
    case "i128":
    case "u256":
    case "i256":
    case "timepoint":
    case "duration":
      return nativeToScVal(integerValue(value), { type: argument.type });

    case "symbol":
    case "string":
    case "address":
      if (typeof value !== "string") {
        throw new TypeError(`${argument.type} argument requires a string`);
      }
      return nativeToScVal(value, { type: argument.type });

    case "bytes":
      if (typeof value !== "string" || !/^(?:[0-9a-fA-F]{2})*$/.test(value)) {
        throw new TypeError("bytes argument requires an even-length hex string");
      }
      return nativeToScVal(Uint8Array.from(Buffer.from(value, "hex")), { type: "bytes" });
  }
}

export function resolveArguments(
  argumentsConfig: readonly ArgumentConfig[],
  completedSteps: ReadonlyMap<string, CompletedStepValue>
): xdr.ScVal[] {
  return argumentsConfig.map((argument) => argumentToScVal(argument, completedSteps));
}
