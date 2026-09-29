import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadConfigText } from "@soroslo/config";
import { SoroSloStorage } from "@soroslo/storage";
import { createDefaultManualRunHandler } from "./runtime.js";
import { startApi } from "./server.js";

function integerEnvironment(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65_535) {
    throw new TypeError(`${name} must be an integer between 0 and 65535`);
  }
  return parsed;
}

const configPath = resolve(process.env.SOROSLO_CONFIG_PATH ?? "./soroslo.yml");
const loaded = loadConfigText(readFileSync(configPath, "utf8"));

const databasePath = resolve(
  process.env.SOROSLO_DB_PATH ??
    resolve(loaded.config.runtime.dataDir, "soroslo.sqlite")
);
mkdirSync(dirname(databasePath), { recursive: true });

const storage = SoroSloStorage.open(databasePath);
storage.migrate();
storage.syncConfiguration(loaded.config, loaded.hash);

const host = process.env.SOROSLO_API_HOST ?? "127.0.0.1";
const port = integerEnvironment("SOROSLO_API_PORT", 3001);
const dashboardUrl = process.env.SOROSLO_DASHBOARD_URL;

const app = await startApi({
  storage,
  config: loaded.config,
  configHash: loaded.hash,
  version: process.env.SOROSLO_VERSION ?? "0.1.0-dev",
  host,
  port,
  ...(process.env.SOROSLO_ADMIN_TOKEN !== undefined
    ? { adminToken: process.env.SOROSLO_ADMIN_TOKEN }
    : {}),
  manualRun: createDefaultManualRunHandler({
    storage,
    config: loaded.config,
    configHash: loaded.hash,
    ...(dashboardUrl !== undefined ? { dashboardUrl } : {}),
    allowPrivateWebhookNetwork:
      process.env.SOROSLO_ALLOW_PRIVATE_WEBHOOKS === "true"
  })
});

let shuttingDown = false;
async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  await app.close();
  storage.close();
}

process.on("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});
process.on("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});
