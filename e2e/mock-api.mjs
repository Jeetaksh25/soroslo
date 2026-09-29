import { createServer } from "node:http";

const PORT = Number(process.env.SOROSLO_E2E_API_PORT ?? 3201);

const check = {
  id: "payments:health",
  localId: "health",
  serviceId: "payments",
  name: "Health",
  network: "testnet",
  schedule: "5m",
  configHash: "config-e2e",
  enabled: true,
  createdAt: "2026-09-29T18:00:00.000Z",
  updatedAt: "2026-09-29T18:00:00.000Z",
  operationalState: "incident_open",
  activeIncidentId: "incident-1",
  lastRunId: "run-1",
  lastRunState: "service_fail",
  lastRunFinishedAt: "2026-09-29T18:30:00.000Z"
};

const run = {
  id: "run-1",
  checkId: "payments:health",
  scheduledAt: "2026-09-29T18:30:00.000Z",
  startedAt: "2026-09-29T18:30:00.000Z",
  finishedAt: "2026-09-29T18:30:01.000Z",
  state: "service_fail",
  observedLedger: 123456,
  rpcEndpointFingerprint: "rpc-e2e",
  configHash: "config-e2e",
  observerErrorCode: null,
  observerErrorMessage: null,
  steps: [
    {
      id: "run-1:step:0",
      stepId: "read",
      ordinal: 0,
      state: "service_fail",
      contractId: "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE",
      functionName: "value",
      result: { value: "0" },
      rawReturnXdr: null,
      minResourceFee: "100",
      elapsedMs: 8,
      evidence: { latestLedger: 123456 },
      failureKind: "assertion_failed",
      failureMessage: "expected value > 0",
      assertions: [
        {
          id: "run-1:step:0:assertion:0",
          ordinal: 0,
          path: "$.value",
          operator: "gt",
          expected: "0",
          observed: "0",
          passed: false,
          reason: "comparison_failed"
        }
      ]
    }
  ]
};

const incident = {
  id: "incident-1",
  checkId: "payments:health",
  openedAt: "2026-09-29T18:30:01.000Z",
  recoveredAt: null,
  state: "open",
  openingRunId: "run-1",
  recoveryRunId: null,
  failureCount: 2,
  summary: "Health failed 2 consecutive runs",
  checkName: "Health",
  serviceId: "payments",
  serviceName: "Payments"
};

function json(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body)
  });
  response.end(body);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = decodeURIComponent(url.pathname);

  if (request.method === "GET" && path === "/api/v1/services") {
    json(response, 200, {
      services: [
        {
          id: "payments",
          name: "Payments",
          configHash: "config-e2e",
          createdAt: "2026-09-29T18:00:00.000Z",
          updatedAt: "2026-09-29T18:00:00.000Z",
          checkCount: 1,
          enabledCheckCount: 1
        }
      ]
    });
    return;
  }

  if (request.method === "GET" && path === "/api/v1/services/payments") {
    json(response, 200, {
      service: {
        id: "payments",
        name: "Payments",
        configHash: "config-e2e",
        createdAt: "2026-09-29T18:00:00.000Z",
        updatedAt: "2026-09-29T18:00:00.000Z",
        checkCount: 1,
        enabledCheckCount: 1,
        checks: [check]
      }
    });
    return;
  }

  if (request.method === "GET" && path === "/api/v1/checks/payments:health") {
    json(response, 200, {
      check,
      policy: {
        timeout: "10s",
        incidentPolicy: { failuresToOpen: 2, passesToRecover: 2 },
        slo: {
          target: 99.9,
          window: "7d",
          minEligibleRuns: 10,
          maxObserverErrorRate: 1
        }
      },
      recentRuns: [run],
      incidents: [incident]
    });
    return;
  }

  if (request.method === "GET" && path === "/api/v1/checks/payments:health/slo") {
    json(response, 200, {
      checkId: "payments:health",
      slo: {
        windowStart: "2026-09-22T18:30:00.000Z",
        windowEnd: "2026-09-29T18:30:00.000Z",
        target: 99.9,
        observedSli: 99.5,
        eligibleRuns: 200,
        passingRuns: 199,
        serviceFailures: 1,
        observerErrors: 0,
        cancelledRuns: 0,
        dataCoverage: 100,
        observerErrorRate: 0,
        errorBudgetConsumptionRatio: 5,
        status: "breached"
      }
    });
    return;
  }

  if (request.method === "GET" && path === "/api/v1/incidents") {
    json(response, 200, { incidents: [incident] });
    return;
  }

  if (request.method === "GET" && path === "/api/v1/incidents/incident-1") {
    json(response, 200, {
      incident,
      notifications: [
        {
          id: "attempt-1",
          incidentId: "incident-1",
          channelId: "ops",
          eventType: "opened",
          attempt: 1,
          startedAt: "2026-09-29T18:30:02.000Z",
          finishedAt: "2026-09-29T18:30:02.100Z",
          state: "delivered",
          responseCode: 204,
          errorClass: null
        }
      ]
    });
    return;
  }

  if (request.method === "GET" && path === "/api/v1/runs/run-1") {
    json(response, 200, { run });
    return;
  }

  if (request.method === "POST" && path === "/api/v1/checks/payments:health/run") {
    json(response, 202, {
      requestId: "request-e2e",
      runId: "manual-run",
      state: "pass",
      incidentEvent: null
    });
    return;
  }

  json(response, 404, { error: "not_found", path });
});

server.listen(PORT, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
