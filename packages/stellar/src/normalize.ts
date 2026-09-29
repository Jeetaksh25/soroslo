import { scValToNative, type xdr } from "@stellar/stellar-sdk";

export type NormalizedScalar = null | boolean | number | string;

export type NormalizedValue =
  | NormalizedScalar
  | NormalizedValue[]
  | { [key: string]: NormalizedValue }
  | {
      type: "map";
      entries: Array<{ key: NormalizedValue; value: NormalizedValue }>;
    }
  | {
      type: "unsupported";
      scValType: string;
      xdr: string;
    };

function bytesToHex(value: Uint8Array): string {
  return Buffer.from(value).toString("hex");
}

function xdrToBase64(value: xdr.ScVal): string {
  return Buffer.from(value.toXdr()).toString("base64");
}

function normalizeNative(value: unknown): NormalizedValue {
  if (value === null) return null;

  if (typeof value === "boolean" || typeof value === "string") return value;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Non-finite numeric Soroban value cannot be normalized");
    }
    return value;
  }

  if (typeof value === "bigint") return value.toString(10);

  if (value instanceof Uint8Array) return bytesToHex(value);

  if (Array.isArray(value)) return value.map(normalizeNative);

  if (typeof value === "object" && value !== null) {
    const result: Record<string, NormalizedValue> = {};
    for (const [key, child] of Object.entries(value).sort(([a], [b]) =>
      a.localeCompare(b)
    )) {
      result[key] = normalizeNative(child);
    }
    return result;
  }

  throw new TypeError(`Unsupported native Soroban value: ${typeof value}`);
}

export function normalizeScVal(value: xdr.ScVal): NormalizedValue {
  if (value.type === "scvMap") {
    const entries = (value.value ?? []).map((entry) => ({
      key: normalizeScVal(entry.key),
      value: normalizeScVal(entry.val)
    }));

    const stringEntries = entries.filter(
      (entry): entry is { key: string; value: NormalizedValue } =>
        typeof entry.key === "string"
    );

    if (
      stringEntries.length === entries.length &&
      new Set(stringEntries.map((entry) => entry.key)).size === entries.length
    ) {
      return Object.fromEntries(
        [...stringEntries]
          .sort((a, b) => a.key.localeCompare(b.key))
          .map((entry) => [entry.key, entry.value])
      );
    }

    return { type: "map", entries };
  }

  if (
    value.type === "scvContractInstance" ||
    value.type === "scvLedgerKeyNonce" ||
    value.type === "scvLedgerKeyContractInstance"
  ) {
    return {
      type: "unsupported",
      scValType: value.type,
      xdr: xdrToBase64(value)
    };
  }

  return normalizeNative(scValToNative(value));
}
