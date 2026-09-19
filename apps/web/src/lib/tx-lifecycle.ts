/**
 * Transaction lifecycle (D-10 / ARCHITECTURE.md §6):
 * idle -> preparing -> awaiting_wallet -> submitted -> deciding -> finalizing
 * -> finalized | failed.
 *
 * NO artificial delays and NO optimistic success: "finalized" is reachable
 * only after the SDK reports FINALIZED **and** the execution result proves
 * successful contract execution (FINISHED_WITH_RETURN).
 */

export type TxPhase =
  | "idle"
  | "preparing"
  | "awaiting_wallet"
  | "submitted"
  | "deciding"
  | "finalizing"
  | "finalized"
  | "failed";

export type TxFailureKind =
  | "wallet_rejected"
  | "provider_error"
  | "contract_rejected"
  | "timeout_unknown";

export interface TxFailure {
  readonly kind: TxFailureKind;
  /** Human message: what happened -> why -> what to do. */
  readonly message: string;
  readonly code?: string;
}

export interface TxState {
  readonly phase: TxPhase;
  readonly txHash?: string;
  readonly taskId?: string;
  readonly failure?: TxFailure;
}

export const INITIAL_TX_STATE: TxState = { phase: "idle" };

export const TX_PHASE_LABELS: Record<TxPhase, string> = {
  idle: "Not started",
  preparing: "Preparing transaction…",
  awaiting_wallet: "Confirm in your wallet",
  submitted: "Submitted — in consensus…",
  deciding: "Waiting for validator decision…",
  finalizing: "Finalizing on-chain…",
  finalized: "Confirmed on-chain",
  failed: "Failed",
};

/** Ordered phases for progress display (failed/finalized handled separately). */
export const TX_PHASE_ORDER: readonly TxPhase[] = [
  "preparing",
  "awaiting_wallet",
  "submitted",
  "deciding",
  "finalizing",
  "finalized",
];
