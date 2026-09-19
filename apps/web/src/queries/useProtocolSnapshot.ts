"use client";

import { useQuery } from "@tanstack/react-query";

import { DEFAULT_STATE_STATUS } from "@/adapters/genlayer-client";
import { coreClient } from "@/adapters/core-client";
import { governanceClient } from "@/adapters/governance-client";
import { registryClient } from "@/adapters/registry-client";
import { qk } from "@/queries/keys";

const ACTIVITY_SOURCE_NOTE =
  "Real aggregate protocol values. The contracts do not expose a protocol-wide activity history; " +
  "module listing is the curated set of known modules, not a global registry.";

/**
 * Landing-page protocol snapshot — real contract reads only. Failures surface
 * as honest error states (never fabricated fallback numbers).
 */
export function useProtocolSnapshot() {
  return useQuery({
    queryKey: [...qk.activity.snapshot, DEFAULT_STATE_STATUS],
    queryFn: async () => {
      const [protocolInfo, moduleCount, paused] = await Promise.all([
        coreClient.getProtocolInfo(),
        registryClient.getModuleCount(),
        governanceClient.isPaused(),
      ]);
      return { protocolInfo, moduleCount, paused, sourceNote: ACTIVITY_SOURCE_NOTE };
    },
  });
}
