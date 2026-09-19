/**
 * Central registry of Veritas contract error codes — the complete inventory of
 * `gl.vm.UserError("ERR:…")` strings from contract-source reconnaissance
 * (veritas_core.py, module_registry.py, veritas_governance.py; 2026-09).
 *
 * Error-handling architecture (ARCHITECTURE.md §6): raw RPC errors are never
 * primary UI. Decoded codes map to human messaging following the pattern:
 *   what happened -> why -> what can I do?
 */

export interface ProtocolErrorInfo {
  readonly code: string;
  readonly whatHappened: string;
  readonly why: string;
  readonly whatToDo: string;
}

const REGISTRY: Record<string, ProtocolErrorInfo> = {
  // ── Configuration (shared across contracts) ──
  "ERR:GOVERNANCE_NOT_CONFIGURED": {
    code: "ERR:GOVERNANCE_NOT_CONFIGURED",
    whatHappened: "The protocol is not fully configured yet.",
    why: "A contract is deployed but its one-time governance wiring has not completed.",
    whatToDo: "This resolves during deployment setup — nothing to do from the application.",
  },
  "ERR:ALREADY_CONFIGURED": {
    code: "ERR:ALREADY_CONFIGURED",
    whatHappened: "The contract is already configured.",
    why: "One-time configuration cannot be repeated.",
    whatToDo: "No action needed.",
  },
  "ERR:NOT_DEPLOYER": {
    code: "ERR:NOT_DEPLOYER",
    whatHappened: "Only the contract deployer can perform this setup step.",
    why: "One-time configuration is deployer-only by design.",
    whatToDo: "No action available from the application.",
  },
  "ERR:GOVERNANCE_ADDRESS_CANNOT_BE_ZERO": {
    code: "ERR:GOVERNANCE_ADDRESS_CANNOT_BE_ZERO",
    whatHappened: "The governance address cannot be the zero address.",
    why: "A zero address would make the link meaningless.",
    whatToDo: "Deployment configuration issue — verify addresses.",
  },
  "ERR:PROTOCOL_PAUSED": {
    code: "ERR:PROTOCOL_PAUSED",
    whatHappened: "New submissions and module registrations are currently paused.",
    why: "Protocol administrators triggered the emergency pause. It only blocks submit() and register_module() — existing verifications continue.",
    whatToDo: "Check back soon; existing results remain inspectable and disputable.",
  },
  "ERR:TIMESTAMP_BELOW_FLOOR": {
    code: "ERR:TIMESTAMP_BELOW_FLOOR",
    whatHappened: "The transaction timestamp was rejected.",
    why: "The protocol enforces a sanity floor on timestamps.",
    whatToDo: "Try again; if it persists, the network clock is misbehaving.",
  },
  "ERR:TIMESTAMP_UNAVAILABLE": {
    code: "ERR:TIMESTAMP_UNAVAILABLE",
    whatHappened: "A required timestamp could not be read.",
    why: "The transaction context did not provide a usable datetime.",
    whatToDo: "Retry the action.",
  },

  // ── VeritasCore — submit() ──
  "ERR:RATE_LIMIT_EXCEEDED": {
    code: "ERR:RATE_LIMIT_EXCEEDED",
    whatHappened: "You have reached the submission limit for this module in the current window.",
    why: "Each submitter has a per-module rate limit that resets when the window elapses.",
    whatToDo: "Wait for the window to reset, or verify against a different module.",
  },
  "ERR:OUTPUT_REF_EMPTY_OR_TOO_LONG": {
    code: "ERR:OUTPUT_REF_EMPTY_OR_TOO_LONG",
    whatHappened: "The output is empty or exceeds the protocol length limit.",
    why: "Outputs are capped (currently 8000 characters for inline content).",
    whatToDo: "Shorten the output or supply it as a URL if the module allows it.",
  },
  "ERR:CONTEXT_REF_TOO_LONG": {
    code: "ERR:CONTEXT_REF_TOO_LONG",
    whatHappened: "The context exceeds the protocol length limit.",
    why: "Context is capped (currently 2000 characters).",
    whatToDo: "Shorten the context.",
  },
  "ERR:METADATA_TOO_LONG": {
    code: "ERR:METADATA_TOO_LONG",
    whatHappened: "The metadata exceeds the protocol length limit.",
    why: "Metadata is capped (currently 256 characters).",
    whatToDo: "Shorten the metadata.",
  },
  "ERR:MODULE_ID_EMPTY": {
    code: "ERR:MODULE_ID_EMPTY",
    whatHappened: "No module was selected.",
    why: "A verification must name a module.",
    whatToDo: "Select a module and try again.",
  },
  "ERR:MODULE_VERSION_INVALID": {
    code: "ERR:MODULE_VERSION_INVALID",
    whatHappened: "The module version is invalid.",
    why: "Module versions are 1-based and must match the registered module.",
    whatToDo: "Refresh the module details and try again.",
  },
  "ERR:MODULE_FLAGGED": {
    code: "ERR:MODULE_FLAGGED",
    whatHappened: "This module is not accepting new verifications.",
    why: "The module has been flagged at protocol level as unreliable; existing verifications are unaffected.",
    whatToDo: "Use a different module.",
  },
  "ERR:INLINE_CONTENT_REQUIRED": {
    code: "ERR:INLINE_CONTENT_REQUIRED",
    whatHappened: "This module requires content to be supplied directly.",
    why: "The module's content policy forbids URL references for the output.",
    whatToDo: "Paste the content inline instead of a URL.",
  },
  "ERR:SNAPSHOT_HASH_MISMATCH": {
    code: "ERR:SNAPSHOT_HASH_MISMATCH",
    whatHappened: "The module was updated while this verification was being prepared.",
    why: "The policy fields no longer match the module's current snapshot hash — the application never submits stale policy data.",
    whatToDo: "Reload the verification brief, review the module's updated policy, and submit again.",
  },
  "ERR:PROMPT_MISSING_OUTPUT_SLOT": {
    code: "ERR:PROMPT_MISSING_OUTPUT_SLOT",
    whatHappened: "The module's evaluation prompt is missing its output slot.",
    why: "Prompts must contain an {output} slot.",
    whatToDo: "The module owner must fix the prompt; nothing to do here.",
  },
  "ERR:PROMPT_MISSING_CONTEXT_SLOT": {
    code: "ERR:PROMPT_MISSING_CONTEXT_SLOT",
    whatHappened: "The module's evaluation prompt is missing its context slot.",
    why: "Prompts must contain a {context} slot.",
    whatToDo: "The module owner must fix the prompt; nothing to do here.",
  },
  "ERR:INCORRECT_BOND_AMOUNT": {
    code: "ERR:INCORRECT_BOND_AMOUNT",
    whatHappened: "The attached bond amount does not match the required amount.",
    why: "Bonds are exact-match; the required amount is read live from governance at submission time.",
    whatToDo: "Refresh the form — the correct amount is filled in automatically — and reconfirm.",
  },
  "ERR:TASK_ID_COLLISION": {
    code: "ERR:TASK_ID_COLLISION",
    whatHappened: "A task ID collision occurred (extremely unlikely).",
    why: "The deterministic ID generator produced an existing ID.",
    whatToDo: "Retry the submission.",
  },

  // ── VeritasCore — task state ──
  "ERR:TASK_NOT_FOUND": {
    code: "ERR:TASK_NOT_FOUND",
    whatHappened: "That verification does not exist.",
    why: "No task with this ID exists on-chain.",
    whatToDo: "Check the task ID and try again.",
  },
  "ERR:TASK_NOT_EVALUABLE": {
    code: "ERR:TASK_NOT_EVALUABLE",
    whatHappened: "This verification cannot be evaluated in its current state.",
    why: "Evaluation is only possible while a task is PENDING or DISPUTED.",
    whatToDo: "Refresh the task — it may already be evaluated or finalized.",
  },
  "ERR:TASK_NOT_EVALUATED": {
    code: "ERR:TASK_NOT_EVALUATED",
    whatHappened: "This action requires an evaluated verification.",
    why: "The task has not been evaluated (or is pending/disputed/finalized).",
    whatToDo: "Trigger evaluation first, then try again.",
  },
  "ERR:NOT_TASK_SUBMITTER": {
    code: "ERR:NOT_TASK_SUBMITTER",
    whatHappened: "Only the original submitter can perform this action.",
    why: "Finalization and submitter disputes are submitter-only.",
    whatToDo: "Use the connected account that submitted this verification.",
  },

  // ── VeritasCore — disputes / challenges ──
  "ERR:CANNOT_DISPUTE_UNCERTAIN": {
    code: "ERR:CANNOT_DISPUTE_UNCERTAIN",
    whatHappened: "UNCERTAIN results cannot be disputed by the submitter.",
    why: "An UNCERTAIN classification means confidence was below the module's threshold.",
    whatToDo: "No dispute path exists for this classification.",
  },
  "ERR:COOLDOWN_ACTIVE": {
    code: "ERR:COOLDOWN_ACTIVE",
    whatHappened: "A recent dispute on this verification is still in cooldown.",
    why: "The protocol enforces an hour between disputes on the same task.",
    whatToDo: "Wait for the cooldown to elapse (shown on the task page).",
  },
  "ERR:MAX_DISPUTE_ROUNDS_REACHED": {
    code: "ERR:MAX_DISPUTE_ROUNDS_REACHED",
    whatHappened: "This verification has no dispute rounds remaining.",
    why: "The module's dispute-round limit has been exhausted.",
    whatToDo: "The current result is final.",
  },
  "ERR:SUBMITTER_MUST_USE_DISPUTE_BY_SUBMITTER": {
    code: "ERR:SUBMITTER_MUST_USE_DISPUTE_BY_SUBMITTER",
    whatHappened: "Challenges are for third parties.",
    why: "The task's original submitter uses the submitter dispute path instead.",
    whatToDo: "Use the dispute action on your own verification.",
  },
  "ERR:ONLY_VALID_RESULTS_ARE_CHALLENGEABLE": {
    code: "ERR:ONLY_VALID_RESULTS_ARE_CHALLENGEABLE",
    whatHappened: "Only VALID results can be challenged by third parties.",
    why: "Challengeability is restricted to VALID classifications within the challenge window.",
    whatToDo: "No third-party challenge path exists for this classification.",
  },
  "ERR:CHALLENGE_WINDOW_EXPIRED": {
    code: "ERR:CHALLENGE_WINDOW_EXPIRED",
    whatHappened: "The challenge window has closed.",
    why: "Challenges are only possible within the module's window after evaluation.",
    whatToDo: "The result stands.",
  },
  "ERR:CHALLENGE_WINDOW_NOT_ELAPSED": {
    code: "ERR:CHALLENGE_WINDOW_NOT_ELAPSED",
    whatHappened: "This VALID result is still within its challenge window.",
    why: "Finalization waits until third parties had a real opportunity to challenge.",
    whatToDo: "Wait until the window elapses (shown on the task page), then finalize.",
  },
  "ERR:MODULE_FLAG_NOT_APPROVED_BY_GOVERNANCE": {
    code: "ERR:MODULE_FLAG_NOT_APPROVED_BY_GOVERNANCE",
    whatHappened: "Governance has not approved flagging this module.",
    why: "Protocol flagging requires an approved, timelocked governance action first.",
    whatToDo: "Complete the governance action before applying the flag.",
  },

  // ── VeritasCore — evaluation internals ──
  "ERR:OUTPUT_CONTENT_EMPTY_OR_UNAVAILABLE": {
    code: "ERR:OUTPUT_CONTENT_EMPTY_OR_UNAVAILABLE",
    whatHappened: "The output content could not be fetched.",
    why: "A URL reference returned empty or unavailable content.",
    whatToDo: "Make sure the URL is publicly reachable, then retry evaluation.",
  },
  "ERR:EXEC_PROMPT_NOT_JSON": {
    code: "ERR:EXEC_PROMPT_NOT_JSON",
    whatHappened: "The evaluation model returned malformed output.",
    why: "Consensus execution failed on a non-JSON model response.",
    whatToDo: "Retry evaluation; the module owner may need to adjust the prompt.",
  },
  "ERR:EXEC_PROMPT_RESULT_NOT_SERIALIZABLE": {
    code: "ERR:EXEC_PROMPT_RESULT_NOT_SERIALIZABLE",
    whatHappened: "The evaluation result could not be serialized.",
    why: "Consensus execution hit an unrepresentable model response.",
    whatToDo: "Retry evaluation.",
  },
  "ERR:EVAL_RESPONSE_NOT_JSON": {
    code: "ERR:EVAL_RESPONSE_NOT_JSON",
    whatHappened: "The consensus result was not valid JSON.",
    why: "Validator consensus produced an unparseable result.",
    whatToDo: "Retry evaluation.",
  },
  "ERR:EVAL_RESPONSE_NOT_DICT": {
    code: "ERR:EVAL_RESPONSE_NOT_DICT",
    whatHappened: "The consensus result had an unexpected shape.",
    why: "Validator consensus produced a non-object result.",
    whatToDo: "Retry evaluation.",
  },
  "ERR:EVAL_RESPONSE_MISSING_FIELDS": {
    code: "ERR:EVAL_RESPONSE_MISSING_FIELDS",
    whatHappened: "The consensus result is missing required fields.",
    why: "The agreed result lacks score/confidence data.",
    whatToDo: "Retry evaluation.",
  },
  "ERR:REPUTATION_SEED_MUST_BE_NONZERO": {
    code: "ERR:REPUTATION_SEED_MUST_BE_NONZERO",
    whatHappened: "The reputation seed must be nonzero.",
    why: "Cold-start statistics require a nonzero dispute seed.",
    whatToDo: "Deployment configuration issue.",
  },
  "ERR:REPUTATION_SEED_UNCHANGED_EXCEEDS_TOTAL": {
    code: "ERR:REPUTATION_SEED_UNCHANGED_EXCEEDS_TOTAL",
    whatHappened: "The reputation seed is inconsistent.",
    why: "Unchanged outcomes cannot exceed total disputes.",
    whatToDo: "Deployment configuration issue.",
  },

  // ── ModuleRegistry ──
  "ERR:INVALID_MODULE_ID_LENGTH": e("ERR:INVALID_MODULE_ID_LENGTH", "The module ID length is invalid.", "Module IDs are 1-64 characters.", "Adjust the module ID."),
  "ERR:MODULE_ID_TAKEN": e("ERR:MODULE_ID_TAKEN", "That module ID is already registered.", "Module IDs are unique.", "Choose a different module ID."),
  "ERR:INVALID_MODULE_TYPE": e("ERR:INVALID_MODULE_TYPE", "The module type is not supported.", "Module types come from a fixed vocabulary.", "Choose a supported module type."),
  "ERR:INVALID_SCORING_SCALE": e("ERR:INVALID_SCORING_SCALE", "The scoring scale is not supported.", "Only the 0-100 scale exists today.", "Use the 0-100 scoring scale."),
  "ERR:INVALID_EVAL_METHOD": e("ERR:INVALID_EVAL_METHOD", "The evaluation method is not supported.", "Evaluation methods come from a fixed vocabulary.", "Choose a supported evaluation method."),
  "ERR:DESCRIPTION_INVALID_LENGTH": e("ERR:DESCRIPTION_INVALID_LENGTH", "The description length is invalid.", "Descriptions are 1-256 characters.", "Adjust the description."),
  "ERR:EVAL_PROMPT_INVALID_LENGTH": e("ERR:EVAL_PROMPT_INVALID_LENGTH", "The evaluation prompt length is invalid.", "Prompts are 1-4000 characters.", "Adjust the prompt."),
  "ERR:CRITERIA_INVALID_LENGTH": e("ERR:CRITERIA_INVALID_LENGTH", "The criteria length is invalid.", "Criteria are 1-1000 characters.", "Adjust the criteria."),
  "ERR:MISSING_OUTPUT_OPEN_DELIMITER": e("ERR:MISSING_OUTPUT_OPEN_DELIMITER", "The prompt is missing the output-open delimiter.", "Prompts must contain the VERITAS_OUTPUT_START marker.", "The module author must add the delimiter."),
  "ERR:MISSING_OUTPUT_CLOSE_DELIMITER": e("ERR:MISSING_OUTPUT_CLOSE_DELIMITER", "The prompt is missing the output-close delimiter.", "Prompts must contain the VERITAS_OUTPUT_END marker.", "The module author must add the delimiter."),
  "ERR:MISSING_CONTEXT_OPEN_DELIMITER": e("ERR:MISSING_CONTEXT_OPEN_DELIMITER", "The prompt is missing the context-open delimiter.", "Prompts must contain the VERITAS_CONTEXT_START marker.", "The module author must add the delimiter."),
  "ERR:MISSING_CONTEXT_CLOSE_DELIMITER": e("ERR:MISSING_CONTEXT_CLOSE_DELIMITER", "The prompt is missing the context-close delimiter.", "Prompts must contain the VERITAS_CONTEXT_END marker.", "The module author must add the delimiter."),
  "ERR:MISSING_OUTPUT_SLOT": e("ERR:MISSING_OUTPUT_SLOT", "The prompt is missing its {output} slot.", "The output content is injected at the {output} slot.", "The module author must add the slot."),
  "ERR:MISSING_CONTEXT_SLOT": e("ERR:MISSING_CONTEXT_SLOT", "The prompt is missing its {context} slot.", "Context is injected at the {context} slot.", "The module author must add the slot."),
  "ERR:OUTPUT_SLOT_BEFORE_OPEN_DELIMITER": e("ERR:OUTPUT_SLOT_BEFORE_OPEN_DELIMITER", "The output slot is outside its delimiters.", "The {output} slot must sit inside the output markers.", "The module author must fix the prompt order."),
  "ERR:OUTPUT_SLOT_AFTER_CLOSE_DELIMITER": e("ERR:OUTPUT_SLOT_AFTER_CLOSE_DELIMITER", "The output slot is outside its delimiters.", "The {output} slot must sit inside the output markers.", "The module author must fix the prompt order."),
  "ERR:CONTEXT_SLOT_BEFORE_OPEN_DELIMITER": e("ERR:CONTEXT_SLOT_BEFORE_OPEN_DELIMITER", "The context slot is outside its delimiters.", "The {context} slot must sit inside the context markers.", "The module author must fix the prompt order."),
  "ERR:CONTEXT_SLOT_AFTER_CLOSE_DELIMITER": e("ERR:CONTEXT_SLOT_AFTER_CLOSE_DELIMITER", "The context slot is outside its delimiters.", "The {context} slot must sit inside the context markers.", "The module author must fix the prompt order."),
  "ERR:SCORE_TOLERANCE_OUT_OF_RANGE": e("ERR:SCORE_TOLERANCE_OUT_OF_RANGE", "Score tolerance is outside the allowed range.", "The valid range is set live by governance.", "Pick a value within the current bounds."),
  "ERR:ACCEPT_THRESHOLD_OUT_OF_RANGE": e("ERR:ACCEPT_THRESHOLD_OUT_OF_RANGE", "The accept threshold must be 0-100.", "Scores live on the 0-100 scale.", "Adjust the threshold."),
  "ERR:BORDERLINE_THRESHOLD_OUT_OF_RANGE": e("ERR:BORDERLINE_THRESHOLD_OUT_OF_RANGE", "The borderline threshold must be 0-100.", "Scores live on the 0-100 scale.", "Adjust the threshold."),
  "ERR:BORDERLINE_THRESHOLD_EXCEEDS_ACCEPT_THRESHOLD": e("ERR:BORDERLINE_THRESHOLD_EXCEEDS_ACCEPT_THRESHOLD", "The borderline threshold cannot exceed the accept threshold.", "Otherwise the BORDERLINE tier would be unreachable.", "Lower the borderline threshold."),
  "ERR:MIN_CONFIDENCE_OUT_OF_RANGE": e("ERR:MIN_CONFIDENCE_OUT_OF_RANGE", "Minimum confidence must be 0-100.", "Confidence lives on the 0-100 scale.", "Adjust the minimum confidence."),
  "ERR:MAX_DISPUTE_ROUNDS_OUT_OF_RANGE": e("ERR:MAX_DISPUTE_ROUNDS_OUT_OF_RANGE", "Dispute rounds must be between 1 and 3.", "The protocol caps dispute rounds at 3.", "Choose 1-3 rounds."),
  "ERR:CHALLENGE_WINDOW_OUT_OF_RANGE": e("ERR:CHALLENGE_WINDOW_OUT_OF_RANGE", "The challenge window must be 1 hour to 7 days.", "Windows are bounded by protocol policy.", "Choose a window in that range."),
  "ERR:MODULE_NOT_FOUND": e("ERR:MODULE_NOT_FOUND", "That module does not exist.", "No module with this ID is registered.", "Check the module ID."),
  "ERR:NOT_MODULE_OWNER": e("ERR:NOT_MODULE_OWNER", "Only the module owner can do this.", "Module updates are owner-only; ownership is never transferred.", "Use the account that registered the module."),
  "ERR:CANNOT_DOWNGRADE_INLINE_CONTENT_POLICY": e("ERR:CANNOT_DOWNGRADE_INLINE_CONTENT_POLICY", "The inline-content policy cannot be turned off.", "Once a module requires inline content, the policy is permanent.", "Keep inline content required."),

  // ── VeritasGovernance ──
  "ERR:NOT_ADMIN": e("ERR:NOT_ADMIN", "This action requires a protocol administrator.", "Governance actions are admin-only.", "No action available for this account."),
  "ERR:BOOTSTRAP_ONLY_AT_ONE_ADMIN": e("ERR:BOOTSTRAP_ONLY_AT_ONE_ADMIN", "The bootstrap window has closed.", "Adding a second admin is only possible while exactly one admin exists.", "No action available."),
  "ERR:ALREADY_ADMIN": e("ERR:ALREADY_ADMIN", "That address is already an admin.", "Each address can be an admin once.", "Choose a different address."),
  "ERR:ADMIN_CEILING_EXCEEDED": e("ERR:ADMIN_CEILING_EXCEEDED", "The admin set is full.", "The protocol caps the number of admins.", "Remove an admin first."),
  "ERR:ADMIN_FLOOR_VIOLATED": e("ERR:ADMIN_FLOOR_VIOLATED", "The admin set cannot shrink further.", "The protocol enforces a minimum number of admins.", "No action available."),
  "ERR:NOT_CURRENTLY_ADMIN": e("ERR:NOT_CURRENTLY_ADMIN", "That address is not currently an admin.", "It may have been removed by a governance action.", "No action available."),
  "ERR:INVALID_ACTION_TYPE": e("ERR:INVALID_ACTION_TYPE", "That governance action type does not exist.", "Action types come from a fixed vocabulary.", "Choose a supported action type."),
  "ERR:TARGET_ADDRESS_REQUIRED": e("ERR:TARGET_ADDRESS_REQUIRED", "The action needs a target address.", "Admin actions require an address target.", "Provide the target address."),
  "ERR:INVALID_BOND_KIND": e("ERR:INVALID_BOND_KIND", "That bond kind does not exist.", "Bond kinds: registration, submission, dispute.", "Choose a valid bond kind."),
  "ERR:VALUE_MUST_BE_NON_NEGATIVE": e("ERR:VALUE_MUST_BE_NON_NEGATIVE", "The proposed value cannot be negative.", "Governed amounts are non-negative.", "Adjust the value."),
  "ERR:SPLIT_BPS_EXCEEDS_100_PERCENT": e("ERR:SPLIT_BPS_EXCEEDS_100_PERCENT", "The split cannot exceed 100%.", "Basis points are capped at 10000.", "Adjust the split."),
  "ERR:SPLIT_BPS_OUT_OF_RANGE": e("ERR:SPLIT_BPS_OUT_OF_RANGE", "The split is out of range.", "Splits are 0-10000 basis points.", "Adjust the split."),
  "ERR:TREASURY_CANNOT_BE_ZERO_ADDRESS": e("ERR:TREASURY_CANNOT_BE_ZERO_ADDRESS", "The treasury cannot be the zero address.", "Forfeited bonds must have a real destination.", "Provide a valid treasury address."),
  "ERR:REPUTATION_PRIOR_WEIGHT_MUST_BE_NONZERO": e("ERR:REPUTATION_PRIOR_WEIGHT_MUST_BE_NONZERO", "The reputation prior weight must be positive.", "A zero prior would break the smoothing math.", "Choose a positive weight."),
  "ERR:INVALID_REPUTATION_SEED_KIND": e("ERR:INVALID_REPUTATION_SEED_KIND", "That reputation seed kind does not exist.", "Seed kinds: disputes, unchanged.", "Choose a valid seed kind."),
  "ERR:RATE_LIMIT_WINDOW_MUST_BE_NONZERO": e("ERR:RATE_LIMIT_WINDOW_MUST_BE_NONZERO", "The rate-limit window must be positive.", "A zero window makes no sense.", "Choose a positive window."),
  "ERR:RATE_LIMIT_MAX_MUST_BE_NONZERO": e("ERR:RATE_LIMIT_MAX_MUST_BE_NONZERO", "The rate-limit maximum must be positive.", "A zero limit blocks all submissions.", "Choose a positive maximum."),
  "ERR:MODULE_ID_REQUIRED": e("ERR:MODULE_ID_REQUIRED", "The flag action needs a module ID.", "FLAG_MODULE targets a specific module.", "Provide the module ID."),
  "ERR:SCORE_TOLERANCE_MIN_MUST_BE_AT_LEAST_ONE": e("ERR:SCORE_TOLERANCE_MIN_MUST_BE_AT_LEAST_ONE", "The tolerance minimum must be at least 1.", "A zero minimum allows zero-tolerance modules.", "Choose 1 or higher."),
  "ERR:SCORE_TOLERANCE_MAX_TOO_LARGE": e("ERR:SCORE_TOLERANCE_MAX_TOO_LARGE", "The tolerance maximum is too large.", "The bound is capped at 100.", "Choose 100 or lower."),
  "ERR:SCORE_TOLERANCE_MIN_EXCEEDS_MAX": e("ERR:SCORE_TOLERANCE_MIN_EXCEEDS_MAX", "The tolerance minimum exceeds the maximum.", "Bounds must be ordered.", "Fix the bound values."),
  "ERR:INVALID_SCORE_TOLERANCE_BOUND_KIND": e("ERR:INVALID_SCORE_TOLERANCE_BOUND_KIND", "That tolerance bound kind does not exist.", "Bound kinds: min, max.", "Choose min or max."),
  "ERR:SCORE_TOLERANCE_BOUND_OUT_OF_RANGE": e("ERR:SCORE_TOLERANCE_BOUND_OUT_OF_RANGE", "The tolerance bound is out of range.", "Bounds are 1-100.", "Adjust the bound."),
  "ERR:ACTION_NOT_FOUND": e("ERR:ACTION_NOT_FOUND", "That governance action does not exist.", "No pending action with this ID exists (or it was tracked locally and lost).", "Check the action ID."),
  "ERR:ACTION_ALREADY_EXECUTED": e("ERR:ACTION_ALREADY_EXECUTED", "That governance action was already executed.", "Governance actions execute once.", "No action available."),
  "ERR:ACTION_ALREADY_APPROVED": e("ERR:ACTION_ALREADY_APPROVED", "That governance action was already approved.", "Each action receives one second approval that starts the timelock.", "Wait for the timelock, then execute."),
  "ERR:APPROVER_MUST_DIFFER_FROM_PROPOSER": e("ERR:APPROVER_MUST_DIFFER_FROM_PROPOSER", "The approver must be a different admin than the proposer.", "Governance is 2-of-N with distinct approvals.", "Have a second admin approve."),
  "ERR:TIMELOCK_NOT_ELAPSED": e("ERR:TIMELOCK_NOT_ELAPSED", "The timelock has not elapsed yet.", "Approved actions wait 24 hours before execution.", "Wait for the timelock to finish."),
  "ERR:PAUSE_ACTION_NOT_FOUND": e("ERR:PAUSE_ACTION_NOT_FOUND", "That pause action does not exist.", "No pending pause action with this ID exists.", "Check the action ID."),
  "ERR:PAUSE_ACTION_ALREADY_EXECUTED": e("ERR:PAUSE_ACTION_ALREADY_EXECUTED", "That pause action already executed.", "Pause actions execute on their second approval.", "No action available."),
  "ERR:PAUSE_APPROVAL_WINDOW_EXPIRED": e("ERR:PAUSE_APPROVAL_WINDOW_EXPIRED", "The emergency approval window has closed.", "Pause approvals must arrive within an hour of the proposal.", "Re-propose the pause toggle."),
  "ERR:UNKNOWN_ACTION_TYPE": e("ERR:UNKNOWN_ACTION_TYPE", "Unknown governance action type.", "Defensive internal rejection.", "No action available."),
};

