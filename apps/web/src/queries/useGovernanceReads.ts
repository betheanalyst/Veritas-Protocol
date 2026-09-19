"use client";

import { useQuery } from "@tanstack/react-query";

import { DEFAULT_STATE_STATUS } from "@/adapters/genlayer-client";
import { governanceClient } from "@/adapters/governance-client";

export function useGovernanceSummary() {
  return useQuery({
    queryKey: ["governance", "summary", DEFAULT_STATE_STATUS],
    queryFn: () => governanceClient.getGovernanceSummary(),
    staleTime: 15_000,
  });
}

export function useIsAdmin(address: string | null | undefined) {
  return useQuery({
    queryKey: ["governance", "is-admin", address ?? ""],
    queryFn: () => governanceClient.isAdmin(address as string),
    enabled: Boolean(address),
    staleTime: 30_000,
  });
}

export function usePendingAction(actionId: string, enabled = true) {
  return useQuery({
    queryKey: ["governance", "pending-action", actionId],
    queryFn: () => governanceClient.getPendingAction(actionId),
    enabled: enabled && actionId.length > 0,
    retry: false,
    staleTime: 10_000,
  });
}

export function usePendingPauseAction(actionId: string, enabled = true) {
  return useQuery({
    queryKey: ["governance", "pending-pause-action", actionId],
    queryFn: () => governanceClient.getPendingPauseAction(actionId),
    enabled: enabled && actionId.length > 0,
    retry: false,
    staleTime: 10_000,
  });
}
