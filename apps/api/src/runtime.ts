import type { SoroSloConfig } from "@soroslo/config";
import { createStellarStepInvoker } from "@soroslo/probe-engine";
import { runCheckAndPersist } from "@soroslo/runner";
import { parseDurationMs } from "@soroslo/shared";
import {
  StellarRpcClient,
  resolveNetworkConfig,
  type NetworkConfigInput
} from "@soroslo/stellar";
import type { SoroSloStorage } from "@soroslo/storage";
import type { ManualRunHandler } from "./server.js";

export function createDefaultManualRunHandler(options: {
  storage: SoroSloStorage;
  config: SoroSloConfig;
  configHash: string;
}): ManualRunHandler {
  const clients = new Map<string, StellarRpcClient>();

  function clientFor(networkName: string): StellarRpcClient {
    const cached = clients.get(networkName);
    if (cached) return cached;

    const network = options.config.networks[networkName];
    if (!network) {
      throw new Error(`Unknown configured network '${networkName}'`);
    }

    const input: NetworkConfigInput = {
      name: networkName,
      ...(network.preset !== undefined ? { preset: network.preset } : {}),
      ...(network.rpcUrl !== undefined ? { rpcUrl: network.rpcUrl } : {}),
      ...(network.networkPassphrase !== undefined
        ? { networkPassphrase: network.networkPassphrase }
        : {})
    };

    const client = new StellarRpcClient(resolveNetworkConfig(input));
    clients.set(networkName, client);
    return client;
  }

  return async ({ serviceId, check, requestId }) => {
    const client = clientFor(check.network);
    const timeoutMs = parseDurationMs(
      check.timeout ?? options.config.runtime.defaultTimeout
    );

    const execution = await runCheckAndPersist({
      storage: options.storage,
      serviceId,
      check,
      configHash: options.configHash,
      invoker: createStellarStepInvoker(client),
      idempotencyKey: `manual:${requestId}`,
      timeoutMs
    });

    return {
      runId: execution.runId,
      state: execution.result.state,
      incidentEvent: execution.incidentEvent
    };
  };
}
