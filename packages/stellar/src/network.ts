import { createHash } from "node:crypto";
import { Networks } from "@stellar/stellar-sdk";

export const DEFAULT_TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";

export type NetworkPreset = "testnet" | "mainnet";

export interface NetworkConfigInput {
  name: string;
  preset?: NetworkPreset;
  rpcUrl?: string;
  networkPassphrase?: string;
}

export interface ResolvedNetworkConfig {
  name: string;
  preset: NetworkPreset | "custom";
  rpcUrl: string;
  networkPassphrase: string;
  endpointOrigin: string;
  endpointFingerprint: string;
}

function normalizeRpcUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError(`Invalid Stellar RPC URL: ${value}`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new TypeError("Stellar RPC URL must use http or https");
  }

  parsed.hash = "";
  return parsed;
}

export function fingerprintRpcEndpoint(rpcUrl: string): string {
  return createHash("sha256").update(rpcUrl).digest("hex").slice(0, 16);
}

export function resolveNetworkConfig(input: NetworkConfigInput): ResolvedNetworkConfig {
  const name = input.name.trim();
  if (!name) {
    throw new TypeError("Network name must not be empty");
  }

  const preset = input.preset ?? "custom";

  let rpcUrl: string | undefined = input.rpcUrl;
  let networkPassphrase: string | undefined = input.networkPassphrase;

  if (preset === "testnet") {
    rpcUrl ??= DEFAULT_TESTNET_RPC_URL;
    networkPassphrase ??= Networks.TESTNET;
  } else if (preset === "mainnet") {
    if (!rpcUrl) {
      throw new TypeError("Mainnet requires an explicit rpcUrl");
    }
    networkPassphrase ??= Networks.PUBLIC;
  } else {
    if (!rpcUrl || !networkPassphrase) {
      throw new TypeError("Custom networks require rpcUrl and networkPassphrase");
    }
  }

  const parsed = normalizeRpcUrl(rpcUrl);
  const normalizedUrl = parsed.toString();

  return {
    name,
    preset,
    rpcUrl: normalizedUrl,
    networkPassphrase,
    endpointOrigin: parsed.origin,
    endpointFingerprint: fingerprintRpcEndpoint(normalizedUrl)
  };
}
