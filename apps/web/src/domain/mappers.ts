/**
 * Boundary mappers: raw contract read results -> typed domain models.
 * The contracts return snake_case dicts (Python view shapes, reconnaissance-
 * verified). GenVM calldata may deliver integers as bigint or number depending
 * on the decoding surface, so these helpers normalize safely:
 *  - counts / durations (u8/u32)  -> number (safe-integer checked)
 *  - wei-scale values (u256)      -> bigint (NEVER unsafe Number conversion — Rule 8)
 */
import type {
  Classification,
  DisputeEntry,
  DisputeSummary,
  DisputeType,
  EvaluationEntry,
  GovernanceSummary,
  Hex,
  Module,
  PendingAction,
  PendingPauseAction,
  ProtocolInfo,
  RateLimitParams,
  RateLimitStatus,
  Reputation,
  ReputationSeed,
  SampleConfidence,
  ScoreToleranceBounds,
  Task,
  TaskResult,
  TaskStatus,
} from "./types";

type Raw = Record<string, unknown>;

/** u8/u32 counts and second-durations -> number, with safe-integer enforcement. */
export function toCount(value: unknown, field = "value"): number {
  let n: number;
  if (typeof value === "bigint") n = Number(value);
  else if (typeof value === "number") n = value;
  else if (typeof value === "string" && value.trim() !== "" && /^-?\d+$/.test(value.trim())) n = Number(value);
  else throw new TypeError(`Field "${field}" is not a count: ${String(value)}`);
  if (!Number.isSafeInteger(n)) {
    throw new TypeError(`Field "${field}" exceeds the safe integer range: ${String(value)}`);
  }
  return n;
}

/** Wei-scale value amounts -> bigint. NEVER an unsafe Number conversion (Rule 8). */
export function toValue(value: unknown, field = "value"): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return BigInt(value.trim());
  throw new TypeError(`Field "${field}" is not an integer value amount: ${String(value)}`);
}

export function toStr(value: unknown, field: string): string {
  if (typeof value === "string") return value;
  throw new TypeError(`Field "${field}" expected a string, got: ${String(value)}`);
}

function toHex(value: unknown, field: string): Hex {
  const s = toStr(value, field);
  if (!/^0x[0-9a-fA-F]+$/.test(s)) {
    throw new TypeError(`Field "${field}" is not a hex string: ${s}`);
  }
  return s as Hex;
}

function toBool(value: unknown, field: string): boolean {
  if (typeof value === "boolean") return value;
  throw new TypeError(`Field "${field}" expected a boolean, got: ${String(value)}`);
}

function toEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  const s = toStr(value, field);
  const hit = allowed.find((candidate) => candidate === s);
  if (hit === undefined) {
    throw new TypeError(`Field "${field}" has an unexpected value: ${s}`);
  }
  return hit;
}

const CLASSIFICATIONS: readonly Classification[] = ["VALID", "INVALID", "UNCERTAIN", "BORDERLINE"];
const TASK_STATUSES: readonly TaskStatus[] = ["PENDING", "EVALUATED", "DISPUTED", "FINALIZED"];
const DISPUTE_TYPES: readonly DisputeType[] = ["SUBMITTER", "CHALLENGER"];
const SAMPLE_CONFIDENCES: readonly SampleConfidence[] = ["LOW", "MEDIUM", "HIGH"];

export function mapEvaluationEntry(raw: Raw): EvaluationEntry {
  return {
    roundNum: toCount(raw.round_num, "eval_history.round_num"),
    score: toCount(raw.score, "eval_history.score"),
    confidence: toCount(raw.confidence, "eval_history.confidence"),
    classification: toEnum(raw.classification, CLASSIFICATIONS, "eval_history.classification"),
    evalTs: toCount(raw.eval_ts, "eval_history.eval_ts"),
    triggeredBy: toHex(raw.triggered_by, "eval_history.triggered_by"),
  };
}

