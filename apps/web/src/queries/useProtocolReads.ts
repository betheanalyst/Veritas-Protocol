"use client";

import { useQuery } from "@tanstack/react-query";

import { coreClient } from "@/adapters/core-client";
import { DEFAULT_STATE_STATUS } from "@/adapters/genlayer-client";
import { registryClient } from "@/adapters/registry-client";
import { KNOWN_MODULE_IDS } from "@/config/known-modules";
import type { Module } from "@/domain/types";

/**
 * Read-surface queries. One batched query for the known-module set (no N+1
 * pagination patterns); per-entity queries are keyed by id + finality variant.
 */

export function useKnownModules() {
  return useQuery({
    queryKey: ["registry", "known-modules", DEFAULT_STATE_STATUS, [...KNOWN_MODULE_IDS]],
    queryFn: async () => {
      const results = await Promise.allSettled(KNOWN_MODULE_IDS.map((moduleId) => registryClient.getModule(moduleId)));
      return results
        .filter((r): r is PromiseFulfilledResult<Module> => r.status === "fulfilled")
        .map((r) => r.value);
    },
    staleTime: 60_000,
  });
}

export function useModule(moduleId: string) {
  return useQuery({
    queryKey: ["registry", "module", moduleId, DEFAULT_STATE_STATUS],
    queryFn: () => registryClient.getModule(moduleId),
    enabled: moduleId.length > 0,
    staleTime: 60_000,
    retry: false,
  });
}

export function useModuleReputation(moduleId: string, enabled = true) {
  return useQuery({
    queryKey: ["core", "module-reputation", moduleId, DEFAULT_STATE_STATUS],
    queryFn: () => coreClient.getModuleReputation(moduleId),
    enabled: enabled && moduleId.length > 0,
    staleTime: 30_000,
  });
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: ["core", "task", taskId, DEFAULT_STATE_STATUS],
    queryFn: () => coreClient.getTask(taskId),
    enabled: taskId.length > 0,
    retry: false,
  });
}

export function useDisputeSummary(taskId: string, enabled = true) {
  return useQuery({
    queryKey: ["core", "dispute-summary", taskId, DEFAULT_STATE_STATUS],
    queryFn: () => coreClient.getDisputeSummary(taskId),
    enabled: enabled && taskId.length > 0,
    staleTime: 15_000,
  });
}

export function useDisputeHistory(taskId: string, enabled = true) {
  return useQuery({
    queryKey: ["core", "dispute-history", taskId, DEFAULT_STATE_STATUS],
    queryFn: () => coreClient.getDisputeHistory(taskId),
    enabled: enabled && taskId.length > 0,
    staleTime: 15_000,
  });
}

export function useOwnerModules(ownerAddress: string | null | undefined) {
  return useQuery({
    queryKey: ["registry", "owner-modules", ownerAddress ?? ""],
    queryFn: async () => {
      const ids = await registryClient.getOwnerModuleIds(ownerAddress as string, 0, 50);
      const results = await Promise.allSettled(ids.map((id) => registryClient.getModule(id)));
      return results
        .filter((r): r is PromiseFulfilledResult<Module> => r.status === "fulfilled")
        .map((r) => r.value);
    },
    enabled: Boolean(ownerAddress),
    staleTime: 60_000,
  });
}
