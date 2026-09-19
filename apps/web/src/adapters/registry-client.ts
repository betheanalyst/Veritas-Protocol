/**
 * RegistryClient — typed adapter over ModuleRegistry (contracts/module_registry.py).
 * getModule() is the source of the submit() parameter bundle (snapshot-hash
 * verified by VeritasCore). Register/update land in Phase 5 (User Workspace).
 */
import { getConfig } from "@/config/network";
import { mapModule, toCount, toStr } from "@/domain/mappers";
import type { Hex, Module } from "@/domain/types";
import { protocolWrite, type ProtocolWriteResult } from "@/lib/tx-runtime";

import { DEFAULT_STATE_STATUS, getReadClient, type GenLayerClient, type StateStatus } from "./genlayer-client";
import type { CalldataArg } from "./core-client";

export class RegistryClient {
  private get address(): Hex {
    return getConfig().env.contracts.registry;
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

  async getModule(moduleId: string, stateStatus?: StateStatus): Promise<Module> {
    const raw = (await this.read("get_module", [moduleId], stateStatus)) as Record<string, unknown>;
    return mapModule(raw);
  }

  async getSnapshotHash(moduleId: string, stateStatus?: StateStatus): Promise<string> {
    return toStr(await this.read("get_snapshot_hash", [moduleId], stateStatus), "snapshot_hash");
  }

  async getModuleCount(stateStatus?: StateStatus): Promise<number> {
    return toCount(await this.read("get_module_count", [], stateStatus), "module_count");
  }

  /** Paginated owner module IDs (contract caps limit at 50 per page). */
  async getOwnerModuleIds(
    ownerHex: string,
    offset: number,
    limit: number,
    stateStatus?: StateStatus,
  ): Promise<string[]> {
    const raw = (await this.read("get_owner_module_ids", [ownerHex, offset, limit], stateStatus)) as unknown[];
    return (raw ?? []).map((id) => toStr(id, "module_id"));
  }

  // ── Writes — full honest cycle via the shared write runtime ──

  /**
   * Register a module: payable (exact registration bond, forfeited 100% to
   * treasury), validates against LIVE governance tolerance bounds. Bond passed
   * in — read LIVE by the caller.
   */
  async registerModule(
    ctx: { readonly writeClient: GenLayerClient; readonly accountAddress: string },
    input: RegisterModuleInput,
    registrationBond: bigint,
  ): Promise<ProtocolWriteResult> {
    return protocolWrite(ctx.writeClient, ctx.accountAddress, this.address, {
      functionName: "register_module",
      args: [
        input.moduleId,
        input.moduleType,
        input.scoringScale,
        input.evaluationMethod,
        input.description,
        input.evalPrompt,
        input.criteria,
        input.scoreTolerance,
        input.acceptThreshold,
        input.scoreThresholdBorderline,
        input.minConfidence,
        input.maxDisputeRounds,
        input.challengeWindowSec,
        input.requireInlineContent,
      ],
      value: registrationBond,
    });
  }

  /** Update a module (owner-only; no bond; version increments). */
  async updateModule(
    ctx: { readonly writeClient: GenLayerClient; readonly accountAddress: string },
    moduleId: string,
    input: UpdateModuleInput,
  ): Promise<ProtocolWriteResult> {
    return protocolWrite(ctx.writeClient, ctx.accountAddress, this.address, {
      functionName: "update_module",
      args: [
        moduleId,
        input.evalPrompt,
        input.criteria,
        input.scoreTolerance,
        input.acceptThreshold,
        input.scoreThresholdBorderline,
        input.minConfidence,
        input.maxDisputeRounds,
        input.challengeWindowSec,
        input.requireInlineContent,
      ],
    });
  }
}

export interface RegisterModuleInput {
  readonly moduleId: string;
  readonly moduleType: string;
  readonly scoringScale: string;
  readonly evaluationMethod: string;
  readonly description: string;
  readonly evalPrompt: string;
  readonly criteria: string;
  readonly scoreTolerance: number;
  readonly acceptThreshold: number;
  readonly scoreThresholdBorderline: number;
  readonly minConfidence: number;
  readonly maxDisputeRounds: number;
  readonly challengeWindowSec: number;
  readonly requireInlineContent: boolean;
}

export interface UpdateModuleInput {
  readonly evalPrompt: string;
  readonly criteria: string;
  readonly scoreTolerance: number;
  readonly acceptThreshold: number;
  readonly scoreThresholdBorderline: number;
  readonly minConfidence: number;
  readonly maxDisputeRounds: number;
  readonly challengeWindowSec: number;
  readonly requireInlineContent: boolean;
}

export const registryClient = new RegistryClient();
