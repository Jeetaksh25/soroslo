import test from "node:test";
import assert from "node:assert/strict";
import { Networks, xdr } from "@stellar/stellar-sdk";
import { NULL_SIMULATION_ACCOUNT, buildSimulationTransaction } from "./transaction.js";

const CONTRACT_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";

void test("builds a one-operation simulation transaction without a secret key", () => {
  const transaction = buildSimulationTransaction({
    contractId: CONTRACT_ID,
    functionName: "value",
    args: [xdr.ScVal.scvU32(1)],
    networkPassphrase: Networks.TESTNET
  });

  assert.equal(transaction.source, NULL_SIMULATION_ACCOUNT);
  assert.equal(transaction.operations.length, 1);
  assert.ok(transaction.toXDR().length > 0);
});

void test("rejects invalid transaction timeouts", () => {
  assert.throws(
    () =>
      buildSimulationTransaction({
        contractId: CONTRACT_ID,
        functionName: "value",
        networkPassphrase: Networks.TESTNET,
        timeoutSeconds: 0
      }),
    /integer >= 1/
  );
});
