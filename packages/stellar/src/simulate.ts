import type { xdr } from "@stellar/stellar-sdk";
import type { SimulationEvidence } from "./evidence.js";
import { toSimulationEvidence } from "./evidence.js";
import type { StellarRpcClient } from "./rpc-client.js";
import { buildSimulationTransaction, type SimulationTransactionInput } from "./transaction.js";

export interface SimulateInvocationInput {
  contractId: string;
  functionName: string;
  args?: xdr.ScVal[];
  timeoutSeconds?: number;
}

export async function simulateInvocation(
  client: StellarRpcClient,
  input: SimulateInvocationInput
): Promise<SimulationEvidence> {
  const transactionInput: SimulationTransactionInput = {
    contractId: input.contractId,
    functionName: input.functionName,
    networkPassphrase: client.config.networkPassphrase,
    ...(input.args !== undefined ? { args: input.args } : {}),
    ...(input.timeoutSeconds !== undefined ? { timeoutSeconds: input.timeoutSeconds } : {})
  };

  const transaction = buildSimulationTransaction(transactionInput);

  const started = performance.now();
  const response = await client.simulateTransaction(transaction);
  const elapsedMs = Math.max(0, Math.round(performance.now() - started));

  return toSimulationEvidence(response, {
    endpointFingerprint: client.config.endpointFingerprint,
    elapsedMs
  });
}
