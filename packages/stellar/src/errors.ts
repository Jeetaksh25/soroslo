export type ObserverErrorCode =
  | "timeout"
  | "rate_limited"
  | "upstream_unavailable"
  | "transport_error"
  | "network_mismatch"
  | "invalid_rpc_response"
  | "internal_error";

export class StellarObserverError extends Error {
  readonly code: ObserverErrorCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    code: ObserverErrorCode,
    message: string,
    options: { retryable?: boolean; status?: number; cause?: unknown } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "StellarObserverError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function readHttpStatus(error: unknown): number | undefined {
  const record = asRecord(error);
  if (!record) return undefined;

  if (typeof record.status === "number") return record.status;

  const response = asRecord(record.response);
  if (typeof response?.status === "number") return response.status;

  return undefined;
}

function readCode(error: unknown): string | undefined {
  const record = asRecord(error);
  return typeof record?.code === "string" ? record.code : undefined;
}

export function classifyObserverError(error: unknown): StellarObserverError {
  if (error instanceof StellarObserverError) return error;

  const status = readHttpStatus(error);
  const code = readCode(error);
  const message = error instanceof Error ? error.message : String(error);

  if (
    code === "ETIMEDOUT" ||
    code === "ECONNABORTED" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    /timeout/i.test(message)
  ) {
    return new StellarObserverError("timeout", "Stellar RPC request timed out", {
      retryable: true,
      status,
      cause: error
    });
  }

  if (status === 429) {
    return new StellarObserverError("rate_limited", "Stellar RPC rate limited the request", {
      retryable: true,
      status,
      cause: error
    });
  }

  if (status !== undefined && status >= 500) {
    return new StellarObserverError(
      "upstream_unavailable",
      `Stellar RPC returned HTTP ${status}`,
      { retryable: true, status, cause: error }
    );
  }

  if (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN"
  ) {
    return new StellarObserverError("transport_error", "Unable to reach Stellar RPC", {
      retryable: true,
      status,
      cause: error
    });
  }

  return new StellarObserverError("internal_error", message || "Unknown Stellar RPC error", {
    retryable: false,
    status,
    cause: error
  });
}

export function isRetryableObserverError(error: unknown): boolean {
  return classifyObserverError(error).retryable;
}
