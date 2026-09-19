import { ClassificationBadge } from "./ClassificationBadge";
import { ConfidenceDisplay } from "./ConfidenceDisplay";
import { ScoreDisplay } from "./ScoreDisplay";
import type { Task } from "@/domain/types";

/**
 * VerificationObject — the signature result component.
 * Level 1: outcome + score + confidence. Level 2: frozen policy fields.
 * Reasoning is shown only when the protocol actually returned it.
 */
export function VerificationObject({ task }: { readonly task: Task }) {
  const evaluated = task.status !== "PENDING";

  return (
    <div className="rounded-lg border border-hairline bg-bg-surface">
      <div className="border-b border-hairline p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          {evaluated ? <ClassificationBadge classification={task.classification} /> : null}
          {task.status === "DISPUTED" ? (
            <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning ring-1 ring-inset ring-warning/25">UNDER DISPUTE</span>
          ) : null}
          {task.status === "FINALIZED" ? (
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-fg-secondary ring-1 ring-inset ring-hairline">FINALIZED</span>
          ) : null}
          <span className="font-mono text-xs text-fg-muted">{task.moduleType.replaceAll("_", " ")}</span>
          <span className="font-mono text-xs text-fg-muted">v{task.moduleVersion}</span>
        </div>

        {evaluated ? (
          <div className="mt-6 grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Score</p>
              <p className="mt-1 font-mono text-6xl tracking-tightest text-fg">
                {task.score}
                <span className="ml-1 text-xl text-fg-muted">/100</span>
              </p>
            </div>
            <div className="space-y-5">
              <ScoreDisplay
                score={task.score}
                acceptThreshold={task.acceptThreshold}
                borderlineThreshold={task.scoreThresholdBorderline}
              />
              <ConfidenceDisplay confidence={task.confidence} />
            </div>
          </div>
        ) : (
          <p className="mt-6 rounded-md border border-dashed border-hairline p-4 text-sm text-fg-secondary">
            This verification is submitted and awaiting evaluation. Its score, confidence, and
            classification appear here once evaluation completes on-chain.
          </p>
        )}

        {evaluated && task.reasoning ? (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Reasoning</p>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-fg-secondary">{task.reasoning}</p>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-px bg-hairline sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Accept threshold", task.acceptThreshold],
          ["Borderline threshold", task.scoreThresholdBorderline],
          ["Min confidence", task.minConfidence],
          ["Score tolerance", task.scoreTolerance],
          ["Scale", task.scoringScale],
          ["Eval round", task.evalRound],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-bg-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">{label}</p>
            <p className="mt-1 font-mono text-sm text-fg">{String(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
