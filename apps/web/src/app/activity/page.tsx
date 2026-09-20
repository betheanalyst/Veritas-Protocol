"use client";

import Link from "next/link";

import { Badge } from "@/components/primitives/Badge";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock } from "@/components/states/LoadingBlock";
import { ErrorState } from "@/components/states/ErrorState";
import { describeError } from "@/adapters/errors";
import { useProtocolSnapshot } from "@/queries/useProtocolSnapshot";

/**
 * Activity — honest scope. The contracts expose no protocol-wide activity
 * history (D-05/Rule 11), so this page states exactly what is and is not
 * available and provides real aggregates plus lookup paths. No fabricated feed.
 */
export default function ActivityPage() {
  const query = useProtocolSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Activity"
        title="Protocol activity"
        description="What the protocol can currently tell you — stated exactly."
      />
      <Container className="py-12">
        <div className="max-w-2xl rounded-lg border border-hairline bg-bg-surface p-5">
          <div className="flex items-center gap-2">
            <Badge tone="info">Scope</Badge>
            <p className="text-sm font-medium text-fg">Aggregates only — not a global activity feed</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-fg-secondary">
            The Veritas contracts do not expose a protocol-wide activity history. Verifications
            are private-by-default in enumeration: they are reachable by task ID or by submitter,
            not by scanning the chain from this application. To keep protocol truth, this page
            shows only the aggregate values the contracts actually return.
          </p>
        </div>

        {query.isPending ? <LoadingBlock className="mt-8" label="Loading aggregates…" /> : null}
        {query.isError ? (
          <div className="mt-8">
            <ErrorState
              title="Protocol data unavailable"
              message={describeError(query.error).whatHappened}
              code={describeError(query.error).code}
              onRetry={() => query.refetch()}
            />
          </div>
        ) : null}

        {query.data ? (
          <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-3">
            <div className="bg-bg-surface p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Verifications submitted</p>
              <p className="mt-2 font-mono text-2xl text-fg">{query.data.protocolInfo.totalTasks}</p>
            </div>
            <div className="bg-bg-surface p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Registered modules</p>
              <p className="mt-2 font-mono text-2xl text-fg">{query.data.moduleCount}</p>
            </div>
            <div className="bg-bg-surface p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Protocol status</p>
              <p className="mt-2 text-sm text-fg">
                {query.data.paused ? "New submissions paused" : "Accepting new verifications"}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/verify/lookup"
            className="rounded-lg border border-hairline bg-bg-surface p-5 transition-colors hover:border-fg-muted/40"
          >
            <p className="text-sm font-medium text-fg">Look up a specific verification →</p>
            <p className="mt-1 text-xs text-fg-muted">Inspect any task by ID: result, history, evidence.</p>
          </Link>
          <Link
            href="/my/verifications"
            className="rounded-lg border border-hairline bg-bg-surface p-5 transition-colors hover:border-fg-muted/40"
          >
            <p className="text-sm font-medium text-fg">Your verifications →</p>
            <p className="mt-1 text-xs text-fg-muted">Submitter-scoped listing via your connected wallet (arrives Phase 5).</p>
          </Link>
        </div>
      </Container>
    </>
  );
}
