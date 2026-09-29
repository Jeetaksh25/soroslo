import {
  Account,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  type Transaction,
  type xdr
} from "@stellar/stellar-sdk";

export const NULL_SIMULATION_ACCOUNT = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

export interface SimulationTransactionInput {
  contractId: string;
  functionName: string;
  args?: xdr.ScVal[];
  networkPassphrase: string;
  timeoutSeconds?: number;
}

export function buildSimulationTransaction(input: SimulationTransactionInput): Transaction {
  const timeoutSeconds = input.timeoutSeconds ?? 30;

  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1) {
    throw new TypeError("Simulation transaction timeoutSeconds must be an integer >= 1");
  }

  const source = new Account(NULL_SIMULATION_ACCOUNT, "0");
  const operation = new Contract(input.contractId).call(input.functionName, ...(input.args ?? []));

  return new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: input.networkPassphrase
  })
    .addOperation(operation)
    .setTimeout(timeoutSeconds)
    .build();
}
