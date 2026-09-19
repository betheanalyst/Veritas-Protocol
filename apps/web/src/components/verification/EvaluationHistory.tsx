import { ClassificationBadge } from "./ClassificationBadge";
import { formatRelativeTime } from "@/lib/format";
import { shortenHex } from "@/lib/format";
import type { EvaluationEntry } from "@/domain/types";

/** Actual eval_history from the contract — no invented rounds. */
export function EvaluationHistory({ entries }: { readonly entries: readonly EvaluationEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-fg-muted">No evaluation history recorded yet.</p>;
  }
  return (
    <ol className="space-y-px overflow-hidden rounded-lg border border-hairline">
      {entries.map((entry, index) => (
        <li key={index} className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-bg-surface px-4 py-3">
          <span className="font-mono text-xs text-fg-muted">R{entry.roundNum}</span>
          <span className="font-mono text-sm text-fg">{entry.score}/100</span>
          <span className="font-mono text-xs text-fg-secondary">conf {entry.confidence}%</span>
          <ClassificationBadge classification={entry.classification} />
          <span className="ml-auto text-xs text-fg-muted">
            {formatRelativeTime(entry.evalTs)}· by {shortenHex(entry.triggeredBy)}
          </span>
        </li>
      ))}
    </ol>
  );
}
