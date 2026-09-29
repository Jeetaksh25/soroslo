import { setTimeout as sleep } from "node:timers/promises";
import { rpc, type Transaction } from "@stellar/stellar-sdk";
import { StellarObserverError, classifyObserverError, type ObserverErrorCode } from "./errors.js";
import type { ResolvedNetworkConfig } from "./network.js";

export interface RpcRetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  random?: () => number;
}

export interface RpcIdentity {
  passphrase: string;
  protocolVersion: string;
  latestLedger: number;
  oldestLedger: number;
  ledgerRetentionWindow: number;
  endpointOrigin: string;
  endpointFingerprint: string;
}

export interface StellarRpcClientOptions {
  timeoutMs?: number;
  retry?: RpcRetryOptions;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 200;
const DEFAULT_MAX_DELAY_MS = 2_000;

function delayForAttempt(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  random: () => number
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
  const jitter = 0.75 + random() * 0.5;
  return Math.round(exponential * jitter);
}

export class StellarRpcClient {
  readonly config: ResolvedNetworkConfig;
  readonly server: rpc.Server;
  private readonly retry: Required<RpcRetryOptions>;
  private verifiedIdentity?: RpcIdentity;

  constructor(config: ResolvedNetworkConfig, options: StellarRpcClientOptions = {}) {
    this.config = config;
    this.server = new rpc.Server(config.rpcUrl);

    this.server.httpClient.defaults.timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    this.retry = {
      attempts: options.retry?.attempts ?? DEFAULT_ATTEMPTS,
      baseDelayMs: options.retry?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS,
      maxDelayMs: options.retry?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS,
      random: options.retry?.random ?? Math.random
    };

    if (!Number.isInteger(this.retry.attempts) || this.retry.attempts < 1) {
      throw new TypeError("RPC retry attempts must be an integer >= 1");
    }
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: StellarObserverError | undefined;

    for (let attempt = 1; attempt <= this.retry.attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = classifyObserverError(error);

        if (!lastError.retryable || attempt === this.retry.attempts) {
          throw lastError;
        }

        await sleep(
          delayForAttempt(attempt, this.retry.baseDelayMs, this.retry.maxDelayMs, this.retry.random)
        );
      }
    }

    throw (
      lastError ?? new StellarObserverError("internal_error", "RPC retry loop exited unexpectedly")
    );
  }

  async verifyNetwork(options: { refresh?: boolean } = {}): Promise<RpcIdentity> {
    if (this.verifiedIdentity && !options.refresh) return this.verifiedIdentity;

    const [network, health] = await this.execute(async () =>
      Promise.all([this.server.getNetwork(), this.server.getHealth()])
    );

    if (network.passphrase !== this.config.networkPassphrase) {
      throw new StellarObserverError(
        "network_mismatch",
        `RPC network passphrase does not match configured network '${this.config.name}'`,
        { retryable: false }
      );
    }

    const identity: RpcIdentity = {
      passphrase: network.passphrase,
      protocolVersion: network.protocolVersion,
      latestLedger: health.latestLedger,
      oldestLedger: health.oldestLedger,
      ledgerRetentionWindow: health.ledgerRetentionWindow,
      endpointOrigin: this.config.endpointOrigin,
      endpointFingerprint: this.config.endpointFingerprint
    };

    this.verifiedIdentity = identity;
    return identity;
  }

  async simulateTransaction(
    transaction: Transaction
  ): Promise<rpc.Api.SimulateTransactionResponse> {
    await this.verifyNetwork();
    return this.execute(() => this.server.simulateTransaction(transaction));
  }
}

export function observerErrorCode(error: unknown): ObserverErrorCode {
  return classifyObserverError(error).code;
}
