"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { coreClient } from "@/adapters/core-client";
import { DEFAULT_STATE_STATUS } from "@/adapters/genlayer-client";
import { describeError } from "@/adapters/errors";
import { ClassificationBadge } from "@/components/verification/ClassificationBadge";
import { Badge } from "@/components/primitives/Badge";
import { Button, buttonStyles } from "@/components/primitives/Button";
import { Select } from "@/components/primitives/Select";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingBlock } from "@/components/states/LoadingBlock";
import { useWallet } from "@/wallet/WalletProvider";
import { formatRelativeTime } from "@/lib/format";
import type { Task } from "@/domain/types";

const PAGE_SIZE = 10;

/**
 * My Verifications — paginated submitter query (bounded by the contract at
 * 50/page; we request 10) + batch reads (batch of 10 <= the 20 contract cap).
 * No global scans; everything is submitter-scoped.
 */
export default function MyVerificationsPage() {
  const wallet = useWallet();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("");
  const [sortDir, setSortDir] = useState<"newest" | "oldest">("newest");

  const query = useQuery({
    queryKey: ["core", "my-tasks", wallet.address, page, DEFAULT_STATE_STATUS],
    queryFn: async () => {
      const ids = await coreClient.getTasksBySubmitter(wallet.address as string, page * PAGE_SIZE, PAGE_SIZE);
      const tasks = ids.length > 0 ? await coreClient.getTaskBatch(ids) : [];
      return tasks;
    },
    enabled: Boolean(wallet.address),
  });

  const tasks: readonly Task[] = useMemo(() => {
    const list = [...(query.data ?? [])];
    list.sort((a, b) => (sortDir === "newest" ? b.createdTs - a.createdTs : a.createdTs - b.createdTs));
    return list;
  }, [query.data, sortDir]);

  const filtered = tasks.filter(
    (task) =>
      (!statusFilter || task.status === statusFilter) &&
      (!classificationFilter || task.classification === classificationFilter),
  );

  return (
    <>
      <PageHeader
        eyebrow="My verifications"
        title="My verifications"
        description="Every verification submitted by your connected wallet — scoped to you, never a global list."
      />
      <Container className="py-12">
        {!wallet.isConnected ? (
          <EmptyState
            title="Connect your wallet"
            message="Your verifications are scoped to your address — connect the wallet you submit from to see them."
            action={
              <Link href="/verify" className={buttonStyles({ variant: "secondary", size: "sm" })}>
                Run a verification
              </Link>
            }
          />
        ) : query.isPending ? (
          <LoadingBlock label="Loading your verifications…" />
        ) : query.isError ? (
          <ErrorState
            title="We could not load your verifications"
            message={describeError(query.error).whatHappened}
            code={describeError(query.error).code}
            onRetry={() => query.refetch()}
          />
        ) : tasks.length === 0 ? (
          <EmptyState
            title="No verifications yet"
            message="Verifications you submit with this wallet appear here."
            action={
              <Link href="/verify" className={buttonStyles({ variant: "primary", size: "sm" })}>
                Run a verification
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-44">
                <label htmlFor="filter-status" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Status</label>
                <Select id="filter-status" className="mt-2" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">All</option>
                  {"PENDING EVALUATED DISPUTED FINALIZED".split(" ").map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </Select>
              </div>
              <div className="w-44">
                <label htmlFor="filter-classification" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Classification</label>
                <Select id="filter-classification" className="mt-2" value={classificationFilter} onChange={(event) => setClassificationFilter(event.target.value)}>
                  <option value="">All</option>
                  {"VALID BORDERLINE INVALID UNCERTAIN".split(" ").map((classification) => (
                    <option key={classification} value={classification}>{classification}</option>
                  ))}
                </Select>
              </div>
              <div className="w-44">
                <label htmlFor="sort-date" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Date</label>
                <Select id="sort-date" className="mt-2" value={sortDir} onChange={(event) => setSortDir(event.target.value as "newest" | "oldest")}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </Select>
              </div>
            </div>

            <ol className="mt-8 space-y-px overflow-hidden rounded-lg border border-hairline">
              {filtered.map((task) => (
                <li key={task.taskId} className="bg-bg-surface">
                  <Link href={`/verify/${encodeURIComponent(task.taskId)}`} className="block px-4 py-3 transition-colors hover:bg-bg-surface-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="break-all font-mono text-xs text-fg">{task.taskId}</span>
                      <ClassificationBadge classification={task.classification} />
                      {task.status === "DISPUTED" ? <Badge tone="warning">UNDER DISPUTE</Badge> : null}
                      {task.status === "FINALIZED" ? <Badge tone="neutral">FINALIZED</Badge> : null}
                      <span className="ml-auto font-mono text-sm text-fg">{task.status !== "PENDING" ? `${task.score}/100` : "—"}</span>
                      <span className="font-mono text-xs text-fg-muted">{formatRelativeTime(task.createdTs)}</span>
                    </div>
                    <p className="mt-1 text-xs text-fg-muted">{task.moduleType.replaceAll("_", " ")} · v{task.moduleVersion}</p>
                  </Link>
                </li>
              ))}
              {filtered.length === 0 ? (
                <li className="bg-bg-surface px-4 py-6 text-sm text-fg-muted">No verifications match the current filters.</li>
              ) : null}
            </ol>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-fg-muted">
                Page {page + 1} · {tasks.length} of your verifications on this page (bounded reads; submitter-scoped only).
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={tasks.length < PAGE_SIZE} onClick={() => setPage((current) => current + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Container>
    </>
  );
}
