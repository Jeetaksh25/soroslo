import { rpc } from "@stellar/stellar-sdk";
import { normalizeScVal, type NormalizedValue } from "./normalize.js";

export type SimulationEvidenceStatus = "success" | "restore_required" | "simulation_error";

export interface SimulationResourceEvidence {
  instructions: number;
  diskReadBytes: number;
  writeBytes: number;
  readOnlyEntries: number;
  readWriteEntries: number;
}

export interface SimulationEvidence {
  status: SimulationEvidenceStatus;
  latestLedger: number;
  endpointFingerprint: string;
  elapsedMs: number;
  diagnosticEventCount: number;
  minResourceFee?: string;
  resources?: SimulationResourceEvidence;
  result?: NormalizedValue;
  rawReturnXdr?: string;
  error?: string;
}

function resourceEvidence(
  response: rpc.Api.SimulateTransactionSuccessResponse
): SimulationResourceEvidence {
  const data = response.transactionData.build();
  const resources = data.resources;
  return {
    instructions: resources.instructions,
    diskReadBytes: resources.diskReadBytes,
    writeBytes: resources.writeBytes,
    readOnlyEntries: resources.footprint.readOnly.length,
    readWriteEntries: resources.footprint.readWrite.length
  };
}

export function toSimulationEvidence(
  response: rpc.Api.SimulateTransactionResponse,
  context: { endpointFingerprint: string; elapsedMs: number }
): SimulationEvidence {
  const base = {
    latestLedger: response.latestLedger,
    endpointFingerprint: context.endpointFingerprint,
    elapsedMs: context.elapsedMs,
    diagnosticEventCount: response.events.length
  };

  if (rpc.Api.isSimulationError(response)) {
    return {
      ...base,
      status: "simulation_error",
      error: response.error
    };
  }

  const commonSuccess = {
    ...base,
    status: rpc.Api.isSimulationRestore(response)
      ? ("restore_required" as const)
      : ("success" as const),
    minResourceFee: response.minResourceFee,
    resources: resourceEvidence(response)
  };

  if (!response.result) return commonSuccess;

  return {
    ...commonSuccess,
    result: normalizeScVal(response.result.retval),
    rawReturnXdr: Buffer.from(response.result.retval.toXdr()).toString("base64")
  };
}
