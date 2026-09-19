"use client";

import { useProtocolSnapshot } from "@/queries/useProtocolSnapshot";
import { ErrorState } from "@/components/states/ErrorState";
import { describeError } from "@/adapters/errors";
import { Badge } from "@/components/primitives/Badge";

interface StatDefinition {
  readonly label: string;
  readonly render: (data: { protocolInfo: { totalTasks: number; maxOutputLen: number; maxContextLen: number; protocolMaxDisputeRounds: number }; moduleCount: number }) => string;
}

const STATS: readonly StatDefinition[] = [
  { label: "Verifications submitted", render: (d) => String(d.protocolInfo.totalTasks) },
  { label: "Registered modules", render: (d) => String(d.moduleCount) },
  { label: "Max output length", render: (d) => String(d.protocolInfo.maxOutputLen) },
  { label: "Max context length", render: (d) => String(d.protocolInfo.maxContextLen) },
  { label: "Max dispute rounds", render: (d) => String(d.protocolInfo.protocolMaxDisputeRounds) },
];

/**
 * Live protocol snapshot — every value is read live from the deployed
 * contracts. Loading, error, and unavailable states are honest; nothing is
 * fabricated while data is pending.
 */
export function LiveProtocolStats() {
  const query = useProtocolSnapshot();
  const { data, isPending, isError, refetch } = query;

  return (
    <section className="border-t border-hairline py-16 sm:py-20">
      <div className="mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tightest text-fg sm:text-4xl">Live protocol</h2>
            <p className="mt-3 text-sm text-fg-secondary">Read live from the deployed Veritas contracts on GenLayer Studionet.</p>
          </div>
          {data ? (
            data.paused ? (
              <Badge tone="warning">New submissions paused</Badge>
            ) : (
              <Badge tone="success">Accepting new verifications</Badge>
            )
          ) : null}
        </div>

        {isPending ? (
          <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-5">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-bg-surface p-6">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">{stat.label}</p>
                <p aria-hidden className="mt-3 h-7 w-16 animate-pulse-soft rounded bg-white/10" />
                <span className="sr-only">Loading…</span>
              </div>
            ))}
          </div>
        ) : null}

        {isError ? (
          <div className="mt-10">
            <ErrorState
              title="Protocol data unavailable"
              message={"We could not read the live protocol data right now."}
              code={describeError(query.error).code}
              onRetry={() => refetch()}
            />
          </div>
        ) : null}

        {data ? (
          <>
            <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-5">
              {STATS.map((stat) => (
                <div key={stat.label} className="bg-bg-surface p-6">
                  <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">{stat.label}</p>
                  <p className="mt-3 font-mono text-2xl text-fg">{stat.render(data)}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-fg-muted">{data.sourceNote}</p>
          </>
        ) : null}
      </div>
    </section>
  );
}
