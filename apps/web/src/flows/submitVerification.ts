"use client";

import { coreClient } from "@/adapters/core-client";
import { extractErrorCode } from "@/adapters/errors";
import type { GenLayerClient } from "@/adapters/genlayer-client";
import { governanceClient } from "@/adapters/governance-client";
import { registryClient } from "@/adapters/registry-client";
import type { Module } from "@/domain/types";
import type { TxFailureKind } from "@/lib/tx-lifecycle";

export type SubmitPhase =
  | "idle"
  | "preparing"
  | "awaiting_wallet"
  | "submitted"
  | "deciding"
  | "finalizing"
  | "finalized"
  | "failed";

export interface SubmitFailure {
  readonly kind: TxFailureKind;
  readonly message: string;
  readonly code?: string;
  /** True when the failure is the snapshot-staleness case (Rule 13 recovery). */
  readonly snapshotStale?: boolean;
}

export interface SubmitSuccess {
  readonly taskId: string;
  readonly txHash: string;
}

const PENDING_TX_KEY = "veritas:pending-tx";

function persistTxHash(txHash: string): void {
  try {
    sessionStorage.setItem(PENDING_TX_KEY, txHash);
  } catch {
    // Storage unavailable (private mode) — tracking continues in memory.
  }
}

export function readPendingTxHash(): string | null {
  try {
    return sessionStorage.getItem(PENDING_TX_KEY);
  } catch {
    return null;
  }
}

export function clearPendingTxHash(): void {
  try {
    sessionStorage.removeItem(PENDING_TX_KEY);
  } catch {
    // ignore
  }
}

function walletFailure(error: unknown): SubmitFailure {
  const message = error instanceof Error ? error.message : String(error);
  if (/reject|denied|cancelled|canceled/i.test(message)) {
    return { kind: "wallet_rejected", message: "The transaction was rejected in your wallet. Nothing was submitted — you can review and try again." };
  }
  return { kind: "provider_error", code: extractErrorCode(error) ?? undefined, message };
}

function contractFailure(error: unknown): SubmitFailure {
  const code = extractErrorCode(error);
  const described = code ? undefined : undefined;
  void described;
  if (code === "ERR:SNAPSHOT_HASH_MISMATCH") {
    return {
      kind: "contract_rejected",
      code,
      snapshotStale: true,
      message:
        "This module was updated while you were preparing the verification. The brief has been refreshed — review the updated policy, then submit again.",
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
      message: "The bond amount changed between loading and submission. Refresh the brief — the exact amount is filled in automatically — and reconfirm.",
    };
  }
  if (code === "ERR:MODULE_FLAGGED") {
    return {
      kind: "contract_rejected",
      code,
      message: "This module is not accepting new verifications. Use a different module.",
    };
  }
  if (code) {
    return {
      kind: "contract_rejected",
      code,
      message: `The protocol rejected the submission (${code}). Review the brief and try again, or inspect the technical details.`,
    };
  }
  return {
    kind: "provider_error",
    message: error instanceof Error ? error.message : String(error),
  };
}

export interface SubmitRunContext {
  readonly writeClient: GenLayerClient;
  readonly accountAddress: string;
  readonly onPhase: (phase: SubmitPhase) => void;
}

export interface SubmitRunInput {
  readonly module: Module;
  readonly outputRef: string;
  readonly contextRef: string;
  readonly metadata: string;
}

export type SubmitRunResult = SubmitSuccess | SubmitFailure;

function isSubmitSuccess(result: SubmitRunResult): result is SubmitSuccess {
  return "taskId" in result;
}

/**
 * Full honest submit orchestration (Phase 3):
 * prepare (fresh module bundle, live bond, rate limit, pause) -> wallet write
 * with the EXACT bond -> wait FINALIZED -> validate execution result ->
 * recover the task id. Returns a discriminated result; never throws.
 */
