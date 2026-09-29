import type { xdr } from "@stellar/stellar-sdk";
import type { SimulationEvidence } from "./evidence.js";
import { toSimulationEvidence } from "./evidence.js";
import type { StellarRpcClient } from "./rpc-client.js";
import { buildSimulationTransaction } from "./transaction.js";

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
  const transaction = buildSimulationTransaction({
    contractId: input.contractId,
    functionName: input.functionName,
    args: input.args,
    timeoutSeconds: input.timeoutSeconds,
    networkPassphrase: client.config.networkPassphrase
  });

  const started = performance.now();
  const response = await client.simulateTransaction(transaction);
  const elapsedMs = Math.max(0, Math.round(performance.now() - started));

  return toSimulationEvidence(response, {
    endpointFingerprint: client.config.endpointFingerprint,
    elapsedMs
  });
}
