/**
 * Shared transaction runtime for ALL protocol writes (submit, evaluate,
 * finalize, dispute, challenge): ONE implementation of wait-for-finalization,
 * execution-result validation, and failure classification. No artificial
 * delays; no optimistic finality (D-10).
 */
import { extractErrorCode } from "@/adapters/errors";
import type { GenLayerClient } from "@/adapters/genlayer-client";
import type { Hex } from "@/domain/types";
import type { TxFailureKind } from "./tx-lifecycle";

export interface ProtocolWriteFailure {
  readonly kind: TxFailureKind;
  readonly message: string;
  readonly code?: string;
  /** True for the snapshot-staleness case (Rule 13 recovery). */
  readonly snapshotStale?: boolean;
}

/** Thrown by adapter write methods; carries the classified failure. */
export class ProtocolWriteError extends Error {
  readonly kind: TxFailureKind;
  readonly code?: string;
  readonly snapshotStale?: boolean;

  constructor(failure: ProtocolWriteFailure) {
    super(failure.message);
    this.name = "ProtocolWriteError";
    this.kind = failure.kind;
    this.code = failure.code;
    this.snapshotStale = failure.snapshotStale;
  }
}

export function walletFailure(error: unknown): ProtocolWriteFailure {
  const message = error instanceof Error ? error.message : String(error);
  if (/reject|denied|cancelled|canceled/i.test(message)) {
    return {
      kind: "wallet_rejected",
      message: "The transaction was rejected in your wallet. Nothing was submitted — you can review and try again.",
    };
  }
  return {
    kind: "provider_error",
    code: extractErrorCode(error) ?? undefined,
    message,
  };
}

export function contractFailure(error: unknown): ProtocolWriteFailure {
  const code = extractErrorCode(error);
  if (code === "ERR:SNAPSHOT_HASH_MISMATCH") {
    return {
      kind: "contract_rejected",
      code,
      snapshotStale: true,
      message:
        "This module was updated while you were preparing the transaction. The brief has been refreshed — review the updated policy, then try again.",
    };
  }
  if (code === "ERR:RATE_LIMIT_EXCEEDED") {
    return {
      kind: "contract_rejected",
      code,
      message: "You have reached the submission limit for this module in the current window. Wait for the window to reset, or verify against a different module.",
    };
  }
  if (code === "ERR:PROTOCOL_PAUSED") {
    return {
      kind: "contract_rejected",
      code,
      message: "New submissions are currently paused by protocol governance. Existing verifications are unaffected.",
    };
  }
  if (code === "ERR:INCORRECT_BOND_AMOUNT") {
    return {
      kind: "contract_rejected",
      code,
      message: "The bond amount changed between loading and submission. Refresh the page — the exact amount is filled in automatically — and reconfirm.",
    };
  }
  if (code === "ERR:MODULE_FLAGGED") {
    return {
      kind: "contract_rejected",
      code,
      message: "This module is not accepting new verifications. Use a different module.",
    };
  }
  if (code === "ERR:TASK_NOT_FOUND") {
    return { kind: "contract_rejected", code, message: "That verification does not exist on-chain." };
  }
  if (code === "ERR:TASK_NOT_EVALUATED") {
    return {
      kind: "contract_rejected",
      code,
      message: "This action requires an evaluated verification. Trigger evaluation first.",
    };
  }
  if (code === "ERR:NOT_TASK_SUBMITTER") {
    return {
      kind: "contract_rejected",
      code,
      message: "Only the original submitter can perform this action.",
    };
  }
  if (code === "ERR:CANNOT_DISPUTE_UNCERTAIN") {
    return {
      kind: "contract_rejected",
      code,
      message: "UNCERTAIN results cannot be disputed by the submitter.",
    };
  }
  if (code === "ERR:COOLDOWN_ACTIVE") {
    return {
      kind: "contract_rejected",
      code,
      message: "A recent dispute on this verification is still in cooldown (one hour between disputes).",
    };
  }
  if (code === "ERR:MAX_DISPUTE_ROUNDS_REACHED") {
    return {
      kind: "contract_rejected",
      code,
      message: "This verification has no dispute rounds remaining — the current result is final.",
    };
  }
  if (code === "ERR:SUBMITTER_MUST_USE_DISPUTE_BY_SUBMITTER") {
    return {
      kind: "contract_rejected",
      code,
      message: "Challenges are for third parties. The original submitter uses the dispute action instead.",
    };
  }
  if (code === "ERR:ONLY_VALID_RESULTS_ARE_CHALLENGEABLE") {
    return {
      kind: "contract_rejected",
      code,
      message: "Only VALID results can be challenged by third parties.",
    };
  }
  if (code === "ERR:CHALLENGE_WINDOW_EXPIRED") {
    return { kind: "contract_rejected", code, message: "The challenge window has closed — the result stands." };
  }
  if (code === "ERR:CHALLENGE_WINDOW_NOT_ELAPSED") {
    return {
      kind: "contract_rejected",
      code,
      message: "This VALID result is still within its challenge window. Finalization unlocks once the window elapses.",
    };
  }
  if (code) {
    return {
      kind: "contract_rejected",
      code,
      message: `The protocol rejected the transaction (${code}). Review the details and try again.`,
    };
  }
  return { kind: "provider_error", message: error instanceof Error ? error.message : String(error) };
}

