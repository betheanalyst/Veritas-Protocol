/**
 * CoreClient — typed adapter over VeritasCore (contracts/veritas_core.py).
 * Views implemented against the pinned genlayer-js@1.1.8; writes run through
 * the shared protocolWrite runtime with wallet-bound per-call accounts.
 */
import { getConfig } from "@/config/network";
import {
  mapDisputeEntry,
  mapDisputeSummary,
  mapProtocolInfo,
  mapRateLimitStatus,
  mapReputation,
  mapTask,
  mapTaskResult,
  toCount,
  toStr,
} from "@/domain/mappers";
import type {
  DisputeEntry,
  DisputeSummary,
  Hex,
  ProtocolInfo,
  RateLimitStatus,
  Reputation,
  Task,
  TaskResult,
} from "@/domain/types";
import { protocolWrite, type ProtocolWriteResult } from "@/lib/tx-runtime";

import { DEFAULT_STATE_STATUS, getReadClient, type GenLayerClient, type StateStatus } from "./genlayer-client";


export type CalldataArg = string | number | bigint | boolean | readonly CalldataArg[];

/**
 * submit() input — 3 task inputs + the 16 module-sourced fields. The module
 * object MUST come fresh from RegistryClient.getModule() (hash-verified by the
 * contract; never hand-assembled, never stale — Rule 13).
 */
export interface SubmitTaskInput {
  readonly outputRef: string;
  readonly contextRef: string;
  readonly metadata: string;
  readonly module: {
    readonly moduleId: string;
    readonly owner: Hex;
    readonly moduleType: string;
    readonly scoringScale: string;
    readonly evaluationMethod: string;
    readonly evalPrompt: string;
    readonly criteria: string;
    readonly scoreTolerance: number;
    readonly acceptThreshold: number;
    readonly scoreThresholdBorderline: number;
    readonly minConfidence: number;
    readonly moduleVersion: number;
    readonly snapshotHash: string;
    readonly maxDisputeRounds: number;
    readonly challengeWindowSec: number;
    readonly requireInlineContent: boolean;
  };
}

export class CoreClient {
  private get address(): Hex {
    return getConfig().env.contracts.core;
  }

  /** Public read-only accessor for flow orchestration (address only). */
  get contractAddress(): Hex {
    return this.address;
  }

  private async read(
    functionName: string,
    args: readonly CalldataArg[],
    stateStatus: StateStatus = DEFAULT_STATE_STATUS,
  ): Promise<unknown> {
    return getReadClient().readContract({
      address: this.address,
      functionName,
      args: [...args] as never[],
      transactionHashVariant: stateStatus,
    });
  }

  // ── Views (implemented) ──

  async getProtocolInfo(stateStatus?: StateStatus): Promise<ProtocolInfo> {
    const raw = (await this.read("get_protocol_info", [], stateStatus)) as Record<string, unknown>;
    return mapProtocolInfo(raw);
  }

  async getTotalTasks(stateStatus?: StateStatus): Promise<number> {
    return toCount(await this.read("get_total_tasks", [], stateStatus), "total_tasks");
  }

  async taskExists(taskId: string, stateStatus?: StateStatus): Promise<boolean> {
    return Boolean(await this.read("task_exists", [taskId], stateStatus));
  }

  async getTask(taskId: string, stateStatus?: StateStatus): Promise<Task> {
    const raw = (await this.read("get_task", [taskId], stateStatus)) as Record<string, unknown>;
    return mapTask(raw);
  }

  async getResult(taskId: string, stateStatus?: StateStatus): Promise<TaskResult> {
    const raw = (await this.read("get_result", [taskId], stateStatus)) as Record<string, unknown>;
    return mapTaskResult(raw);
  }

  /** Paginated submitter task IDs (contract caps limit at 50 per page). */
  async getTasksBySubmitter(
    submitterHex: string,
    offset: number,
    limit: number,
    stateStatus?: StateStatus,
  ): Promise<string[]> {
    const raw = (await this.read("get_tasks_by_submitter", [submitterHex, offset, limit], stateStatus)) as unknown[];
    return (raw ?? []).map((id) => toStr(id, "task_id"));
  }

  /** Batch task records (contract caps the batch at 20; unknown IDs silently skipped). */
  async getTaskBatch(taskIds: readonly string[], stateStatus?: StateStatus): Promise<Task[]> {
    const raw = (await this.read("get_task_batch", [[...taskIds]], stateStatus)) as unknown[];
    return (raw ?? []).map((entry) => mapTask(entry as Record<string, unknown>));
  }