export function mapTask(raw: Raw): Task {
  const history = Array.isArray(raw.eval_history) ? (raw.eval_history as Raw[]) : [];
  return {
    taskId: toStr(raw.task_id, "task_id"),
    submitter: toHex(raw.submitter, "submitter"),
    status: toEnum(raw.status, TASK_STATUSES, "status"),
    moduleId: toStr(raw.module_id, "module_id"),
    moduleType: toStr(raw.module_type, "module_type"),
    scoringScale: toStr(raw.scoring_scale, "scoring_scale"),
    moduleVersion: toCount(raw.module_version, "module_version"),
    snapshotHash: toStr(raw.snapshot_hash, "snapshot_hash"),
    scoreTolerance: toCount(raw.score_tolerance, "score_tolerance"),
    acceptThreshold: toCount(raw.accept_threshold, "accept_threshold"),
    scoreThresholdBorderline: toCount(raw.score_threshold_borderline, "score_threshold_borderline"),
    minConfidence: toCount(raw.min_confidence, "min_confidence"),
    maxDisputeRounds: toCount(raw.max_dispute_rounds, "max_dispute_rounds"),
    challengeWindowSec: toCount(raw.challenge_window_sec, "challenge_window_sec"),
    outputHash: toStr(raw.output_hash, "output_hash"),
    contextHash: toStr(raw.context_hash, "context_hash"),
    metadata: toStr(raw.metadata, "metadata"),
    score: toCount(raw.score, "score"),
    confidence: toCount(raw.confidence, "confidence"),
    classification: toEnum(raw.classification, CLASSIFICATIONS, "classification"),
    reasoning: toStr(raw.reasoning, "reasoning"),
    evalRound: toCount(raw.eval_round, "eval_round"),
    createdTs: toCount(raw.created_ts, "created_ts"),
    lastEvalTs: toCount(raw.last_eval_ts, "last_eval_ts"),
    evalHistory: history.map(mapEvaluationEntry),
  };
}

export function mapTaskResult(raw: Raw): TaskResult {
  return {
    taskId: toStr(raw.task_id, "task_id"),
    submitter: toHex(raw.submitter, "submitter"),
    status: toEnum(raw.status, TASK_STATUSES, "status"),
    classification: toEnum(raw.classification, CLASSIFICATIONS, "classification"),
    score: toCount(raw.score, "score"),
    confidence: toCount(raw.confidence, "confidence"),
    scoringScale: toStr(raw.scoring_scale, "scoring_scale"),
    scoreThresholdBorderline: toCount(raw.score_threshold_borderline, "score_threshold_borderline"),
    evalRound: toCount(raw.eval_round, "eval_round"),
    lastEvalTs: toCount(raw.last_eval_ts, "last_eval_ts"),
    maxDisputeRounds: toCount(raw.max_dispute_rounds, "max_dispute_rounds"),
    challengeWindowSec: toCount(raw.challenge_window_sec, "challenge_window_sec"),
  };
}

export function mapModule(raw: Raw): Module {
  return {
    moduleId: toStr(raw.module_id, "module_id"),
    owner: toHex(raw.owner, "owner"),
    moduleType: toStr(raw.module_type, "module_type") as Module["moduleType"],
    scoringScale: toStr(raw.scoring_scale, "scoring_scale"),
    evaluationMethod: toStr(raw.evaluation_method, "evaluation_method") as Module["evaluationMethod"],
    description: toStr(raw.description, "description"),
    evalPrompt: toStr(raw.eval_prompt, "eval_prompt"),
    criteria: toStr(raw.criteria, "criteria"),
    promptHash: toStr(raw.prompt_hash, "prompt_hash"),
    criteriaHash: toStr(raw.criteria_hash, "criteria_hash"),
    snapshotHash: toStr(raw.snapshot_hash, "snapshot_hash"),
    scoreTolerance: toCount(raw.score_tolerance, "score_tolerance"),
    acceptThreshold: toCount(raw.accept_threshold, "accept_threshold"),
    scoreThresholdBorderline: toCount(raw.score_threshold_borderline, "score_threshold_borderline"),
    minConfidence: toCount(raw.min_confidence, "min_confidence"),
    maxDisputeRounds: toCount(raw.max_dispute_rounds, "max_dispute_rounds"),
    challengeWindowSec: toCount(raw.challenge_window_sec, "challenge_window_sec"),
    requireInlineContent: toBool(raw.require_inline_content, "require_inline_content"),
    version: toCount(raw.version, "version"),
  };
}

export function mapDisputeEntry(raw: Raw): DisputeEntry {
  return {
    disputant: toHex(raw.disputant, "disputant"),
    disputeType: toEnum(raw.dispute_type, DISPUTE_TYPES, "dispute_type"),
    roundNumber: toCount(raw.round_number, "round_number"),
    timestamp: toCount(raw.timestamp, "timestamp"),
  };
}

export function mapDisputeSummary(raw: Raw): DisputeSummary {
  return {
    disputeCount: toCount(raw.dispute_count, "dispute_count"),
    lastDisputeTs: toCount(raw.last_dispute_ts, "last_dispute_ts"),
    cooldownActive: toBool(raw.cooldown_active, "cooldown_active"),
    protocolMax: toCount(raw.protocol_max, "protocol_max"),
    roundsRemaining: toCount(raw.rounds_remaining, "rounds_remaining"),
  };
}

