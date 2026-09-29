import test from "node:test";
import assert from "node:assert/strict";
import { Networks } from "@stellar/stellar-sdk";
import {
  DEFAULT_TESTNET_RPC_URL,
  fingerprintRpcEndpoint,
  resolveNetworkConfig
} from "./network.js";

void test("testnet preset resolves the official SDF RPC and passphrase", () => {
  const config = resolveNetworkConfig({ name: "testnet", preset: "testnet" });

  assert.equal(config.rpcUrl, `${DEFAULT_TESTNET_RPC_URL}/`);
  assert.equal(config.networkPassphrase, Networks.TESTNET);
  assert.equal(config.endpointOrigin, DEFAULT_TESTNET_RPC_URL);
});

void test("mainnet requires an explicit RPC endpoint", () => {
  assert.throws(
    () => resolveNetworkConfig({ name: "mainnet", preset: "mainnet" }),
    /explicit rpcUrl/
  );
});

void test("custom network requires both RPC URL and passphrase", () => {
  assert.throws(
    () => resolveNetworkConfig({ name: "local", rpcUrl: "http://localhost:8000" }),
    /require rpcUrl and networkPassphrase/
  );
});

void test("endpoint fingerprint does not expose credentials", () => {
  const secretUrl = "https://user:secret@example.com/private/key?token=abc";
  const fingerprint = fingerprintRpcEndpoint(secretUrl);

  assert.match(fingerprint, /^[0-9a-f]{16}$/);
  assert.equal(fingerprint.includes("secret"), false);
  assert.equal(fingerprint.includes("abc"), false);
});
