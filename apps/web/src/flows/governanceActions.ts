"use client";

import { createWalletClient } from "@/adapters/genlayer-client";
import { governanceClient } from "@/adapters/governance-client";
import { coreClient } from "@/adapters/core-client";
import { extractReturnValue, protocolWrite } from "@/lib/tx-runtime";
import type { GovernanceActionType } from "@/domain/types";

const TRACKED_KEY = "veritas:governance-actions";

export interface TrackedAction {
  readonly actionId: string;
  readonly actionType: GovernanceActionType;
  readonly target: string;
  readonly value: string;
  readonly createdAt: number;
}

/**
 * Governance has no pending-action enumeration view, so the UI tracks the
 * action IDs it creates locally (labeled as locally-known in the UI).
 */
export function readTrackedActions(): readonly TrackedAction[] {
  try {
    const raw = sessionStorage.getItem(TRACKED_KEY);
    return raw ? (JSON.parse(raw) as TrackedAction[]) : [];
  } catch {
    return [];
  }
}

function trackAction(entry: TrackedAction): void {
  try {
    const current = readTrackedActions();
    sessionStorage.setItem(TRACKED_KEY, JSON.stringify([...current.slice(-19), entry]));
  } catch {
    // storage unavailable
  }
}

export function removeTrackedAction(actionId: string): void {
  try {
    sessionStorage.setItem(TRACKED_KEY, JSON.stringify(readTrackedActions().filter((a) => a.actionId !== actionId)));
  } catch {
    // ignore
  }
}

export interface GovernanceWriteContext {
  readonly accountAddress: string;
  readonly onPhase: (phase: string) => void;
}

function ctxOf(accountAddress: string, onPhase: (phase: string) => void) {
  return { writeClient: createWalletClient(accountAddress as `0x${string}`), accountAddress, onPhase };
}

/** Propose a governance action; returns and tracks the new action ID. */
export async function proposeGovernanceAction(
  accountAddress: string,
  onPhase: (phase: string) => void,
  actionType: GovernanceActionType,
  target: string,
  value: bigint,
): Promise<{ actionId: string } | { failure: { message: string; code?: string } }> {
  try {
    onPhase("awaiting_wallet");
    const result = await protocolWrite(
      ctxOf(accountAddress, onPhase).writeClient,
      accountAddress,
      governanceClient.contractAddress,
      { functionName: "propose_action", args: [actionType, target, value] },
    );
    onPhase("finalizing");
    const actionId = extractReturnValue(result.receipt);
    if (!actionId) {
      return { failure: { message: "The action was proposed, but the action ID could not be read back. Check the transaction hash in your wallet history." } };
    }
    trackAction({ actionId, actionType, target, value: value.toString(), createdAt: Math.floor(Date.now() / 1000) });
    onPhase("finalized");
    return { actionId };
  } catch (error) {
    return {
      failure: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/** Approve a proposed action (second admin; starts the timelock). */
export async function approveGovernanceAction(
  accountAddress: string,
  onPhase: (phase: string) => void,
  actionId: string,
): Promise<{ ok: true } | { failure: { message: string; code?: string } }> {
  try {
    onPhase("awaiting_wallet");
    await protocolWrite(
      ctxOf(accountAddress, onPhase).writeClient,
      accountAddress,
      governanceClient.contractAddress,
      { functionName: "approve_action", args: [actionId] },
    );
    onPhase("finalized");
    return { ok: true };
  } catch (error) {
    return { failure: { message: error instanceof Error ? error.message : String(error) } };
  }
}

/** Execute an approved action (permissionless, after the timelock). */
export async function executeGovernanceAction(
  accountAddress: string,
  onPhase: (phase: string) => void,
  actionId: string,
): Promise<{ ok: true } | { failure: { message: string; code?: string } }> {
  try {
    onPhase("awaiting_wallet");
    await protocolWrite(
      ctxOf(accountAddress, onPhase).writeClient,
      accountAddress,
      governanceClient.contractAddress,
      { functionName: "execute_action", args: [actionId] },
    );
    onPhase("finalized");
    removeTrackedAction(actionId);
    return { ok: true };
  } catch (error) {
    return { failure: { message: error instanceof Error ? error.message : String(error) } };
  }
}

/** Propose the emergency pause toggle (second approval executes immediately). */
export async function proposePauseToggle(
  accountAddress: string,
  onPhase: (phase: string) => void,
  targetPaused: boolean,
): Promise<{ actionId: string } | { failure: { message: string; code?: string } }> {
  try {
    onPhase("awaiting_wallet");
    const result = await protocolWrite(
      ctxOf(accountAddress, onPhase).writeClient,
      accountAddress,
      governanceClient.contractAddress,
      { functionName: "propose_pause_toggle", args: [targetPaused] },
    );
    onPhase("finalizing");
    const actionId = extractReturnValue(result.receipt);
    if (!actionId) {
      return { failure: { message: "The pause proposal was submitted, but its ID could not be read back. Approvals must arrive within the 1-hour window." } };
    }
    trackAction({ actionId, actionType: "SET_TREASURY" as never, target: targetPaused ? "pause" : "unpause", value: "0", createdAt: Math.floor(Date.now() / 1000) });
    onPhase("finalized");
    return { actionId };
  } catch (error) {
    return { failure: { message: error instanceof Error ? error.message : String(error) } };
  }
}

/** Approve the pause toggle — this EXECUTES immediately (2-of-N, 1h window). */
export async function approvePauseToggle(
  accountAddress: string,
  onPhase: (phase: string) => void,
  actionId: string,
): Promise<{ ok: true } | { failure: { message: string; code?: string } }> {
  try {
    onPhase("awaiting_wallet");
    await protocolWrite(
      ctxOf(accountAddress, onPhase).writeClient,
      accountAddress,
      governanceClient.contractAddress,
      { functionName: "approve_pause_toggle", args: [actionId] },
    );
    onPhase("finalized");
    return { ok: true };
  } catch (error) {
    return { failure: { message: error instanceof Error ? error.message : String(error) } };
  }
}

/** Bootstrap the second admin (one-time, sole-admin bootstrap window). */
export async function bootstrapSecondAdmin(
  accountAddress: string,
  onPhase: (phase: string) => void,
  newAdminHex: string,
): Promise<{ ok: true } | { failure: { message: string; code?: string } }> {
  try {
    onPhase("awaiting_wallet");
    await protocolWrite(
      ctxOf(accountAddress, onPhase).writeClient,
      accountAddress,
      governanceClient.contractAddress,
      { functionName: "bootstrap_add_second_admin", args: [newAdminHex] },
    );
    onPhase("finalized");
    return { ok: true };
  } catch (error) {
    return { failure: { message: error instanceof Error ? error.message : String(error) } };
  }
}

/** Two-step module flagging, step 2 (after the governance action is executed). */
export async function applyModuleFlag(
  accountAddress: string,
  onPhase: (phase: string) => void,
  moduleId: string,
): Promise<{ ok: true } | { failure: { message: string; code?: string } }> {
  try {
    onPhase("awaiting_wallet");
    await coreClient.protocolFlagModule(
      { writeClient: createWalletClient(accountAddress as `0x${string}`), accountAddress },
      moduleId,
    );
    onPhase("finalized");
    return { ok: true };
  } catch (error) {
    return { failure: { message: error instanceof Error ? error.message : String(error) } };
  }
}
