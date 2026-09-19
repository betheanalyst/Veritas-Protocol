import type { StateStatus } from "@/adapters/genlayer-client";

/** Query-key factory — namespaced per adapter and including the read's finality variant (§5). */
export const qk = {
  core: {
    protocolInfo: (s: StateStatus) => ["core", "protocol-info", s] as const,
    totalTasks: (s: StateStatus) => ["core", "total-tasks", s] as const,
    task: (taskId: string, s: StateStatus) => ["core", "task", taskId, s] as const,
    result: (taskId: string, s: StateStatus) => ["core", "result", taskId, s] as const,
    taskExists: (taskId: string, s: StateStatus) => ["core", "task-exists", taskId, s] as const,
    tasksBySubmitter: (submitter: string, offset: number, limit: number) =>
      ["core", "tasks-by-submitter", submitter, offset, limit] as const,
    taskBatch: (s: StateStatus) => ["core", "task-batch", s] as const,
    disputeSummary: (taskId: string, s: StateStatus) => ["core", "dispute-summary", taskId, s] as const,
    disputeHistory: (taskId: string, s: StateStatus) => ["core", "dispute-history", taskId, s] as const,
    reputation: (moduleId: string, s: StateStatus) => ["core", "reputation", moduleId, s] as const,
    rateLimitStatus: (submitter: string, moduleId: string) =>
      ["core", "rate-limit-status", submitter, moduleId] as const,
  },
  registry: {
    module: (moduleId: string, s: StateStatus) => ["registry", "module", moduleId, s] as const,
    moduleCount: (s: StateStatus) => ["registry", "module-count", s] as const,
    snapshotHash: (moduleId: string, s: StateStatus) => ["registry", "snapshot-hash", moduleId, s] as const,
    ownerModuleIds: (owner: string, offset: number, limit: number) =>
      ["registry", "owner-module-ids", owner, offset, limit] as const,
  },
  governance: {
    summary: (s: StateStatus) => ["governance", "summary", s] as const,
    bondAmount: (kind: string) => ["governance", "bond-amount", kind] as const,
    isAdmin: (address: string) => ["governance", "is-admin", address] as const,
    scoreToleranceBounds: () => ["governance", "score-tolerance-bounds"] as const,
    pendingAction: (actionId: string) => ["governance", "pending-action", actionId] as const,
    pendingPauseAction: (actionId: string) => ["governance", "pending-pause-action", actionId] as const,
  },
  activity: {
    snapshot: ["activity", "snapshot"] as const,
  },
} as const;
