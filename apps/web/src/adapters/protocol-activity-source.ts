/**
 * ProtocolActivitySource — the honest activity abstraction (D-05).
 *
 * The contracts expose NO protocol-wide activity history (Rule 9/11: never
 * claim an activity feed is protocol-wide when the data source is not). The v1
 * fallback below reports REAL aggregate values plus the curated known-module
 * set only, clearly scoped as such. A future indexer/subgraph/activity
 * service can implement this interface and be swapped in without UI rewrites.
 */
import { KNOWN_MODULE_IDS } from "@/config/known-modules";
import type { ProtocolInfo } from "@/domain/types";

import { coreClient } from "./core-client";
import { registryClient } from "./registry-client";

export interface ProtocolActivitySnapshot {
  readonly scope: "aggregates-only";
  /** Honest scope statement — displayed verbatim wherever this data is used. */
  readonly scopeNote: string;
  readonly protocolInfo: ProtocolInfo;
  readonly moduleCount: number;
  readonly knownModuleIds: readonly string[];
}

export interface ProtocolActivitySource {
  getLatestActivity(): Promise<ProtocolActivitySnapshot>;
}

const SCOPE_NOTE =
  "The Veritas contracts do not expose a protocol-wide activity history. " +
  "These are real aggregate values plus the curated set of known modules — not a global activity feed.";

/** v1 honest fallback — real aggregates only (never fabricated activity). */
export function createFallbackActivitySource(): ProtocolActivitySource {
  return {
    async getLatestActivity(): Promise<ProtocolActivitySnapshot> {
      const [protocolInfo, moduleCount] = await Promise.all([
        coreClient.getProtocolInfo(),
        registryClient.getModuleCount(),
      ]);
      return {
        scope: "aggregates-only",
        scopeNote: SCOPE_NOTE,
        protocolInfo,
        moduleCount,
        knownModuleIds: [...KNOWN_MODULE_IDS],
      };
    },
  };
}

export const protocolActivitySource: ProtocolActivitySource = createFallbackActivitySource();
