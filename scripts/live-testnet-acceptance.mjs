import { writeFileSync } from "node:fs";
import {
  createStellarStepInvoker,
  executeCheck
} from "../packages/probe-engine/dist/index.js";
import {
  StellarRpcClient,
  resolveNetworkConfig
} from "../packages/stellar/dist/index.js";

const contractId = process.env.SOROSLO_TESTNET_FIXTURE_CONTRACT;
if (!contractId) {
  throw new Error("SOROSLO_TESTNET_FIXTURE_CONTRACT is required");
}

const testnetConfig = resolveNetworkConfig({
  name: "testnet",
  preset: "testnet"
});
const testnetClient = new StellarRpcClient(testnetConfig, {
  timeoutMs: 15_000,
  retry: { attempts: 3, baseDelayMs: 200, maxDelayMs: 1_000 }
});
const liveInvoker = createStellarStepInvoker(testnetClient);

function check(id, steps) {
  return {
    id,
    name: id,
    network: "testnet",
    every: "5m",
    timeout: "15s",
    steps
  };
}

const single = await executeCheck(
  check("single-read", [
    {
      id: "healthy",
      contract: contractId,
      function: "healthy",
      args: [],
      assertions: [{ path: "$", op: "equals", value: true }]
    },
    {
      id: "snapshot",
      contract: contractId,
      function: "snapshot",
      args: [],
      assertions: [
        { path: "$.value", op: "equals", value: "42" },
        { path: "$.timestamp", op: "age_lt", value: "5m" }
      ]
    }
  ]),
  liveInvoker
);

const chained = await executeCheck(
  check("chained-read", [
    {
      id: "base",
      contract: contractId,
      function: "value",
      args: [],
      assertions: [{ path: "$", op: "equals", value: "42" }]
    },
    {
      id: "double",
      contract: contractId,
      function: "double",
      args: [{ type: "i128", from: "$steps.base.result" }],
      assertions: [{ path: "$", op: "equals", value: "84" }]
    }
  ]),
  liveInvoker
);

const falseAssertion = await executeCheck(
  check("false-assertion", [
    {
      id: "value",
      contract: contractId,
      function: "value",
      args: [],
      assertions: [{ path: "$", op: "gt", value: "100" }]
    }
  ]),
  liveInvoker
);

const contractError = await executeCheck(
  check("contract-error", [
    {
      id: "fail",
      contract: contractId,
      function: "fail",
      args: [],
      assertions: []
    }
  ]),
  liveInvoker
);

const brokenConfig = resolveNetworkConfig({
  name: "unreachable-testnet",
  rpcUrl: "https://127.0.0.1:9",
  networkPassphrase: testnetConfig.networkPassphrase
});
const brokenClient = new StellarRpcClient(brokenConfig, {
  timeoutMs: 500,
  retry: { attempts: 1, baseDelayMs: 1, maxDelayMs: 1 }
});
const observerError = await executeCheck(
  check("observer-error", [
    {
      id: "value",
      contract: contractId,
      function: "value",
      args: [],
      assertions: []
    }
  ]),
  createStellarStepInvoker(brokenClient)
);

const expected = {
  single: "pass",
  chained: "pass",
  falseAssertion: "service_fail",
  contractError: "service_fail",
  observerError: "observer_error"
};

const actual = {
  single: single.state,
  chained: chained.state,
  falseAssertion: falseAssertion.state,
  contractError: contractError.state,
  observerError: observerError.state
};

for (const [name, state] of Object.entries(expected)) {
  if (actual[name] !== state) {
    throw new Error(
      `Acceptance case '${name}' expected '${state}' but received '${actual[name]}'`
    );
  }
}

const evidence = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  network: "Stellar Testnet",
  rpcOrigin: testnetConfig.endpointOrigin,
  rpcEndpointFingerprint: testnetConfig.endpointFingerprint,
  contractId,
  runtimeBoundary: {
    signingKeyProvidedToSoroSLO: false,
    transactionSubmissionUsedBySoroSLO: false,
    rpcOperation: "simulateTransaction"
  },
  cases: {
    single: {
      state: single.state,
      observedLedger: single.observedLedger,
      steps: single.steps.map((step) => ({
        id: step.stepId,
        state: step.state,
        result: step.evidence?.result ?? null
      }))
    },
    chained: {
      state: chained.state,
      observedLedger: chained.observedLedger,
      steps: chained.steps.map((step) => ({
        id: step.stepId,
        state: step.state,
        result: step.evidence?.result ?? null
      }))
    },
    falseAssertion: {
      state: falseAssertion.state,
      failure: falseAssertion.steps.at(-1)?.failure ?? null
    },
    contractError: {
      state: contractError.state,
      failure: contractError.steps.at(-1)?.failure ?? null
    },
    observerError: {
      state: observerError.state,
      observerErrorCode: observerError.observerErrorCode ?? null,
      failure: observerError.steps.at(-1)?.failure ?? null
    }
  }
};

const output = process.env.SOROSLO_ACCEPTANCE_OUTPUT;
if (output) {
  writeFileSync(output, JSON.stringify(evidence, null, 2) + "\n", "utf8");
}

console.log(JSON.stringify(evidence, null, 2));
