/**
 * Curated known module IDs (owner-supplied working samples, Studionet, 2026-09-13).
 *
 * IMPORTANT (D-04 / Rule 10): the Veritas contracts provide NO global module
 * enumeration. This is a CURATED set of known/available modules — it is never a
 * global registry and the UI must always label it as such. A future indexer can
 * be introduced behind the ProtocolActivitySource/RegistryClient boundaries
 * without changing this file's consumers.
 */
export const KNOWN_MODULE_IDS = [
  "hallucination-detector-v1",
  "code-correctness-v1",
  "factuality-checker-v1",
  "summary-verifier-v1",
] as const;

export type KnownModuleId = (typeof KNOWN_MODULE_IDS)[number];

/** Human labels are presentational; all policy/protocol data comes from the contracts. */
export const KNOWN_MODULE_LABELS: Readonly<Record<KnownModuleId, string>> = {
  "hallucination-detector-v1": "Hallucination Detector",
  "code-correctness-v1": "Code Correctness",
  "factuality-checker-v1": "Factuality Checker",
  "summary-verifier-v1": "Summary Verifier",
};
