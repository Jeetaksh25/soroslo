import { Networks } from "@stellar/stellar-sdk";

export const deterministicRpcFixtures = {
  testnetNetwork: {
    passphrase: Networks.TESTNET,
    protocolVersion: "23"
  },
  healthyRpc: {
    status: "healthy" as const,
    latestLedger: 1_000_000,
    oldestLedger: 950_000,
    ledgerRetentionWindow: 50_000
  },
  rateLimitedError: {
    response: { status: 429 }
  },
  unavailableError: {
    response: { status: 503 }
  },
  timeoutError: Object.assign(new Error("request timeout"), {
    code: "ETIMEDOUT"
  })
} as const;