  async getDisputeHistory(taskId: string, stateStatus?: StateStatus): Promise<DisputeEntry[]> {
    const raw = (await this.read("get_dispute_history", [taskId], stateStatus)) as unknown[];
    return (raw ?? []).map((entry) => mapDisputeEntry(entry as Record<string, unknown>));
  }

  async getDisputeCount(taskId: string, stateStatus?: StateStatus): Promise<number> {
    return toCount(await this.read("get_dispute_count", [taskId], stateStatus), "dispute_count");
  }

  async getRoundsRemaining(taskId: string, stateStatus?: StateStatus): Promise<number> {
    return toCount(await this.read("get_rounds_remaining", [taskId], stateStatus), "rounds_remaining");
  }

  async isCooldownActive(taskId: string, stateStatus?: StateStatus): Promise<boolean> {
    return Boolean(await this.read("is_cooldown_active", [taskId], stateStatus));
  }

  async getLastDisputeTs(taskId: string, stateStatus?: StateStatus): Promise<number> {
    return toCount(await this.read("get_last_dispute_ts", [taskId], stateStatus), "last_dispute_ts");
  }

  async getDisputeSummary(taskId: string, stateStatus?: StateStatus): Promise<DisputeSummary> {
    const raw = (await this.read("get_dispute_summary", [taskId], stateStatus)) as Record<string, unknown>;
    return mapDisputeSummary(raw);
  }

  async getModuleReputation(moduleId: string, stateStatus?: StateStatus): Promise<Reputation> {
    const raw = (await this.read("get_module_reputation", [moduleId], stateStatus)) as Record<string, unknown>;
    return mapReputation(raw);
  }

  async getRateLimitStatus(
    submitterHex: string,
    moduleId: string,
    stateStatus?: StateStatus,
  ): Promise<RateLimitStatus> {
    const raw = (await this.read("get_rate_limit_status", [submitterHex, moduleId], stateStatus)) as Record<string, unknown>;
    return mapRateLimitStatus(raw);
  }

  // ── Writes — full honest cycle: write -> wait FINALIZED -> validate ──
  // execution result. Wallet-bound (per-call account); failures are thrown as
  // ProtocolWriteError with classified kind + decoded ERR code.

  async evaluate(
    ctx: { readonly writeClient: GenLayerClient; readonly accountAddress: string },
    taskId: string,
  ): Promise<ProtocolWriteResult> {
    return protocolWrite(ctx.writeClient, ctx.accountAddress, this.address, {
      functionName: "evaluate",
      args: [taskId],
    });
  }

  async finalize(
    ctx: { readonly writeClient: GenLayerClient; readonly accountAddress: string },
    taskId: string,
  ): Promise<ProtocolWriteResult> {
    return protocolWrite(ctx.writeClient, ctx.accountAddress, this.address, {
      functionName: "finalize",
      args: [taskId],
    });
  }

  async disputeBySubmitter(
    ctx: { readonly writeClient: GenLayerClient; readonly accountAddress: string },
    taskId: string,
    disputeBond: bigint,
  ): Promise<ProtocolWriteResult> {
    return protocolWrite(ctx.writeClient, ctx.accountAddress, this.address, {
      functionName: "dispute_by_submitter",
      args: [taskId],
      value: disputeBond,
    });
  }

  async challenge(
    ctx: { readonly writeClient: GenLayerClient; readonly accountAddress: string },
    taskId: string,
    disputeBond: bigint,
  ): Promise<ProtocolWriteResult> {
    return protocolWrite(ctx.writeClient, ctx.accountAddress, this.address, {
      functionName: "challenge",
      args: [taskId],
      value: disputeBond,
    });
  }

  /**
   * Two-step flagging, step 2: apply the locally-stored flag after governance
   * has recorded an executed FLAG_MODULE action (verified on-chain by the
   * contract via is_flag_approved).
   */
  async protocolFlagModule(
    ctx: { readonly writeClient: GenLayerClient; readonly accountAddress: string },
    moduleId: string,
  ): Promise<ProtocolWriteResult> {
    return protocolWrite(ctx.writeClient, ctx.accountAddress, this.address, {
      functionName: "protocol_flag_module",
      args: [moduleId],
    });
  }
}

export const coreClient = new CoreClient();
