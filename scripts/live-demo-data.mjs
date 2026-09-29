import { mkdirSync, writeFileSync } from "node:fs";
import { loadConfigText } from "../packages/config/dist/index.js";
import { createStellarStepInvoker } from "../packages/probe-engine/dist/index.js";
import { runCheckAndPersist } from "../apps/runner/dist/index.js";
import { StellarRpcClient, resolveNetworkConfig } from "../packages/stellar/dist/index.js";
import { SoroSloStorage } from "../packages/storage/dist/index.js";

const contractId = process.env.SOROSLO_TESTNET_FIXTURE_CONTRACT;
if (!contractId) throw new Error("SOROSLO_TESTNET_FIXTURE_CONTRACT is required");

mkdirSync("acceptance", { recursive: true });

const configText = `version: 1

runtime:
  timezone: UTC
  dataDir: ./acceptance
  defaultTimeout: 15s

networks:
  testnet:
    preset: testnet

services:
  - id: testnet-fixture
    name: SoroSLO Testnet Fixture
    checks:
      - id: healthy-read
        name: Healthy read
        network: testnet
        every: 5m
        incidentPolicy:
          failuresToOpen: 2
          passesToRecover: 2
        slo:
          target: 99.9
          window: 7d
          minEligibleRuns: 1
          maxObserverErrorRate: 5
        steps:
          - id: healthy
            contract: ${contractId}
            function: healthy
            args: []
            assertions:
              - path: $
                op: equals
                value: true
          - id: snapshot
            contract: ${contractId}
            function: snapshot
            args: []
            assertions:
              - path: $.value
                op: equals
                value: "42"
              - path: $.timestamp
                op: age_lt
                value: 5m

      - id: chained-read
        name: Chained read
        network: testnet
        every: 5m
        slo:
          target: 99
          window: 7d
          minEligibleRuns: 1
          maxObserverErrorRate: 5
        steps:
          - id: base
            contract: ${contractId}
            function: value
            args: []
            assertions:
              - path: $
                op: equals
                value: "42"
          - id: doubled
            contract: ${contractId}
            function: double
            args:
              - type: i128
                from: $steps.base.result
            assertions:
              - path: $
                op: equals
                value: "84"

      - id: deliberate-failure
        name: Deliberate assertion failure
        network: testnet
        every: 5m
        incidentPolicy:
          failuresToOpen: 2
          passesToRecover: 2
        slo:
          target: 99.9
          window: 7d
          minEligibleRuns: 1
          maxObserverErrorRate: 5
        steps:
          - id: value
            contract: ${contractId}
            function: value
            args: []
            assertions:
              - path: $
                op: gt
                value: "100"
`;

writeFileSync("acceptance/demo-soroslo.yml", configText, "utf8");
const loaded = loadConfigText(configText);
const storage = SoroSloStorage.open("acceptance/demo.sqlite");
storage.migrate();
storage.syncConfiguration(loaded.config, loaded.hash);

const client = new StellarRpcClient(resolveNetworkConfig({ name: "testnet", preset: "testnet" }));
const invoker = createStellarStepInvoker(client);
const service = loaded.config.services[0];
if (!service) throw new Error("Demo service is missing");

const executions = [];
for (const check of service.checks) {
  const repetitions = check.id === "deliberate-failure" ? 2 : 1;
  for (let index = 0; index < repetitions; index += 1) {
    executions.push(
      await runCheckAndPersist({
        storage,
        serviceId: service.id,
        check,
        configHash: loaded.hash,
        invoker,
        idempotencyKey: `demo:${check.id}:${index}`
      })
    );
  }
}

const incident = storage.listIncidents({ state: "open", limit: 10 })[0] ?? null;
const healthyRuns = storage.listRuns("testnet-fixture:healthy-read", 10);
const failingRuns = storage.listRuns("testnet-fixture:deliberate-failure", 10);

const manifest = {
  generatedAt: new Date().toISOString(),
  contractId,
  serviceId: service.id,
  healthyCheckId: "testnet-fixture:healthy-read",
  chainedCheckId: "testnet-fixture:chained-read",
  failingCheckId: "testnet-fixture:deliberate-failure",
  runId: healthyRuns[0]?.id ?? failingRuns[0]?.id ?? null,
  incidentId: incident?.id ?? null,
  executions: executions.map((execution) => ({
    runId: execution.runId,
    state: execution.result.state,
    incidentEvent: execution.incidentEvent
  }))
};

writeFileSync("acceptance/demo-manifest.json", JSON.stringify(manifest, null, 2) + "\n", "utf8");
storage.close();

console.log(JSON.stringify(manifest, null, 2));
