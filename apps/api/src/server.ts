import { randomUUID } from "node:crypto";
import type { CheckConfig, SoroSloConfig } from "@soroslo/config";
import { parseDurationMs } from "@soroslo/shared";
import { calculateSloSnapshot } from "@soroslo/slo-engine";
import { qualifiedCheckId, type SoroSloStorage } from "@soroslo/storage";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { assertRemoteBindIsAuthenticated, requestHasBearerToken } from "./security.js";

export interface ManualRunResponse {
  runId: string;
  state: string;
  incidentEvent: string | null;
}

export type ManualRunHandler = (input: {
  serviceId: string;
  check: CheckConfig;
  requestId: string;
}) => Promise<ManualRunResponse>;

export interface ApiOptions {
  storage: SoroSloStorage;
  config: SoroSloConfig;
  configHash: string;
  version?: string;
  manualRun?: ManualRunHandler;
  ready?: () => boolean;
  adminToken?: string;
  now?: () => Date;
}

interface CheckLocation {
  serviceId: string;
  check: CheckConfig;
}

function findCheck(config: SoroSloConfig, checkId: string): CheckLocation | null {
  for (const service of config.services) {
    for (const check of service.checks) {
      if (qualifiedCheckId(service.id, check.id) === checkId) {
        return { serviceId: service.id, check };
      }
    }
  }
  return null;
}

function notFound(reply: FastifyReply, resource: string): FastifyReply {
  return reply.code(404).send({
    error: "not_found",
    message: `${resource} was not found`
  });
}

function parseLimit(request: FastifyRequest): number {
  const query = request.query as Record<string, unknown>;
  const raw = query.limit;
  if (raw === undefined) return 50;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) {
    throw new RangeError("limit must be an integer between 1 and 200");
  }
  return parsed;
}

export function buildApi(options: ApiOptions): FastifyInstance {
  const app = Fastify({
    logger: false,
    disableRequestLogging: true
  });

  app.addHook("onRequest", (request, reply, done) => {
    if (!options.adminToken) {
      done();
      return;
    }

    if (!requestHasBearerToken(request, options.adminToken)) {
      void reply.header("www-authenticate", 'Bearer realm="SoroSLO"').code(401).send({
        error: "unauthorized",
        message: "A valid SoroSLO administrator bearer token is required"
      });
      return;
    }

    done();
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof RangeError || error instanceof TypeError) {
      void reply.code(400).send({
        error: "bad_request",
        message: error.message
      });
      return;
    }

    void reply.code(500).send({
      error: "internal_error",
      message: "An internal SoroSLO API error occurred"
    });
  });

  app.get("/healthz", () => ({
    status: "ok"
  }));

  app.get("/readyz", (_request, reply) => {
    const ready = options.ready?.() ?? true;
    if (!ready) {
      return reply.code(503).send({ status: "not_ready" });
    }
    return { status: "ready" };
  });

  app.get("/api/v1/version", () => ({
    version: options.version ?? "0.0.0",
    configVersion: options.config.version,
    configHash: options.configHash
  }));

  app.get("/api/v1/services", () => ({
    services: options.storage.listServices()
  }));

  app.get("/api/v1/services/:serviceId", async (request, reply) => {
    const { serviceId } = request.params as { serviceId: string };
    const service = options.storage.getServiceDetail(serviceId);
    if (!service) return notFound(reply, "service");
    return { service };
  });

  app.get("/api/v1/checks/:checkId", async (request, reply) => {
    const { checkId } = request.params as { checkId: string };
    const check = options.storage.getCheckSummary(checkId);
    if (!check) return notFound(reply, "check");

    const configured = findCheck(options.config, checkId);
    const incidents = options.storage.listIncidents({ checkId, limit: 20 });
    const recentRuns = options.storage.listRuns(checkId, 20);

    return {
      check,
      policy: configured
        ? {
            timeout: configured.check.timeout ?? options.config.runtime.defaultTimeout,
            incidentPolicy: configured.check.incidentPolicy ?? {
              failuresToOpen: 2,
              passesToRecover: 2
            },
            slo: configured.check.slo ?? null
          }
        : null,
      recentRuns,
      incidents
    };
  });

  app.get("/api/v1/checks/:checkId/runs", async (request, reply) => {
    const { checkId } = request.params as { checkId: string };
    if (!options.storage.getCheckSummary(checkId)) return notFound(reply, "check");

    const query = request.query as Record<string, unknown>;
    const before = typeof query.before === "string" ? query.before : undefined;
    if (before !== undefined && !Number.isFinite(Date.parse(before))) {
      throw new TypeError("before must be an ISO-compatible timestamp");
    }

    return {
      runs: options.storage.listRuns(checkId, parseLimit(request), before)
    };
  });

  app.get("/api/v1/runs/:runId", async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const run = options.storage.getRunDetail(runId);
    if (!run) return notFound(reply, "run");
    return { run };
  });

  app.get("/api/v1/checks/:checkId/slo", async (request, reply) => {
    const { checkId } = request.params as { checkId: string };
    const configured = findCheck(options.config, checkId);
    if (!configured) return notFound(reply, "check");

    if (!configured.check.slo) {
      return {
        checkId,
        slo: null
      };
    }

    const now = options.now?.() ?? new Date();
    const since = new Date(
      now.getTime() - parseDurationMs(configured.check.slo.window)
    ).toISOString();
    const runs = options.storage.listReliabilityRuns(checkId, since, now.toISOString());

    return {
      checkId,
      slo: calculateSloSnapshot(runs, configured.check.slo, { now })
    };
  });

  app.get("/api/v1/incidents", (request) => {
    const query = request.query as Record<string, unknown>;
    const state = query.state === "open" || query.state === "recovered" ? query.state : undefined;
    const checkId = typeof query.checkId === "string" ? query.checkId : undefined;

    return {
      incidents: options.storage.listIncidents({
        ...(state !== undefined ? { state } : {}),
        ...(checkId !== undefined ? { checkId } : {}),
        limit: parseLimit(request)
      })
    };
  });

  app.get("/api/v1/incidents/:incidentId", async (request, reply) => {
    const { incidentId } = request.params as { incidentId: string };
    const incident = options.storage.getIncident(incidentId);
    if (!incident) return notFound(reply, "incident");

    return {
      incident,
      notifications: options.storage.listNotificationAttempts(incidentId)
    };
  });

  app.post("/api/v1/checks/:checkId/run", async (request, reply) => {
    const { checkId } = request.params as { checkId: string };
    const configured = findCheck(options.config, checkId);
    if (!configured) return notFound(reply, "check");

    if (!options.manualRun) {
      return reply.code(503).send({
        error: "manual_run_unavailable",
        message: "Manual execution is not configured for this API process"
      });
    }

    const requestId = randomUUID();
    const result = await options.manualRun({
      serviceId: configured.serviceId,
      check: configured.check,
      requestId
    });

    return reply.code(202).send({
      requestId,
      ...result
    });
  });

  return app;
}

export async function startApi(
  options: ApiOptions & { host?: string; port?: number }
): Promise<FastifyInstance> {
  const host = options.host ?? "127.0.0.1";
  assertRemoteBindIsAuthenticated(host, options.adminToken);

  const app = buildApi(options);
  await app.listen({
    host,
    port: options.port ?? 3001
  });
  return app;
}
