import { Badge } from "@/components/primitives/Badge";
import { formatRelativeTime } from "@/lib/format";
import type { DisputeSummary, Task } from "@/domain/types";

/**
 * Challengeability summary from get_dispute_summary. The challenge/dispute
 * transaction actions themselves arrive in Phase 4 — this panel is read-only
 * and says so honestly.
 */
export function ChallengePanel({ task, summary }: { readonly task: Task; readonly summary?: DisputeSummary }) {
  const challengeable = task.status === "EVALUATED" && task.classification === "VALID";

  return (
    <div className="rounded-lg border border-hairline bg-bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-fg">Challengeability</h3>
        {challengeable ? <Badge tone="success">VALID · within dispute rules</Badge> : null}
      </div>
      {summary ? (
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Rounds remaining</dt>
            <dd className="mt-1 font-mono text-sm text-fg">{summary.roundsRemaining}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Disputes so far</dt>
            <dd className="mt-1 font-mono text-sm text-fg">{summary.disputeCount}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Cooldown</dt>
            <dd className="mt-1 font-mono text-sm text-fg">{summary.cooldownActive ? "active" : "none"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Last dispute</dt>
            <dd className="mt-1 font-mono text-sm text-fg">
              {summary.lastDisputeTs > 0 ? formatRelativeTime(summary.lastDisputeTs) : "—"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-fg-muted">Dispute summary unavailable.</p>
      )}
      <p className="mt-4 text-xs leading-5 text-fg-muted">
        Disputes follow the protocol rules: the module allows up to {task.maxDisputeRounds} rounds
        (protocol cap {summary?.protocolMax ?? 3}), with a challenge window of
        {" "}{Math.round(task.challengeWindowSec / 3600)} h after evaluation. Filing a dispute arrives with
        the transaction flows (Phase 4).
      </p>
    </div>
  );
}
