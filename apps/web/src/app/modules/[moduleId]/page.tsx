"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge } from "@/components/primitives/Badge";
import { CopyableId } from "@/components/primitives/CopyableId";
import { DataField } from "@/components/primitives/DataField";
import { Accordion } from "@/components/primitives/Accordion";
import { LoadingBlock } from "@/components/states/LoadingBlock";
import { ErrorState } from "@/components/states/ErrorState";
import { describeError } from "@/adapters/errors";
import { useModule, useModuleReputation } from "@/queries/useProtocolReads";
import { shortenHex } from "@/lib/format";
import { KNOWN_MODULE_LABELS } from "@/config/known-modules";

export default function ModuleDetailPage() {
  const params = useParams<{ moduleId: string }>();
  const moduleId = decodeURIComponent(params.moduleId);
  const moduleQuery = useModule(moduleId);
  const reputationQuery = useModuleReputation(moduleId, moduleQuery.isSuccess);
  const mod = moduleQuery.data;
  if (!mod) return null;

  if (moduleQuery.isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <LoadingBlock label="Loading module…" />
      </div>
    );
  }

  if (moduleQuery.isError) {
    const described = describeError(moduleQuery.error);
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        {described.code === "ERR:MODULE_NOT_FOUND" ? (
          <div className="rounded-lg border border-dashed border-hairline p-10 text-center">
            <p className="text-base font-medium text-fg">No module with this ID</p>
            <p className="mt-2 text-sm text-fg-secondary">
              The protocol has no registered module “{moduleId}”. Known modules are listed in the directory.
            </p>
            <Link href="/modules" className="mt-5 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline">
              Back to the directory
            </Link>
          </div>
        ) : (
          <ErrorState
            title="We could not load this module"
            message={described.whatHappened}
            code={described.code}
            onRetry={() => moduleQuery.refetch()}
          />
        )}
      </div>
    );
  }

  const reputation = reputationQuery.data;
  const flagged = reputation?.isFlagged ?? false;

  return (
    <div className="mx-auto w-full max-w-content px-4 py-12 sm:px-6 lg:px-8">
      {flagged ? (
        <div role="alert" className="mb-6 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          This module has been flagged at the protocol level and is not accepting new verifications.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="neutral">{mod.moduleType.replaceAll("_", " ")}</Badge>
        <Badge tone="neutral">{mod.evaluationMethod.replaceAll("_", " ")}</Badge>
        <Badge tone="neutral">scale {mod.scoringScale}</Badge>
        <span className="font-mono text-xs text-fg-muted">v{mod.version}</span>
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tightest text-fg sm:text-4xl">
        {KNOWN_MODULE_LABELS[mod.moduleId as keyof typeof KNOWN_MODULE_LABELS] ?? mod.moduleId}
      </h1>
      <CopyableId value={moduleId} className="mt-2 font-mono text-xs text-fg-muted" />
      <p className="mt-3 max-w-2xl text-base leading-7 text-fg-secondary">{mod.description}</p>
      <p className="mt-2 font-mono text-xs text-fg-muted">{mod.moduleId}</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section aria-label="Evaluation policy" className="rounded-lg border border-hairline bg-bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Evaluation policy</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Accept threshold</dt>
              <dd className="mt-1 font-mono text-sm text-fg">{mod.acceptThreshold}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Borderline threshold</dt>
              <dd className="mt-1 font-mono text-sm text-fg">{mod.scoreThresholdBorderline}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Minimum confidence</dt>
              <dd className="mt-1 font-mono text-sm text-fg">{mod.minConfidence}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Score tolerance</dt>
              <dd className="mt-1 font-mono text-sm text-fg">±{mod.scoreTolerance}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-fg-muted">
            Classification: confidence below the minimum is UNCERTAIN; scores at or above the
            accept threshold are VALID; at or above the borderline threshold, BORDERLINE; otherwise INVALID.
          </p>
        </section>

        <section aria-label="Dispute and content policy" className="rounded-lg border border-hairline bg-bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Dispute &amp; content policy</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Max dispute rounds</dt>
              <dd className="mt-1 font-mono text-sm text-fg">{mod.maxDisputeRounds}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Challenge window</dt>
              <dd className="mt-1 font-mono text-sm text-fg">{Math.round(mod.challengeWindowSec / 3600)} h</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Content requirement</dt>
              <dd className="mt-1 text-sm text-fg">
                {mod.requireInlineContent
                  ? "Content must be supplied directly (inline) — URLs are not accepted for the output."
                  : "Output may be supplied inline or as a URL."}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-label="Reputation" className="rounded-lg border border-hairline bg-bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Reputation</h2>
          {reputationQuery.isPending ? (
            <LoadingBlock className="mt-4" label="Loading reputation…" />
          ) : reputation ? (
            <div className="mt-4">
              <p className="font-mono text-4xl text-fg">
                {(reputation.adjustedReputationBps / 100).toFixed(2)}
                <span className="ml-1 text-base text-fg-muted">/100</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={reputation.sampleConfidence === "HIGH" ? "success" : reputation.sampleConfidence === "MEDIUM" ? "warning" : "neutral"}>
                  {reputation.sampleConfidence} sample confidence
                </Badge>
                <span className="text-xs text-fg-muted">
                  {reputation.rawUnchanged} of {reputation.rawTotal} disputes upheld the original result
                </span>
              </div>
              {reputation.rawTotal === 0 ? (
                <p className="mt-3 text-xs text-fg-muted">
                  No dispute outcomes recorded for this module yet — the score reflects the protocol seed prior only.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">Reputation unavailable.</p>
          )}
          <p className="mt-4 text-xs leading-5 text-fg-muted">
            Reputation is derived only from dispute resolutions — higher means more disputes were
            resolved without changing the original result.
          </p>
        </section>

        <section aria-label="Integrity" className="rounded-lg border border-hairline bg-bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Integrity</h2>
          <div className="mt-4 space-y-4">
            <DataField label={`Snapshot hash (v${mod.version})`} value={mod.snapshotHash} displayValue={shortenHex(mod.snapshotHash, 10, 6)} />
            <p className="text-xs leading-5 text-fg-muted">
              Existing verifications keep the historical snapshot they were submitted under — this
              update applies to future verifications only.
            </p>
          </div>
        </section>
      </div>

      <section aria-label="Evaluation configuration" className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Evaluation configuration</h2>
        <Accordion
          items={[
            {
              id: "prompt",
              summary: "Evaluation prompt (technical)",
              content: <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-bg-input p-3 font-mono text-xs leading-5 text-fg-secondary">{mod.evalPrompt}</pre>,
            },
            {
              id: "criteria",
              summary: "Evaluation criteria",
              content: <p className="leading-6">{mod.criteria}</p>,
            },
            {
              id: "hashes",
              summary: "Hashes & owner",
              content: (
                <div className="grid gap-4">
                  <DataField label="Prompt hash" value={mod.promptHash} displayValue={shortenHex(mod.promptHash, 10, 6)} />
                  <DataField label="Criteria hash" value={mod.criteriaHash} displayValue={shortenHex(mod.criteriaHash, 10, 6)} />
                  <DataField label="Owner" value={mod.owner} displayValue={shortenHex(mod.owner, 8, 6)} />
                </div>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
