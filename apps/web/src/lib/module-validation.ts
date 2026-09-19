/**
 * Module policy validation — a faithful client-side mirror of ModuleRegistry's
 * registration/update rules (lengths, vocabularies, threshold ranges and
 * ordering, prompt delimiters + slot order, dispute rounds, challenge window,
 * LIVE score-tolerance bounds). The contract remains the authority; these
 * checks exist to prevent revertable submissions (Phase 5 exit criterion).
 */
import type { ScoreToleranceBounds } from "@/domain/types";

export const MAX_MODULE_ID_LEN = 64;
export const MAX_DESCRIPTION_LEN = 256;
export const MAX_PROMPT_LEN = 4000;
export const MAX_CRITERIA_LEN = 1000;

export const MODULE_TYPES = [
  "FACTUALITY_CHECK",
  "SUMMARY_VERIFICATION",
  "CODE_CORRECTNESS",
  "HALLUCINATION_DETECTION",
  "EQUIVALENCE_CHECK",
  "CUSTOM",
] as const;

export const EVALUATION_METHODS = ["LLM_CONSENSUS", "LLM_NON_COMPARATIVE"] as const;

export const SCORING_SCALES = ["0-100"] as const;

export const MIN_DISPUTE_ROUNDS = 1;
export const MAX_DISPUTE_ROUNDS = 3;
export const CHALLENGE_WINDOW_MIN_SEC = 3600;
export const CHALLENGE_WINDOW_MAX_SEC = 604800;

export const DELIM_OUTPUT_OPEN = "<<<VERITAS_OUTPUT_START>>>";
export const DELIM_OUTPUT_CLOSE = "<<<VERITAS_OUTPUT_END>>>";
export const DELIM_CONTEXT_OPEN = "<<<VERITAS_CONTEXT_START>>>";
export const DELIM_CONTEXT_CLOSE = "<<<VERITAS_CONTEXT_END>>>";

export const PROMPT_TEMPLATE = `You are a verification evaluator. Respond ONLY with strict JSON: {"score": <integer 0-100>, "confidence": <integer 0-100>, "reasoning": "..."}.

Model output:
<<<VERITAS_OUTPUT_START>>>
{output}
<<<VERITAS_OUTPUT_END>>>

Grounding context:
<<<VERITAS_CONTEXT_START>>>
{context}
<<<VERITAS_CONTEXT_END>>>

Score the OUTPUT against the criteria below.`;

export interface ModulePolicyFields {
  readonly moduleId: string;
  readonly description: string;
  readonly moduleType: string;
  readonly evaluationMethod: string;
  readonly scoringScale: string;
  readonly evalPrompt: string;
  readonly criteria: string;
  readonly scoreTolerance: number;
  readonly acceptThreshold: number;
  readonly scoreThresholdBorderline: number;
  readonly minConfidence: number;
  readonly maxDisputeRounds: number;
  readonly challengeWindowSec: number;
}

/**
 * Faithful mirror of the contract prompt-structure check: all four delimiters
 * present, both slots present, and each slot strictly inside its delimiters.
 */
export function validatePromptStructure(evalPrompt: string): string | null {
  if (!evalPrompt.includes(DELIM_OUTPUT_OPEN)) return "The prompt is missing the output-open delimiter.";
  if (!evalPrompt.includes(DELIM_OUTPUT_CLOSE)) return "The prompt is missing the output-close delimiter.";
  if (!evalPrompt.includes(DELIM_CONTEXT_OPEN)) return "The prompt is missing the context-open delimiter.";
  if (!evalPrompt.includes(DELIM_CONTEXT_CLOSE)) return "The prompt is missing the context-close delimiter.";
  if (!evalPrompt.includes("{output}")) return "The prompt is missing its {output} slot.";
  if (!evalPrompt.includes("{context}")) return "The prompt is missing its {context} slot.";

  const outOpen = evalPrompt.indexOf(DELIM_OUTPUT_OPEN);
  const outSlot = evalPrompt.indexOf("{output}");
  const outClose = evalPrompt.indexOf(DELIM_OUTPUT_CLOSE);
  if (!(outOpen < outSlot && outSlot < outClose)) {
    return "The {output} slot must sit strictly inside the output delimiters.";
  }

  const ctxOpen = evalPrompt.indexOf(DELIM_CONTEXT_OPEN);
  const ctxSlot = evalPrompt.indexOf("{context}");
  const ctxClose = evalPrompt.indexOf(DELIM_CONTEXT_CLOSE);
  if (!(ctxOpen < ctxSlot && ctxSlot < ctxClose)) {
    return "The {context} slot must sit strictly inside the context delimiters.";
  }
  return null;
}