export function mapReputation(raw: Raw): Reputation {
  return {
    moduleId: toStr(raw.module_id, "module_id"),
    adjustedReputationBps: toCount(raw.adjusted_reputation_bps, "adjusted_reputation_bps"),
    rawUnchanged: toCount(raw.raw_unchanged, "raw_unchanged"),
    rawTotal: toCount(raw.raw_total, "raw_total"),
    sampleConfidence: toEnum(raw.sample_confidence, SAMPLE_CONFIDENCES, "sample_confidence"),
    isFlagged: toBool(raw.is_flagged, "is_flagged"),
  };
}

export function mapProtocolInfo(raw: Raw): ProtocolInfo {
  return {
    totalTasks: toCount(raw.total_tasks, "total_tasks"),
    maxOutputLen: toCount(raw.max_output_len, "max_output_len"),
    maxContextLen: toCount(raw.max_context_len, "max_context_len"),
    protocolMaxDisputeRounds: toCount(raw.protocol_max_dispute_rounds, "protocol_max_dispute_rounds"),
  };
}

export function mapRateLimitStatus(raw: Raw): RateLimitStatus {
  return {
    currentCount: toCount(raw.current_count, "current_count"),
    windowStartTs: toCount(raw.window_start_ts, "window_start_ts"),
    windowSec: toCount(raw.window_sec, "window_sec"),
    rateLimitMax: toCount(raw.rate_limit_max, "rate_limit_max"),
    remaining: toCount(raw.remaining, "remaining"),
  };
}

export function mapGovernanceSummary(raw: Raw): GovernanceSummary {
  return {
    adminCount: toCount(raw.admin_count, "admin_count"),
    bondAmountRegistration: toValue(raw.bond_amount_registration, "bond_amount_registration"),
    bondAmountSubmission: toValue(raw.bond_amount_submission, "bond_amount_submission"),
    bondAmountDispute: toValue(raw.bond_amount_dispute, "bond_amount_dispute"),
    treasuryAddress: toHex(raw.treasury_address, "treasury_address"),
    revenueSplitBps: toCount(raw.revenue_split_bps, "revenue_split_bps"),
    paused: toBool(raw.paused, "paused"),
    reputationPriorWeight: toValue(raw.reputation_prior_weight, "reputation_prior_weight"),
    rateLimitWindowSec: toValue(raw.rate_limit_window_sec, "rate_limit_window_sec"),
    rateLimitMax: toCount(raw.rate_limit_max, "rate_limit_max"),
    timelockDurationSec: toCount(raw.timelock_duration_sec, "timelock_duration_sec"),
    scoreToleranceMin: toCount(raw.score_tolerance_min, "score_tolerance_min"),
    scoreToleranceMax: toCount(raw.score_tolerance_max, "score_tolerance_max"),
  };
}

export function mapReputationSeed(raw: Raw): ReputationSeed {
  return {
    seedDisputes: toValue(raw.seed_disputes, "seed_disputes"),
    seedUnchanged: toValue(raw.seed_unchanged, "seed_unchanged"),
  };
}

export function mapScoreToleranceBounds(raw: Raw): ScoreToleranceBounds {
  return {
    min: toCount(raw.min, "min"),
    max: toCount(raw.max, "max"),
  };
}

export function mapRateLimitParams(raw: Raw): RateLimitParams {
  return {
    windowSec: toValue(raw.window_sec, "window_sec"),
    max: toCount(raw.max, "max"),
  };
}

export function mapPendingAction(raw: Raw): PendingAction {
  return {
    actionId: toStr(raw.action_id, "action_id"),
    actionType: toStr(raw.action_type, "action_type") as PendingAction["actionType"],
    target: toStr(raw.target, "target"),
    value: toValue(raw.value, "value"),
    proposer: toHex(raw.proposer, "proposer"),
    proposedTs: toCount(raw.proposed_ts, "proposed_ts"),
    secondApprover: toHex(raw.second_approver, "second_approver"),
    secondApprovalTs: toCount(raw.second_approval_ts, "second_approval_ts"),
    executed: toBool(raw.executed, "executed"),
  };
}

export function mapPendingPauseAction(raw: Raw): PendingPauseAction {
  return {
    actionId: toStr(raw.action_id, "action_id"),
    proposer: toHex(raw.proposer, "proposer"),
    targetPaused: toBool(raw.target_paused, "target_paused"),
    proposedTs: toCount(raw.proposed_ts, "proposed_ts"),
    approver: toHex(raw.approver, "approver"),
    executed: toBool(raw.executed, "executed"),
  };
}
