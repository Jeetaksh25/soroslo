import { mkdirSync, readFileSync } from "node:fs";
import { hostname } from "node:os";
import { dirname, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { loadConfigText } from "@soroslo/config";
import { createStellarStepInvoker } from "@soroslo/probe-engine";
import { parseDurationMs } from "@soroslo/shared";
import { StellarRpcClient, resolveNetworkConfig, type NetworkConfigInput } from "@soroslo/stellar";
import { SoroSloStorage } from "@soroslo/storage";
import { runCheckAndPersist } from "./execution.js";
import { notifyExecutionTransition } from "./notifications.js";
import { RestartSafeScheduler, type ScheduledCheck } from "./scheduler.js";

function positiveIntegerEnvironment(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new TypeError(`${name} must be an integer >= 1`);
  }
  return parsed;
}

const configPath = resolve(process.env.SOROSLO_CONFIG_PATH ?? "./soroslo.yml");
const loaded = loadConfigText(readFileSync(configPath, "utf8"));
const databasePath = resolve(
  process.env.SOROSLO_DB_PATH ?? resolve(loaded.config.runtime.dataDir, "soroslo.sqlite")
);
mkdirSync(dirname(databasePath), { recursive: true });

const storage = SoroSloStorage.open(databasePath);
storage.migrate();
storage.syncConfiguration(loaded.config, loaded.hash);

const clients = new Map<string, StellarRpcClient>();
function clientFor(networkName: string): StellarRpcClient {
  const cached = clients.get(networkName);
  if (cached) return cached;

  const network = loaded.config.networks[networkName];
  if (!network) throw new Error(`Unknown configured network '${networkName}'`);

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

const defaultTimeoutMs = parseDurationMs(loaded.config.runtime.defaultTimeout);
const scheduledChecks: ScheduledCheck[] = loaded.config.services.flatMap((service) =>
  service.checks.map((check) => ({
    serviceId: service.id,
    check,
    configHash: loaded.hash,
    defaultTimeoutMs
  }))
);

const dashboardUrl = process.env.SOROSLO_DASHBOARD_URL;
const allowPrivateWebhookNetwork = process.env.SOROSLO_ALLOW_PRIVATE_WEBHOOKS === "true";

const scheduler = new RestartSafeScheduler({
  ownerId: process.env.SOROSLO_RUNNER_ID ?? `${hostname()}:${process.pid}`,
  store: storage,
  concurrency: positiveIntegerEnvironment("SOROSLO_RUNNER_CONCURRENCY", 4),
  leaseMs: positiveIntegerEnvironment("SOROSLO_RUNNER_LEASE_MS", 60_000),
  async executor(context) {
    const execution = await runCheckAndPersist({
      storage,
      serviceId: context.serviceId,
      check: context.check,
      configHash: context.configHash,
      invoker: createStellarStepInvoker(clientFor(context.check.network)),
      idempotencyKey: context.idempotencyKey,
      scheduledAt: context.scheduledAt,
      timeoutMs: context.timeoutMs
    });

    try {
      await notifyExecutionTransition({
        storage,
        config: loaded.config,
        serviceId: context.serviceId,
        check: context.check,
        execution,
        ...(dashboardUrl !== undefined ? { dashboardUrl } : {}),
        allowPrivateNetwork: allowPrivateWebhookNetwork
      });
    } catch {
      // Notification delivery must not make a persisted synthetic run replay.
    }
  }
});

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

const tickMs = positiveIntegerEnvironment("SOROSLO_RUNNER_TICK_MS", 5_000);

try {
  while (!stopping) {
    await scheduler.tick(scheduledChecks);
    await sleep(tickMs);
  }
} finally {
  storage.close();
}
