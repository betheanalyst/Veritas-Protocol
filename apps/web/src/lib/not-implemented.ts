/**
 * Marker for adapter write-methods whose signatures are locked in Phase 0B but
 * whose implementation lands with the transaction-lifecycle UI in later
 * phases (evaluate/finalize/dispute -> Phase 3-4; register/update -> Phase 5;
 * governance -> Phase 6). Never silently stubbed: calling one fails loudly.
 */
export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}