/**
 * Validate the full module field set; returns per-field error messages
 * (empty object = valid). `bounds` comes LIVE from governance (Rule 7).
 */
export function validateModuleFields(
  fields: ModulePolicyFields,
  bounds: ScoreToleranceBounds | null,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (fields.moduleId.length === 0) errors.moduleId = "A module ID is required.";
  else if (fields.moduleId.length > MAX_MODULE_ID_LEN)
    errors.moduleId = `The module ID is limited to ${MAX_MODULE_ID_LEN} characters.`;

  if (fields.description.length === 0) errors.description = "A description is required.";
  else if (fields.description.length > MAX_DESCRIPTION_LEN)
    errors.description = `The description is limited to ${MAX_DESCRIPTION_LEN} characters.`;

  if (fields.evalPrompt.length === 0) errors.evalPrompt = "An evaluation prompt is required.";
  else if (fields.evalPrompt.length > MAX_PROMPT_LEN)
    errors.evalPrompt = `The prompt is limited to ${MAX_PROMPT_LEN} characters.`;
  else {
    const structureError = validatePromptStructure(fields.evalPrompt);
    if (structureError) errors.evalPrompt = structureError;
  }

  if (fields.criteria.length === 0) errors.criteria = "Evaluation criteria are required.";
  else if (fields.criteria.length > MAX_CRITERIA_LEN)
    errors.criteria = `The criteria are limited to ${MAX_CRITERIA_LEN} characters.`;

  if (!MODULE_TYPES.includes(fields.moduleType as never)) errors.moduleType = "Choose a supported module type.";
  if (!EVALUATION_METHODS.includes(fields.evaluationMethod as never)) errors.evaluationMethod = "Choose a supported evaluation method.";
  if (!SCORING_SCALES.includes(fields.scoringScale as never)) errors.scoringScale = "Choose a supported scoring scale.";

  if (bounds === null) errors.scoreTolerance = "The live tolerance bounds could not be read yet \u2014 try again.";
  else if (fields.scoreTolerance < bounds.min || fields.scoreTolerance > bounds.max)
    errors.scoreTolerance = `Score tolerance must be within the live governance bounds (${bounds.min}\u2013${bounds.max}).`;

  if (fields.acceptThreshold < 0 || fields.acceptThreshold > 100)
    errors.acceptThreshold = "The accept threshold must be 0\u2013100.";
  if (fields.scoreThresholdBorderline < 0 || fields.scoreThresholdBorderline > 100)
    errors.scoreThresholdBorderline = "The borderline threshold must be 0\u2013100.";
  if (
    !(errors.acceptThreshold || errors.scoreThresholdBorderline) &&
    fields.scoreThresholdBorderline > fields.acceptThreshold
  )
    errors.scoreThresholdBorderline = "The borderline threshold cannot exceed the accept threshold.";

  if (fields.minConfidence < 0 || fields.minConfidence > 100)
    errors.minConfidence = "Minimum confidence must be 0\u2013100.";

  if (fields.maxDisputeRounds < MIN_DISPUTE_ROUNDS || fields.maxDisputeRounds > MAX_DISPUTE_ROUNDS)
    errors.maxDisputeRounds = `Dispute rounds must be ${MIN_DISPUTE_ROUNDS}\u2013${MAX_DISPUTE_ROUNDS}.`;

  if (
    fields.challengeWindowSec < CHALLENGE_WINDOW_MIN_SEC ||
    fields.challengeWindowSec > CHALLENGE_WINDOW_MAX_SEC
  )
    errors.challengeWindowSec = "The challenge window must be between 1 hour and 7 days.";

  return errors;
}
