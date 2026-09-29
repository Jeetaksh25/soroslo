import test from "node:test";
import assert from "node:assert/strict";
import { scValToNative } from "@stellar/stellar-sdk";
import type { CheckConfig } from "@soroslo/config";
import { StellarObserverError, type SimulationEvidence } from "@soroslo/stellar";
import { executeCheck, type StepInvoker } from "./engine.js";

const CONTRACT_ID = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";

const check: CheckConfig = {
  id: "quote",
  name: "Quote",
  network: "testnet",
  every: "5m",
  timeout: "10s",
  steps: [
    {
      id: "price",
      contract: CONTRACT_ID,
      function: "latest_price",
      args: [],
      assertions: [{ path: "$.value", op: "gt", value: "0" }]
    },
    {
      id: "quote",
      contract: CONTRACT_ID,
      function: "quote",
      args: [{ type: "i128", from: "$steps.price.result.value" }],
      assertions: [{ path: "$", op: "gt", value: "0" }]
    }
  ]
};

function evidence(result: SimulationEvidence["result"], ledger = 100): SimulationEvidence {
  return {
    status: "success",
    latestLedger: ledger,
    endpointFingerprint: "rpc123",
    elapsedMs: 4,
    diagnosticEventCount: 0,
    ...(result !== undefined ? { result } : {})
  };
}

void test("executes ordered steps and resolves a prior-step result into a typed argument", async () => {
  const invocations: unknown[] = [];
  const invoker: StepInvoker = {
    invoke(input) {
      invocations.push(input);
      if (input.functionName === "latest_price") {
        return Promise.resolve(evidence({ value: "7" }, 101));
      }

      assert.equal(scValToNative(input.args[0]!), 7n);
      return Promise.resolve(evidence("14", 102));
    }
  };

  const run = await executeCheck(check, invoker, { observedAtMs: 1_800_000_000_000 });

  assert.equal(run.state, "pass");
  assert.equal(run.steps.length, 2);
  assert.equal(run.observedLedger, 102);
  assert.equal(invocations.length, 2);
});

void test("fails fast on deterministic assertion failure", async () => {
  let calls = 0;
  const invoker: StepInvoker = {
    invoke() {
      calls += 1;
      return Promise.resolve(evidence({ value: "0" }));
    }
  };

  const run = await executeCheck(check, invoker);

  assert.equal(run.state, "service_fail");
  assert.equal(run.steps.length, 1);
  assert.equal(run.steps[0]?.failure?.kind, "assertion_failed");
  assert.equal(calls, 1);
});

void test("classifies RPC failures as observer errors", async () => {
  const invoker: StepInvoker = {
    invoke() {
      return Promise.reject(
        new StellarObserverError("timeout", "RPC timed out", { retryable: true })
      );
    }
  };

  const run = await executeCheck(check, invoker);

  assert.equal(run.state, "observer_error");
  assert.equal(run.observerErrorCode, "timeout");
  assert.equal(run.steps[0]?.failure?.kind, "observer_error");
});

void test("classifies deterministic Soroban simulation errors as service failures", async () => {
  const invoker: StepInvoker = {
    invoke() {
      return Promise.resolve({
        status: "simulation_error",
        latestLedger: 100,
        endpointFingerprint: "rpc123",
        elapsedMs: 3,
        diagnosticEventCount: 1,
        error: "Error(Contract, #1)"
      });
    }
  };

  const run = await executeCheck(check, invoker);
  assert.equal(run.state, "service_fail");
  assert.equal(run.steps[0]?.failure?.kind, "simulation_error");
});

void test("fails when a referenced field disappears from an earlier result", async () => {
  const invoker: StepInvoker = {
    invoke(input) {
      if (input.functionName === "latest_price") {
        return Promise.resolve(evidence({ value: "7" }));
      }
      return Promise.resolve(evidence("10"));
    }
  };

  const broken: CheckConfig = {
    ...check,
    steps: [
      check.steps[0]!,
      {
        ...check.steps[1]!,
        args: [{ type: "i128", from: "$steps.price.result.missing" }]
      }
    ]
  };

  const run = await executeCheck(broken, invoker);
  assert.equal(run.state, "service_fail");
  assert.equal(run.steps[1]?.failure?.kind, "argument_resolution_failed");
});
