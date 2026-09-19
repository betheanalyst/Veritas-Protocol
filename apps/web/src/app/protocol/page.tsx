"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/primitives/Badge";
import { Button } from "@/components/primitives/Button";
import { DataField } from "@/components/primitives/DataField";
import { Input } from "@/components/primitives/Input";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock } from "@/components/states/LoadingBlock";
import { ErrorState } from "@/components/states/ErrorState";
import { describeError } from "@/adapters/errors";
import { useProtocolSnapshot } from "@/queries/useProtocolSnapshot";
import { getConfig } from "@/config/network";

export default function ProtocolPage() {
  const query = useProtocolSnapshot();
  const router = useRouter();
  const [taskLookup, setTaskLookup] = useState("");
  const [moduleLookup, setModuleLookup] = useState("");
  const config = getConfig();

  return (
    <>
      <PageHeader
        eyebrow="Protocol"
        title="Transparency layer"
        description="Overview, limits, lookup, and contract references — everything from the deployed contracts, nothing else."
      />
      <Container className="space-y-10 py-12">
        <section aria-label="Overview">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Overview</h2>
          {query.isPending ? <LoadingBlock label="Loading protocol data…" /> : null}
          {query.isError ? (
            <ErrorState
              title="Protocol data unavailable"
              message={describeError(query.error).whatHappened}
              code={describeError(query.error).code}
              onRetry={() => query.refetch()}
            />
          ) : null}
          {query.data ? (
            <div className="grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-3">
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Verifications submitted</p>
                <p className="mt-2 font-mono text-2xl text-fg">{query.data.protocolInfo.totalTasks}</p>
              </div>
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Registered modules</p>
                <p className="mt-2 font-mono text-2xl text-fg">{query.data.moduleCount}</p>
              </div>
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Status</p>
                <div className="mt-2">
                  {query.data.paused ? (
                    <Badge tone="warning">New submissions paused</Badge>
                  ) : (
                    <Badge tone="success">Accepting new verifications</Badge>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {query.data ? (
          <section aria-label="Limits">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Protocol limits</h2>
            <div className="grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-3">
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Max output length</p>
                <p className="mt-2 font-mono text-xl text-fg">{query.data.protocolInfo.maxOutputLen}</p>
              </div>
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Max context length</p>
                <p className="mt-2 font-mono text-xl text-fg">{query.data.protocolInfo.maxContextLen}</p>
              </div>
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Max dispute rounds</p>
                <p className="mt-2 font-mono text-xl text-fg">{query.data.protocolInfo.protocolMaxDisputeRounds}</p>
              </div>
            </div>
          </section>
        ) : null}

        <section aria-label="Lookup">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Lookup</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <form
              className="rounded-lg border border-hairline bg-bg-surface p-5"
              onSubmit={(event) => {
                event.preventDefault();
                const trimmed = taskLookup.trim();
                if (trimmed) router.push(`/verify/${encodeURIComponent(trimmed)}`);
              }}
            >
              <label htmlFor="lookup-task" className="text-xs uppercase tracking-[0.14em] text-fg-muted">
                Task ID
              </label>
              <Input
                id="lookup-task"                className="mt-2 font-mono"
                placeholder="VT-00000001-0x…"                value={taskLookup}
                onChange={(event) => setTaskLookup(event.target.value)}
              />
              <Button variant="secondary" size="sm" type="submit" className="mt-3">
                Inspect verification
              </Button>
            </form>
            <form
              className="rounded-lg border border-hairline bg-bg-surface p-5"
              onSubmit={(event) => {
                event.preventDefault();
                const trimmed = moduleLookup.trim();
                if (trimmed) router.push(`/modules/${encodeURIComponent(trimmed)}`);
              }}
            >
              <label htmlFor="lookup-module" className="text-xs uppercase tracking-[0.14em] text-fg-muted">
                Module ID
              </label>
              <Input
                id="lookup-module"                className="mt-2 font-mono"
                placeholder="module-id…"                value={moduleLookup}
                onChange={(event) => setModuleLookup(event.target.value)}
              />
              <Button variant="secondary" size="sm" type="submit" className="mt-3">
                Open module
              </Button>
            </form>
          </div>
        </section>

        <section aria-label="Contracts">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">
            Contracts ({config.env.network})
          </h2>
          <div className="rounded-lg border border-hairline bg-bg-surface p-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <DataField label="VeritasCore" value={config.env.contracts.core} displayValue={config.env.contracts.core.slice(0, 10) + "…"} />
              <DataField label="ModuleRegistry" value={config.env.contracts.registry} displayValue={config.env.contracts.registry.slice(0, 10) + "…"} />
              <DataField label="VeritasGovernance" value={config.env.contracts.governance} displayValue={config.env.contracts.governance.slice(0, 10) + "…"} />
            </div>
          </div>
        </section>

        <section aria-label="Activity scope">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Activity</h2>
          <p className="max-w-2xl text-sm leading-6 text-fg-secondary">
            The contracts do not expose a protocol-wide activity history. See{" "}
            <Link href="/activity" className="text-accent underline-offset-4 hover:underline">
              Activity
            </Link>{" "}
            for the exact scope of what is available.
          </p>
        </section>
      </Container>
    </>
  );
}