/** Compact constructor for registry entries. */
function e(code: string, whatHappened: string, why: string, whatToDo: string): ProtocolErrorInfo {
  return { code, whatHappened, why, whatToDo };
}

export const PROTOCOL_ERROR_COUNT: number = Object.keys(REGISTRY).length;

const ERR_CODE_PATTERN = /ERR:[A-Z0-9_]+/;

/** Extract an ERR: code from an arbitrary thrown error (message, cause chain, or nested data). */
export function extractErrorCode(error: unknown): string | null {
  if (typeof error === "string") {
    return error.match(ERR_CODE_PATTERN)?.[0] ?? null;
  }
  if (error instanceof Error) {
    const fromMessage = error.message.match(ERR_CODE_PATTERN);
    if (fromMessage) return fromMessage[0];
    const cause = (error as { cause?: unknown }).cause;
    if (cause) return extractErrorCode(cause);
  }
  if (typeof error === "object" && error !== null) {
    for (const value of Object.values(error)) {
      if (typeof value === "string") {
        const m = value.match(ERR_CODE_PATTERN);
        if (m) return m[0];
      }
      if (typeof value === "object" && value !== null) {
        const nested = extractErrorCode(value);
        if (nested) return nested;
      }
    }
  }
  return null;
}

export function getProtocolError(code: string): ProtocolErrorInfo | undefined {
  return REGISTRY[code];
}

/** Map any thrown error to human messaging: what happened -> why -> what to do. */
export function describeError(error: unknown): ProtocolErrorInfo {
  const code = extractErrorCode(error);
  const known = code === null ? undefined : REGISTRY[code];
  if (known) return known;
  return {
    code: code ?? "ERR:UNKNOWN",
    whatHappened: "The request failed.",
    why: code
      ? `The protocol returned ${code}, which is not yet mapped in the error registry.`
      : "The error could not be decoded into a known protocol error.",
    whatToDo: "Check the technical details and retry; if it persists, verify the network and contract addresses.",
  };
}