/** The SDK receipt may expose the execution result under either field name. */
export function extractExecutionResult(receipt: unknown): string {
  if (receipt === null || typeof receipt !== "object") return "";
  const record = receipt as Record<string, unknown>;
  return String(record.txExecutionResult ?? record.txExecutionResultName ?? "");
}

/**
 * Wait for FINALIZED (durable completion). A timeout here is NOT failure:
 * callers keep the tx hash and never blind-retry.
 */
export async function waitForFinalizedReceipt(
  writeClient: GenLayerClient,
  txHash: string,
): Promise<Record<string, unknown>> {
  return (await writeClient.waitForTransactionReceipt({
    hash: txHash as never,
    status: "FINALIZED" as never,
  })) as Record<string, unknown>;
}

export interface ProtocolWriteResult {
  readonly txHash: string;
  readonly executionResult: string;
  /** Full finalized receipt — used for return-value recovery (e.g. action IDs). */
  readonly receipt: Record<string, unknown>;
}

/**
 * THE single write cycle for every protocol write: wallet write -> wait
 * FINALIZED -> validate execution result. Failures throw ProtocolWriteError.
 */
export async function protocolWrite(
  writeClient: GenLayerClient,
  accountAddress: string,
  address: Hex,
  action: { readonly functionName: string; readonly args: readonly unknown[]; readonly value?: bigint },
): Promise<ProtocolWriteResult> {
  let txHash: string;
  try {
    txHash = String(
      await writeClient.writeContract({
        account: { address: accountAddress as `0x${string}`, type: "json-rpc" } as never,
        address,
        functionName: action.functionName,
        args: [...action.args] as never[],
        value: action.value ?? 0n,
      }),
    );
  } catch (error) {
    throw new ProtocolWriteError(walletFailure(error));
  }

  const receipt = await waitForFinalizedReceipt(writeClient, txHash);
  const executionResult = extractExecutionResult(receipt);

  if (executionResult === "FINISHED_WITH_ERROR") {
    const code = extractErrorCode(receipt);
    throw new ProtocolWriteError(
      code
        ? contractFailure(new Error(code))
        : {
            kind: "contract_rejected",
            message: "The protocol rejected the transaction during execution. Review the details and try again.",
          },
    );
  }
  if (executionResult !== "FINISHED_WITH_RETURN") {
    throw new ProtocolWriteError({
      kind: "timeout_unknown",
      code: executionResult || undefined,
      message: `Consensus has not finalized this transaction (execution result: ${executionResult || "unknown"}). Its hash is preserved — do not blindly resubmit; track it and retry.`,
    });
  }
  return { txHash, executionResult, receipt };
}

/** Extract a decoded contract return value (e.g. an action id) from a receipt. */
export function extractReturnValue(receipt: Record<string, unknown>): string | null {
  for (const key of ["return_value", "returnValue", "return_data", "returnData"]) {
    const candidate = receipt[key];
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return null;
}
