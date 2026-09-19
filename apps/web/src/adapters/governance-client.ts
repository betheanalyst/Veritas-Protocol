/**
 * GovernanceClient — typed adapter over VeritasGovernance
 * (contracts/veritas_governance.py). Bond amounts and tolerance bounds are
 * ALWAYS read live from this contract (Rules 6-7) — never hard-coded anywhere.
 * Governance writes land in Phase 6 (Protocol / Governance).
 */
import { getConfig } from "@/config/network";
import {
  mapGovernanceSummary,
  mapPendingAction,
  mapPendingPauseAction,
  mapRateLimitParams,
  mapReputationSeed,
  mapScoreToleranceBounds,
  toCount,
  toStr,
  toValue,
} from "@/domain/mappers";
import type {
  BondKind,
  GovernanceActionType,
  GovernanceSummary,
  Hex,
  PendingAction,
  PendingPauseAction,
  RateLimitParams,
  ReputationSeed,
  ScoreToleranceBounds,
} from "@/domain/types";

import type { CalldataArg } from "./core-client";
import { DEFAULT_STATE_STATUS, getReadClient, type GenLayerClient, type StateStatus } from "./genlayer-client";
import { protocolWrite, type ProtocolWriteResult } from "@/lib/tx-runtime";

export class GovernanceClient {
  private get address(): Hex {
    return getConfig().env.contracts.governance;
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

  async isAdmin(addressHex: string, stateStatus?: StateStatus): Promise<boolean> {
    return Boolean(await this.read("is_admin", [addressHex], stateStatus));
  }

  async getAdminCount(stateStatus?: StateStatus): Promise<number> {
    return toCount(await this.read("get_admin_count", [], stateStatus), "admin_count");
  }

  /** Live bond amount (wei, bigint). Exact-match requirement — attach exactly this. */
  async getBondAmount(kind: BondKind, stateStatus?: StateStatus): Promise<bigint> {
    return toValue(await this.read("get_bond_amount", [kind], stateStatus), "bond_amount");
  }

  async getTreasuryAddress(stateStatus?: StateStatus): Promise<Hex> {
    return toStr(await this.read("get_treasury_address", [], stateStatus), "treasury_address") as Hex;
  }

  async getRevenueSplitBps(stateStatus?: StateStatus): Promise<number> {
    return toCount(await this.read("get_revenue_split_bps", [], stateStatus), "revenue_split_bps");
  }

  async isPaused(stateStatus?: StateStatus): Promise<boolean> {
    return Boolean(await this.read("is_paused", [], stateStatus));
  }

  async getReputationPriorWeight(stateStatus?: StateStatus): Promise<bigint> {
    return toValue(await this.read("get_reputation_prior_weight", [], stateStatus), "reputation_prior_weight");
  }

  async getReputationSeed(stateStatus?: StateStatus): Promise<ReputationSeed> {
    const raw = (await this.read("get_reputation_seed", [], stateStatus)) as Record<string, unknown>;
    return mapReputationSeed(raw);
  }

  /** LIVE score-tolerance bounds (Rule 7: never hard-code these in the module editor). */
  async getScoreToleranceBounds(stateStatus?: StateStatus): Promise<ScoreToleranceBounds> {
    const raw = (await this.read("get_score_tolerance_bounds", [], stateStatus)) as Record<string, unknown>;
    return mapScoreToleranceBounds(raw);
  }

  async getRateLimitParams(stateStatus?: StateStatus): Promise<RateLimitParams> {
    const raw = (await this.read("get_rate_limit_params", [], stateStatus)) as Record<string, unknown>;
    return mapRateLimitParams(raw);
  }

  async isFlagApproved(moduleId: string, stateStatus?: StateStatus): Promise<boolean> {
    return Boolean(await this.read("is_flag_approved", [moduleId], stateStatus));
  }

  async getPendingAction(actionId: string, stateStatus?: StateStatus): Promise<PendingAction> {
    const raw = (await this.read("get_pending_action", [actionId], stateStatus)) as Record<string, unknown>;
    return mapPendingAction(raw);
  }

  async getPendingPauseAction(actionId: string, stateStatus?: StateStatus): Promise<PendingPauseAction> {
    const raw = (await this.read("get_pending_pause_action", [actionId], stateStatus)) as Record<string, unknown>;
    return mapPendingPauseAction(raw);
  }

  async getTimelockDuration(stateStatus?: StateStatus): Promise<number> {
    return toCount(await this.read("get_timelock_duration", [], stateStatus), "timelock_duration");
  }

  async getGovernanceSummary(stateStatus?: StateStatus): Promise<GovernanceSummary> {
    const raw = (await this.read("get_governance_summary", [], stateStatus)) as Record<string, unknown>;
    return mapGovernanceSummary(raw);
  }

  // ── Writes — Phase 6 (2-of-N multisig, 24h timelock, emergency pause) ──

  async proposeAction(
    ctx: { readonly writeClient: GenLayerClient; readonly accountAddress: string },
    actionType: GovernanceActionType,
    target: string,
    value: bigint,
  ): Promise<ProtocolWriteResult> {
    return protocolWrite(ctx.writeClient, ctx.accountAddress, this.address, {
      functionName: "propose_action",
      args: [actionType, target, value],
    });
  }

  async approveAction(
    ctx: { readonly writeClient: GenLayerClient; readonly accountAddress: string },
    actionId: string,
  ): Promise<ProtocolWriteResult> {
    return protocolWrite(ctx.writeClient, ctx.accountAddress, this.address, {
      functionName: "approve_action",
      args: [actionId],
    });
  }

  async executeAction(
    ctx: { readonly writeClient: GenLayerClient; readonly accountAddress: string },
    actionId: string,
  ): Promise<ProtocolWriteResult> {
    return protocolWrite(ctx.writeClient, ctx.accountAddress, this.address, {
      functionName: "execute_action",
      args: [actionId],
    });
  }

  async proposePauseToggle(
    ctx: { readonly writeClient: GenLayerClient; readonly accountAddress: string },
    targetPaused: boolean,
  ): Promise<ProtocolWriteResult> {
    return protocolWrite(ctx.writeClient, ctx.accountAddress, this.address, {
      functionName: "propose_pause_toggle",
      args: [targetPaused],
    });
  }

  async approvePauseToggle(
    ctx: { readonly writeClient: GenLayerClient; readonly accountAddress: string },
    actionId: string,
  ): Promise<ProtocolWriteResult> {
    return protocolWrite(ctx.writeClient, ctx.accountAddress, this.address, {
      functionName: "approve_pause_toggle",
      args: [actionId],
    });
  }

  async bootstrapAddSecondAdmin(
    ctx: { readonly writeClient: GenLayerClient; readonly accountAddress: string },
    newAdminHex: string,
  ): Promise<ProtocolWriteResult> {
    return protocolWrite(ctx.writeClient, ctx.accountAddress, this.address, {
      functionName: "bootstrap_add_second_admin",
      args: [newAdminHex],
    });
  }

}

export const governanceClient = new GovernanceClient();
