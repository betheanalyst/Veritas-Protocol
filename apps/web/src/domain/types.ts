/**
 * Typed domain models — derived from the Veritas V2 contracts' view return
 * shapes (reconnaissance-verified against contract source). Adapters map raw
 * contract reads into these types at the boundary; UI components consume only
 * these. Wei-scale amounts are bigint end-to-end (Rule 8); u8/u32 counts and
 * second-durations are numbers.
 */

export type Hex = `0x${string}`;

export type TaskStatus = "PENDING" | "EVALUATED" | "DISPUTED" | "FINALIZED";

export type Classification = "VALID" | "INVALID" | "UNCERTAIN" | "BORDERLINE";

export type DisputeType = "SUBMITTER" | "CHALLENGER";

export type SampleConfidence = "LOW" | "MEDIUM" | "HIGH";

export type BondKind = "registration" | "submission" | "dispute";

export type ModuleType =
  | "FACTUALITY_CHECK"
  | "SUMMARY_VERIFICATION"
  | "CODE_CORRECTNESS"
  | "HALLUCINATION_DETECTION"
  | "EQUIVALENCE_CHECK"
  | "CUSTOM";

export type EvaluationMethod = "LLM_CONSENSUS" | "LLM_NON_COMPARATIVE";

export type GovernanceActionType =
  | "ADD_ADMIN"
  | "REMOVE_ADMIN"
  | "SET_BOND_AMOUNT"
  | "SET_TREASURY"
  | "SET_SPLIT_BPS"
  | "SET_REPUTATION_PRIOR_WEIGHT"
  | "SET_REPUTATION_SEED"
  | "SET_RATE_LIMIT_WINDOW"
  | "SET_RATE_LIMIT_MAX"
  | "FLAG_MODULE"
  | "SET_SCORE_TOLERANCE_BOUNDS";

/** ModuleRegistry.get_module() — full module record; source of the submit() parameter bundle. */
export interface Module {
  readonly moduleId: string;
  readonly owner: Hex;
  readonly moduleType: ModuleType;
  readonly scoringScale: string;
  readonly evaluationMethod: EvaluationMethod;
  readonly description: string;
  readonly evalPrompt: string;
  readonly criteria: string;
  readonly promptHash: string;
  readonly criteriaHash: string;
  readonly snapshotHash: string;
  readonly scoreTolerance: number;
  readonly acceptThreshold: number;
  readonly scoreThresholdBorderline: number;
  readonly minConfidence: number;
  readonly maxDisputeRounds: number;
  readonly challengeWindowSec: number;
  readonly requireInlineContent: boolean;
  readonly version: number;
}

/** VeritasCore.get_task().eval_history[] entry. */
export interface EvaluationEntry {
  readonly roundNum: number;
  readonly score: number;
  readonly confidence: number;
  readonly classification: Classification;
  readonly evalTs: number;
  readonly triggeredBy: Hex;
}

/** VeritasCore.get_task() — full task record with frozen policy snapshot fields. */
export interface Task {
  readonly taskId: string;
  readonly submitter: Hex;
  readonly status: TaskStatus;
  readonly moduleId: string;
  readonly moduleType: string;
  readonly scoringScale: string;
  readonly moduleVersion: number;
  readonly snapshotHash: string;
  readonly scoreTolerance: number;
  readonly acceptThreshold: number;
  readonly scoreThresholdBorderline: number;
  readonly minConfidence: number;
  readonly maxDisputeRounds: number;
  readonly challengeWindowSec: number;
  readonly outputHash: string;
  readonly contextHash: string;
  readonly metadata: string;
  readonly score: number;
  readonly confidence: number;
  readonly classification: Classification;
  readonly reasoning: string;
  readonly evalRound: number;
  readonly createdTs: number;
  readonly lastEvalTs: number;
  readonly evalHistory: readonly EvaluationEntry[];
}

/** VeritasCore.get_result() — lightweight result view. */
export interface TaskResult {
  readonly taskId: string;
  readonly submitter: Hex;
  readonly status: TaskStatus;
  readonly classification: Classification;
  readonly score: number;
  readonly confidence: number;
  readonly scoringScale: string;
  readonly scoreThresholdBorderline: number;
  readonly evalRound: number;
  readonly lastEvalTs: number;
  readonly maxDisputeRounds: number;
  readonly challengeWindowSec: number;
}

/** VeritasCore.get_dispute_history() entry. */
export interface DisputeEntry {
  readonly disputant: Hex;
  readonly disputeType: DisputeType;
  readonly roundNumber: number;
  readonly timestamp: number;
}

/** VeritasCore.get_dispute_summary() — combined dispute state for frontends. */
export interface DisputeSummary {
  readonly disputeCount: number;
  readonly lastDisputeTs: number;
  readonly cooldownActive: boolean;
  readonly protocolMax: number;
  readonly roundsRemaining: number;
}

/** VeritasCore.get_module_reputation() — Bayesian-smoothed reputation (bps scale 0-10000). */
export interface Reputation {
  readonly moduleId: string;
  readonly adjustedReputationBps: number;
  readonly rawUnchanged: number;
  readonly rawTotal: number;
  readonly sampleConfidence: SampleConfidence;
  readonly isFlagged: boolean;
}

/** VeritasCore.get_protocol_info(). */
export interface ProtocolInfo {
  readonly totalTasks: number;
  readonly maxOutputLen: number;
  readonly maxContextLen: number;
  readonly protocolMaxDisputeRounds: number;
}

/** VeritasCore.get_rate_limit_status() — pre-submit UX check. */
export interface RateLimitStatus {
  readonly currentCount: number;
  readonly windowStartTs: number;
  readonly windowSec: number;
  readonly rateLimitMax: number;
  readonly remaining: number;
}

/** VeritasGovernance.get_governance_summary() — aggregate for the governance overview. */
export interface GovernanceSummary {
  readonly adminCount: number;
  readonly bondAmountRegistration: bigint;
  readonly bondAmountSubmission: bigint;
  readonly bondAmountDispute: bigint;
  readonly treasuryAddress: Hex;
  readonly revenueSplitBps: number;
  readonly paused: boolean;
  readonly reputationPriorWeight: bigint;
  readonly rateLimitWindowSec: bigint;
  readonly rateLimitMax: number;
  readonly timelockDurationSec: number;
  readonly scoreToleranceMin: number;
  readonly scoreToleranceMax: number;
}

/** VeritasGovernance.get_reputation_seed(). */
export interface ReputationSeed {
  readonly seedDisputes: bigint;
  readonly seedUnchanged: bigint;
}

/** VeritasGovernance.get_score_tolerance_bounds() — LIVE bounds (never hard-coded; Rule 7). */
export interface ScoreToleranceBounds {
  readonly min: number;
  readonly max: number;
}

/** VeritasGovernance.get_rate_limit_params(). */
export interface RateLimitParams {
  readonly windowSec: bigint;
  readonly max: number;
}

/** VeritasGovernance.get_pending_action(). */
export interface PendingAction {
  readonly actionId: string;
  readonly actionType: GovernanceActionType;
  readonly target: string;
  readonly value: bigint;
  readonly proposer: Hex;
  readonly proposedTs: number;
  readonly secondApprover: Hex;
  readonly secondApprovalTs: number;
  readonly executed: boolean;
}

/** VeritasGovernance.get_pending_pause_action(). */
export interface PendingPauseAction {
  readonly actionId: string;
  readonly proposer: Hex;
  readonly targetPaused: boolean;
  readonly proposedTs: number;
  readonly approver: Hex;
  readonly executed: boolean;
}