export async function runSubmitVerification(
  ctx: SubmitRunContext,
  input: SubmitRunInput,
): Promise<SubmitRunResult> {
  try {
    ctx.onPhase("preparing");

    // Fresh module bundle at submit time (Rule 13) — hash-verified by the contract.
    const mod = await registryClient.getModule(input.module.moduleId);
    if (mod.snapshotHash !== input.module.snapshotHash) {
      return {
        kind: "contract_rejected",
        code: "ERR:SNAPSHOT_HASH_MISMATCH",
        snapshotStale: true,
        message:
          "This module was updated while you were preparing the verification. The brief has been refreshed — review the updated policy, then submit again.",
      };
    }

    const paused = await governanceClient.isPaused();
    if (paused) {
      return {
        kind: "contract_rejected",
        code: "ERR:PROTOCOL_PAUSED",
        message: "New submissions are currently paused by protocol governance. Existing verifications are unaffected.",
      };
    }

    const bondAmount = await governanceClient.getBondAmount("submission");
    const rateStatus = await coreClient.getRateLimitStatus(ctx.accountAddress, mod.moduleId);
    if (rateStatus.remaining <= 0) {
      return {
        kind: "contract_rejected",
        code: "ERR:RATE_LIMIT_EXCEEDED",
        message: "You have reached the submission limit for this module in the current window. Wait for the window to reset, or verify against a different module.",
      };
    }

    ctx.onPhase("awaiting_wallet");
    let txHash: string;
    try {
      txHash = await ctx.writeClient.writeContract({
        account: { address: ctx.accountAddress as `0x${string}`, type: "json-rpc" } as never,
        address: coreClient.contractAddress,
        functionName: "submit",
        args: [
          input.outputRef,
          input.contextRef,
          input.metadata,
          mod.moduleId,
          mod.owner,
          mod.moduleType,
          mod.scoringScale,
          mod.evaluationMethod,
          mod.evalPrompt,
          mod.criteria,
          mod.scoreTolerance,
          mod.acceptThreshold,
          mod.scoreThresholdBorderline,
          mod.minConfidence,
          mod.version,
          mod.snapshotHash,
          mod.maxDisputeRounds,
          mod.challengeWindowSec,
          mod.requireInlineContent,
        ] as never[],
        value: bondAmount,
      });
    } catch (error) {
      return walletFailure(error);
    }

    persistTxHash(String(txHash));
    ctx.onPhase("submitted");
    ctx.onPhase("deciding");

    const receipt = (await ctx.writeClient.waitForTransactionReceipt({
      hash: txHash as never,
      status: "FINALIZED" as never,
    })) as Record<string, unknown>;

    const executionResult = String(receipt.txExecutionResult ?? receipt.txExecutionResultName ?? "");

    if (executionResult === "FINISHED_WITH_ERROR") {
      clearPendingTxHash();
      const code = extractErrorCode(receipt);
      return contractFailure(new Error(code ? `${code}` : "execution failed"));
    }
    if (executionResult !== "FINISHED_WITH_RETURN") {
      return {
        kind: "timeout_unknown",
        message: `Consensus has not finalized this transaction (execution result: ${executionResult || "unknown"}). Its hash is preserved below — do not blindly resubmit; track it and retry the check.`,
        code: executionResult || undefined,
      };
    }

    ctx.onPhase("finalizing");

    // Task-ID recovery (ARCHITECTURE.md §3.3): receipt return value first,
    // then the newest entry of the submitter's bounded task list.
    let taskId: string | null = null;
    for (const key of ["return_value", "returnValue", "return_data", "returnData"]) {
      const candidate = receipt[key];
      if (typeof candidate === "string" && /^VT-\d{8}-0x[0-9a-fA-F]+$/.test(candidate)) {
        taskId = candidate;
        break;
      }
    }
    if (!taskId) {
      const ids = await coreClient.getTasksBySubmitter(ctx.accountAddress, 0, 50);
      taskId = ids.length > 0 ? (ids[ids.length - 1] ?? null) : null;
    }

    if (!taskId) {
      return {
        kind: "provider_error",
        message:
          "The transaction succeeded, but the verification ID could not be read back yet. Track the hash below and inspect it shortly — do not resubmit (the task may already exist).",
      };
    }

    clearPendingTxHash();
    ctx.onPhase("finalized");
    return { taskId, txHash: String(txHash) };
  } catch (error) {
    return {
      kind: "provider_error",
      code: extractErrorCode(error) ?? undefined,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export { isSubmitSuccess };
