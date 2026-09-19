import { Badge } from "@/components/primitives/Badge";
import { formatRelativeTime, shortenHex } from "@/lib/format";
import type { DisputeEntry, Task } from "@/domain/types";

/**
 * Dispute timeline driven ONLY by actual on-chain state: the task status, the
 * real evaluation history, and the real dispute log. Per-round bond outcomes
 * are emitted as on-chain events (not queryable via views) and are therefore
 * not shown — nothing is invented.
 */
export function DisputeTimeline({
  task,
  disputes,
}: {
  readonly task: Task;
  readonly disputes: readonly DisputeEntry[];
}) {
  return (
    <ol className="space-y-px overflow-hidden rounded-lg border border-hairline">
      <li className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-bg-surface px-4 py-3">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-fg-muted" />
        <span className="text-sm text-fg">Result produced</span>
        <span className="ml-auto font-mono text-xs text-fg-muted">
          {task.lastEvalTs > 0 ? formatRelativeTime(task.lastEvalTs) : "—"}
        </span>
      </li>
      {disputes.map((dispute) => {
        const reEval = task.evalHistory.find((entry) => entry.roundNum === dispute.roundNumber);
        return (
          <li key={dispute.roundNumber} className="bg-bg-surface px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" />
              <span className="text-sm text-fg">
                {dispute.disputeType === "CHALLENGER" ? "Challenged" : "Disputed by submitter"}
              </span>
              <Badge tone="neutral">round {dispute.roundNumber}</Badge>
              <span className="ml-auto font-mono text-xs text-fg-muted">
                {formatRelativeTime(dispute.timestamp)} · {shortenHex(dispute.disputant, 6, 4)}
              </span>
            </div>
            {reEval ? (
              <p className="mt-1 pl-4 text-xs text-fg-muted">
                Re-evaluation: score {reEval.score}/100 · confidence {reEval.confidence}% ·{" "}
                {reEval.classification}
              </p>
            ) : (
              <p className="mt-1 pl-4 text-xs text-fg-muted">Re-evaluation record pending.</p>
            )}
          </li>
        );
      })}
      <li className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-bg-surface px-4 py-3">
        <span
          aria-hidden
          className={
            task.status === "FINALIZED" ? "h-1.5 w-1.5 rounded-full bg-success" : "h-1.5 w-1.5 rounded-full bg-fg-muted"
          }
        />
        <span className="text-sm text-fg">
          {task.status === "FINALIZED"
            ? "Finalized"
            : task.status === "DISPUTED"
              ? "Under dispute — re-evaluation in progress"
              : "Current result stands (challengeable per rules)"}
        </span>
      </li>
    </ol>
  );
}
