/**
 * Shared transaction runtime for ALL protocol writes (submit, evaluate,
 * finalize, dispute, challenge): ONE implementation of wait-for-finalization,
 * execution-result validation, and failure classification. No artificial
 * delays; no optimistic finality (D-10).
 *
 * GenLayer consensus (especially LLM evaluation) can take 1\u201330 minutes.
 * We poll generously and NEVER claim finality before the chain confirms it.
 */
import { extractErrorCode } from "@/adapters/errors";
import type { GenLayerClient } from "@/adapters/genlayer-client";
import type { Hex } from "@/domain/types";
import type { TxFailureKind } from "./tx-lifecycle";

export interface ProtocolWriteFailure {
  readonly kind: TxFailureKind;
  readonly message: string;
  readonly code?: string;
  readonly snapshotStale?: boolean;
}

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
      message: "The transaction was rejected in your wallet. Nothing was submitted \u2014 you can review and try again.",
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
        "This module was updated while you were preparing the transaction. The brief has been refreshed \u2014 review the updated policy, then try again.",
    };
  }
  if (code === "ERR:RATE_LIMIT_EXCEEDED") {
    return { kind: "contract_rejected", code, message: "You have reached the submission limit for this module in the current window. Wait for the window to reset, or verify against a different module." };
  }
  if (code === "ERR:PROTOCOL_PAUSED") {
    return { kind: "contract_rejected", code, message: "New submissions are currently paused by protocol governance. Existing verifications are unaffected." };
  }
  if (code === "ERR:INCORRECT_BOND_AMOUNT") {
    return { kind: "contract_rejected", code, message: "The bond amount changed between loading and submission. Refresh the page \u2014 the exact amount is filled in automatically \u2014 and reconfirm." };
  }
  if (code === "ERR:MODULE_FLAGGED") {
    return { kind: "contract_rejected", code, message: "This module is not accepting new verifications. Use a different module." };
  }
  if (code === "ERR:TASK_NOT_FOUND") {
    return { kind: "contract_rejected", code, message: "That verification does not exist on-chain." };
  }
  if (code === "ERR:TASK_NOT_EVALUATED") {
    return { kind: "contract_rejected", code, message: "This action requires an evaluated verification. Trigger evaluation first." };
  }
  if (code === "ERR:NOT_TASK_SUBMITTER") {
    return { kind: "contract_rejected", code, message: "Only the original submitter can perform this action." };
  }
  if (code === "ERR:CANNOT_DISPUTE_UNCERTAIN") {
    return { kind: "contract_rejected", code, message: "UNCERTAIN results cannot be disputed by the submitter." };
  }
  if (code === "ERR:COOLDOWN_ACTIVE") {
    return { kind: "contract_rejected", code, message: "A recent dispute on this verification is still in cooldown (one hour between disputes)." };
  }
  if (code === "ERR:MAX_DISPUTE_ROUNDS_REACHED") {
    return { kind: "contract_rejected", code, message: "This verification has no dispute rounds remaining \u2014 the current result is final." };
  }
  if (code === "ERR:SUBMITTER_MUST_USE_DISPUTE_BY_SUBMITTER") {
    return { kind: "contract_rejected", code, message: "Challenges are for third parties. The original submitter uses the dispute action instead." };
  }
  if (code === "ERR:ONLY_VALID_RESULTS_ARE_CHALLENGEABLE") {
    return { kind: "contract_rejected", code, message: "Only VALID results can be challenged by third parties." };
  }
  if (code === "ERR:CHALLENGE_WINDOW_EXPIRED") {
    return { kind: "contract_rejected", code, message: "The challenge window has closed \u2014 the result stands." };
  }
  if (code === "ERR:CHALLENGE_WINDOW_NOT_ELAPSED") {
    return { kind: "contract_rejected", code, message: "This VALID result is still within its challenge window. Finalization unlocks once the window elapses." };
  }
  if (code === "ERR:MODULE_NOT_APPROVED_BY_GOVERNANCE" || code === "ERR:MODULE_FLAG_NOT_APPROVED_BY_GOVERNANCE") {
    return { kind: "contract_rejected", code, message: "Governance has not approved flagging this module. Complete the governance action first." };
  }
  if (code) {
    return { kind: "contract_rejected", code, message: `The protocol rejected the transaction (${code}). Review the details and try again.` };
  }
  return { kind: "provider_error", message: error instanceof Error ? error.message : String(error) };
}

export function extractExecutionResult(receipt: unknown): string {
  if (receipt === null || typeof receipt !== "object") return "";
  const record = receipt as Record<string, unknown>;
  return String(record.txExecutionResult ?? record.txExecutionResultName ?? "");
}

/**
 * Wait for FINALIZED. GenLayer consensus — especially LLM evaluation — can
 * take 1\u201330 minutes. We poll every 5 s for up to 30 minutes (360 retries).
 * A timeout is NOT failure: callers keep the tx hash and never blind-retry.
 */
export async function waitForFinalizedReceipt(
  writeClient: GenLayerClient,
  txHash: string,
  options?: { readonly interval?: number; readonly retries?: number },
): Promise<Record<string, unknown>> {
  return (await writeClient.waitForTransactionReceipt({
    hash: txHash as never,
    status: "FINALIZED" as never,
    interval: options?.interval ?? 5_000,
    retries: options?.retries ?? 360,
  })) as Record<string, unknown>;
}

export interface ProtocolWriteResult {
  readonly txHash: string;
  readonly executionResult: string;
  readonly receipt: Record<string, unknown>;
}

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

  if (executionResult === "ERROR" || executionResult === "FINISHED_WITH_ERROR" || executionResult === "REVERT") {
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
  if (executionResult && executionResult !== "SUCCESS" && executionResult !== "FINISHED_WITH_RETURN" && executionResult !== "MAJORITY_AGREE") {
    throw new ProtocolWriteError({
      kind: "timeout_unknown",
      code: executionResult || undefined,
      message: `Consensus has not finalized this transaction (execution result: ${executionResult || "unknown"}). Its hash is preserved \u2014 do not blindly resubmit; track it and retry.`,
    });
  }
  return { txHash, executionResult, receipt };
}

export function extractReturnValue(receipt: Record<string, unknown>): string | null {
  for (const key of ["return_value", "returnValue", "return_data", "returnData"]) {
    const candidate = receipt[key];
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return null;
}
