"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { describeError } from "@/adapters/errors";
import { Badge } from "@/components/primitives/Badge";
import { Button } from "@/components/primitives/Button";
import { Dialog } from "@/components/primitives/Dialog";
import { Input } from "@/components/primitives/Input";
import { Select } from "@/components/primitives/Select";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingBlock } from "@/components/states/LoadingBlock";
import { ErrorState } from "@/components/states/ErrorState";
import {
  approvePauseToggle,
  bootstrapSecondAdmin,
  proposeGovernanceAction,
  proposePauseToggle,
  applyModuleFlag,
  readTrackedActions,
  type TrackedAction,
  approveGovernanceAction,
  executeGovernanceAction,
} from "@/flows/governanceActions";
import { useGovernanceSummary, useIsAdmin, usePendingAction } from "@/queries/useGovernanceReads";
import { useWallet } from "@/wallet/WalletProvider";
import { formatGEN, formatRelativeTime, shortenHex } from "@/lib/format";
import type { GovernanceActionType } from "@/domain/types";

const ACTION_TYPES: readonly GovernanceActionType[] = [
  "ADD_ADMIN",
  "REMOVE_ADMIN",
  "SET_BOND_AMOUNT",
  "SET_TREASURY",
  "SET_SPLIT_BPS",
  "SET_REPUTATION_PRIOR_WEIGHT",
  "SET_REPUTATION_SEED",
  "SET_RATE_LIMIT_WINDOW",
  "SET_RATE_LIMIT_MAX",
  "FLAG_MODULE",
  "SET_SCORE_TOLERANCE_BOUNDS",
];

const PHASE_STEPS = ["awaiting_wallet", "submitted", "deciding", "finalizing", "finalized"] as const;

function phaseLabel(phase: string): string {
  switch (phase) {
    case "awaiting_wallet": return "Confirm in your wallet";
    case "submitted": return "Submitted";
    case "deciding": return "Waiting for validator consensus";
    case "finalizing": return "Finalizing on-chain";
    case "finalized": return "Confirmed";
    default: return "\u2026";
  }
}

export default function GovernancePage() {
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const summaryQuery = useGovernanceSummary();
  const adminQuery = useIsAdmin(wallet.address);
  const isAdmin = adminQuery.data === true;

  const [tracked, setTracked] = useState<readonly TrackedAction[]>(() => readTrackedActions());
  const [manualId, setManualId] = useState("");
  const [proposeType, setProposeType] = useState<GovernanceActionType>("SET_BOND_AMOUNT");
  const [proposeTarget, setProposeTarget] = useState("");
  const [proposeValue, setProposeValue] = useState("");
  const [pauseTarget, setPauseTarget] = useState<"pause" | "unpause">("pause");
  const [flagModuleId, setFlagModuleId] = useState("");
  const [bootstrapAdmin, setBootstrapAdmin] = useState("");
  const [phase, setPhase] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ message: string; code?: string } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pauseActionId, setPauseActionId] = useState<string | null>(null);

  const summary = summaryQuery.data;

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["governance"] });
    setTracked(readTrackedActions());
  }

  async function run(fn: () => Promise<unknown>) {
    if (!wallet.address) return;
    setFailure(null);
    setSuccess(null);
    setPhase("awaiting_wallet");
    try {
      await fn();
      setPhase("finalized");
      refresh();
    } catch (error) {
      setFailure({ message: error instanceof Error ? error.message : String(error) });
      setPhase("failed");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Protocol governance"
        description="Administrative surface: parameters, the action queue, the emergency pause, and module flagging. Unauthorized accounts see read-only information."
        actions={
          summary ? (
            summary.paused ? (
              <Badge tone="warning">NEW SUBMISSIONS PAUSED</Badge>
            ) : (
              <Badge tone="success">OPERATIONAL</Badge>
            )
          ) : null
        }
      />
      <Container className="space-y-10 py-12">
        {summaryQuery.isPending ? <LoadingBlock label="Loading governance data\u2026" /> : null}
        {summaryQuery.isError ? (
          <ErrorState
            title="We could not load governance data"
            message={describeError(summaryQuery.error).whatHappened}
            code={describeError(summaryQuery.error).code}
            onRetry={() => summaryQuery.refetch()}
          />
        ) : null}

        {summary ? (
          <section aria-label="Overview">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Overview</h2>
            <div className="grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Administrators</p>
                <p className="mt-2 font-mono text-2xl text-fg">{summary.adminCount}</p>
              </div>
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Timelock</p>
                <p className="mt-2 font-mono text-2xl text-fg">{Math.round(summary.timelockDurationSec / 3600)} h</p>
              </div>
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Treasury</p>
                <p className="mt-2 break-all font-mono text-xs text-fg">{shortenHex(summary.treasuryAddress, 8, 6)}</p>
              </div>
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Revenue split (owner)</p>
                <p className="mt-2 font-mono text-2xl text-fg">{summary.revenueSplitBps / 100}%</p>
              </div>
            </div>
            <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-3">
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Registration bond</p>
                <p className="mt-2 font-mono text-sm text-fg">{formatGEN(summary.bondAmountRegistration)}</p>
              </div>
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Submission bond</p>
                <p className="mt-2 font-mono text-sm text-fg">{formatGEN(summary.bondAmountSubmission)}</p>
              </div>
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Dispute bond</p>
                <p className="mt-2 font-mono text-sm text-fg">{formatGEN(summary.bondAmountDispute)}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Tolerance bounds</p>
                <p className="mt-2 font-mono text-sm text-fg">{summary.scoreToleranceMin}\u2013{summary.scoreToleranceMax}</p>
              </div>
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Rate limit</p>
                <p className="mt-2 font-mono text-sm text-fg">{summary.rateLimitMax} / {Number(summary.rateLimitWindowSec) / 3600} h</p>
              </div>
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Prior weight</p>
                <p className="mt-2 font-mono text-sm text-fg">{String(summary.reputationPriorWeight)}</p>
              </div>
              <div className="bg-bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Your role</p>
                <div className="mt-2">
                  {wallet.isConnected ? (
                    adminQuery.isPending ? (
                      <span className="text-sm text-fg-muted">checking\u2026</span>
                    ) : isAdmin ? (
                      <Badge tone="accent">Administrator</Badge>
                    ) : (
                      <Badge tone="neutral">Read-only</Badge>
                    )
                  ) : (
                    <span className="text-sm text-fg-muted">not connected</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {isAdmin ? (
          <>
            <section aria-label="Propose action">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Propose action</h2>
              <div className="rounded-lg border border-hairline bg-bg-surface p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="propose-type" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Action type</label>
                    <Select id="propose-type" className="mt-2" value={proposeType} onChange={(event) => setProposeType(event.target.value as GovernanceActionType)}>
                      {ACTION_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="propose-target" className="text-xs uppercase tracking-[0.14em] text-fg-muted">
                      Target (address / kind / min|max)
                    </label>
                    <Input id="propose-target" className="mt-2 font-mono" value={proposeTarget} onChange={(event) => setProposeTarget(event.target.value)} placeholder={proposeType === "SET_BOND_AMOUNT" ? "submission" : proposeType === "SET_TREASURY" ? "0x\u2026" : proposeType === "SET_SCORE_TOLERANCE_BOUNDS" ? "min or max" : proposeType.includes("ADMIN") ? "0x\u2026 (admin address)" : "\u2014"} />
                  </div>
                  <div>
                    <label htmlFor="propose-value" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Value (integer)</label>
                    <Input id="propose-value" type="number" min={0} className="mt-2" value={proposeValue} onChange={(event) => setProposeValue(event.target.value)} />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <p className="text-xs leading-5 text-fg-muted">
                    Proposals need a second approval from a different admin, then a 24-hour timelock
                    before anyone can execute.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!proposeTarget || phase !== null}
                    onClick={() =>
                      void run(async () => {
                        const result = await proposeGovernanceAction(wallet.address as string, setPhase, proposeType, proposeTarget, BigInt(proposeValue || "0"));
                        if ("failure" in result) throw new Error(result.failure.message);
                        setSuccess(`Proposed ${result.actionId}`);
                      })
                    }
                  >
                    Propose
                  </Button>
                </div>
              </div>
            </section>

            <section aria-label="Action queue">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Action queue</h2>
              <p className="mb-4 text-xs leading-5 text-fg-muted">
                Actions proposed from this browser (locally tracked \u2014 the protocol has no
                pending-action enumeration). Use \u201cTrack\u201d to follow an action ID proposed elsewhere.
              </p>
              <div className="mb-4 flex max-w-xl items-end gap-3">
                <div className="flex-1">
                  <label htmlFor="track-id" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Track an action ID</label>
                  <Input id="track-id" className="mt-2 font-mono" placeholder="ACT-00000001" value={manualId} onChange={(event) => setManualId(event.target.value)} />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!manualId}
                  onClick={() => {
                    setTracked((current) => [
                      ...current,
                      { actionId: manualId.trim(), actionType: "SET_BOND_AMOUNT" as never, target: "(external)", value: "0", createdAt: Math.floor(Date.now() / 1000) },
                    ]);
                    setManualId("");
                  }}
                >
                  Track
                </Button>
              </div>
              {tracked.length === 0 ? (
                <EmptyState title="No tracked actions" message="Propose an action or track an existing action ID to manage it here." />
              ) : (
                <ol className="space-y-4">
                  {tracked.map((entry) => (
                    <TrackedActionRow key={entry.actionId} entry={entry} isAdmin={isAdmin} onChanged={refresh} />
                  ))}
                </ol>
              )}
            </section>

            <section aria-label="Emergency pause" className="rounded-lg border border-warning/30 bg-warning/5 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-warning">Emergency pause</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-fg-secondary">
                Pausing blocks new submissions and module registrations only \u2014 existing
                verifications stay inspectable and disputable. The second admin\u2019s approval
                executes the pause immediately; the approval must arrive within 1 hour of the
                proposal.
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div className="w-48">
                  <label htmlFor="pause-target" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Target state</label>
                  <Select id="pause-target" className="mt-2" value={pauseTarget} onChange={(event) => setPauseTarget(event.target.value as "pause" | "unpause")}>
                    <option value="pause">Pause (block new)</option>
                    <option value="unpause">Unpause</option>
                  </Select>
                </div>
                <Button variant="danger" size="sm" disabled={phase !== null} onClick={() => void run(async () => {
                  const result = await proposePauseToggle(wallet.address as string, setPhase, pauseTarget === "pause");
                  if ("failure" in result) throw new Error(result.failure.message);
                  setPauseActionId(result.actionId);
                  setSuccess(`Pause proposal ${result.actionId} \u2014 awaiting second approval within 1 h`);
                })}>
                  Propose {pauseTarget === "pause" ? "pause" : "unpause"}
                </Button>
              </div>
              {pauseActionId ? (
                <div className="mt-4 rounded-md border border-hairline p-4">
                  <p className="font-mono text-xs text-fg">{pauseActionId}</p>
                  <Button
                    variant="danger"
                    size="sm"
                    className="mt-3"
                    disabled={phase !== null || !isAdmin}
                    onClick={() => void run(async () => {
                      const result = await approvePauseToggle(wallet.address as string, setPhase, pauseActionId);
                      if ("failure" in result) throw new Error(result.failure.message);
                      setPauseActionId(null);
                    })}
                  >
                    Approve &amp; execute now (second admin)
                  </Button>
                  <p className="mt-2 text-xs text-fg-muted">The approver must be a different admin than the proposer.</p>
                </div>
              ) : null}
            </section>

            <section aria-label="Module flagging" className="rounded-lg border border-hairline bg-bg-surface p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Flag a module</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-fg-secondary">
                Two steps: (1) propose and execute a FLAG_MODULE governance action above, then
                (2) apply the flag here \u2014 the contract verifies the governance approval on-chain.
                Flagged modules stop accepting new verifications; existing ones are unaffected.
              </p>
              <div className="mt-4 flex max-w-xl items-end gap-3">
                <div className="flex-1">
                  <label htmlFor="flag-module" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Module ID</label>
                  <Input id="flag-module" className="mt-2 font-mono" value={flagModuleId} onChange={(event) => setFlagModuleId(event.target.value)} />
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={!flagModuleId || phase !== null || !isAdmin}
                  onClick={() => void run(async () => {
                    const result = await applyModuleFlag(wallet.address as string, setPhase, flagModuleId.trim());
                    if ("failure" in result) throw new Error(result.failure.message);
                    setSuccess(`Module ${flagModuleId.trim()} flagged`);
                    setFlagModuleId("");
                  })}
                >
                  Apply flag
                </Button>
              </div>
            </section>

            {summary && summary.adminCount === 1 ? (
              <section aria-label="Bootstrap second admin" className="rounded-lg border border-accent/30 bg-accent/5 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Bootstrap window open</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-fg-secondary">
                  Exactly one admin exists. The one-time bootstrap can add a second admin so that
                  the 2-of-N approval flow becomes usable. This window closes permanently once used.
                </p>
                <div className="mt-4 flex max-w-xl items-end gap-3">
                  <div className="flex-1">
                    <label htmlFor="bootstrap-admin" className="text-xs uppercase tracking-[0.14em] text-fg-muted">New admin address</label>
                    <Input id="bootstrap-admin" className="mt-2 font-mono" value={bootstrapAdmin} onChange={(event) => setBootstrapAdmin(event.target.value)} />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!bootstrapAdmin || phase !== null}
                    onClick={() => void run(async () => {
                      const result = await bootstrapSecondAdmin(wallet.address as string, setPhase, bootstrapAdmin.trim());
                      if ("failure" in result) throw new Error(result.failure.message);
                      setSuccess("Second admin added \u2014 the bootstrap window is now closed");
                      setBootstrapAdmin("");
                    })}
                  >
                    Add second admin
                  </Button>
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {success ? (
          <div role="status" className="rounded-md border border-success/30 bg-success/10 p-4 text-sm text-success">
            {success}
          </div>
        ) : null}
      </Container>

      <Dialog
        open={phase !== null}
        onClose={() => {
          if (phase === "failed") {
            setPhase(null);
            setFailure(null);
          }
        }}
        title={phase === "failed" ? "Transaction failed" : "Working on-chain"}
      >
        {phase === "failed" && failure ? (
          <div>
            <p className="text-sm leading-6 text-fg-secondary">{failure.message}</p>
            {failure.code ? <p className="mt-3 font-mono text-xs text-fg-muted">{failure.code}</p> : null}
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => { setPhase(null); setFailure(null); }}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <ol className="space-y-3">
            {PHASE_STEPS.map((step) => {
              const currentIndex = phase ? PHASE_STEPS.indexOf(phase as never) : -1;
              const stepIndex = PHASE_STEPS.indexOf(step);
              const done = phase === "finalized" || stepIndex < currentIndex;
              const current = stepIndex === currentIndex && phase !== "finalized";
              return (
                <li key={step} className="flex items-center gap-3 text-sm">
                  <span aria-hidden className={done ? "h-2 w-2 rounded-full bg-success" : current ? "h-2 w-2 animate-pulse-soft rounded-full bg-accent" : "h-2 w-2 rounded-full bg-hairline"} />
                  <span className={current ? "font-medium text-fg" : done ? "text-fg-secondary" : "text-fg-muted"}>{phaseLabel(step)}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Dialog>
    </>
  );
}

function TrackedActionRow({
  entry,
  isAdmin,
  onChanged,
}: {
  readonly entry: TrackedAction;
  readonly isAdmin: boolean;
  readonly onChanged: () => void;
}) {
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingQuery = usePendingAction(entry.actionId);
  const pending = pendingQuery.data;

  const now = Math.floor(Date.now() / 1000);
  const timelockEnd = pending ? pending.secondApprovalTs + 86400 : 0;
  const timelockElapsed = pending ? pending.secondApprovalTs > 0 && now >= timelockEnd : false;

  async function act(kind: "approve" | "execute") {
    if (!wallet.address) return;
    setBusy(kind);
    setError(null);
    try {
      if (kind === "approve") {
        const result = await approveGovernanceAction(wallet.address, () => {}, entry.actionId);
        if ("failure" in result) throw new Error(result.failure.message);
      } else {
        const result = await executeGovernanceAction(wallet.address, () => {}, entry.actionId);
        if ("failure" in result) throw new Error(result.failure.message);
      }
      await queryClient.invalidateQueries({ queryKey: ["governance"] });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="rounded-lg border border-hairline bg-bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-sm text-fg">{entry.actionId}</span>
        <Badge tone="neutral">{entry.actionType}</Badge>
        {pending ? (
          pending.executed ? (
            <Badge tone="success">EXECUTED</Badge>
          ) : pending.secondApprovalTs > 0 ? (
            timelockElapsed ? (
              <Badge tone="accent">READY TO EXECUTE</Badge>
            ) : (
              <Badge tone="info">TIMELOCK {Math.max(0, Math.ceil((timelockEnd - now) / 3600))} h left</Badge>
            )
          ) : (
            <Badge tone="warning">AWAITING SECOND APPROVAL</Badge>
          )
        ) : (
          <Badge tone="neutral">unknown on-chain</Badge>
        )}
      </div>
      <p className="mt-1 break-all text-xs text-fg-muted">
        target: {entry.target} \u00b7 value: {entry.value} \u00b7 proposed {formatRelativeTime(entry.createdAt)}
      </p>
      {pending ? (
        <p className="mt-1 text-xs text-fg-muted">
          proposer {shortenHex(pending.proposer, 6, 4)} \u00b7 second approval{" "}
          {pending.secondApprovalTs > 0 ? formatRelativeTime(pending.secondApprovalTs) : "pending"}
        </p>
      ) : pendingQuery.isError ? (
        <p className="mt-1 text-xs text-fg-muted">
          Not found on-chain (it may have been proposed elsewhere or does not exist).
        </p>
      ) : null}
      {error ? <p role="alert" className="mt-2 text-xs text-danger">{error}</p> : null}
      {isAdmin && pending && !pending.executed ? (
        <div className="mt-3 flex gap-3">
          {pending.secondApprovalTs === 0 ? (
            <Button variant="secondary" size="sm" disabled={busy !== null} loading={busy === "approve"} onClick={() => void act("approve")}>
              Approve (2nd admin)
            </Button>
          ) : null}
          {pending.secondApprovalTs > 0 && timelockElapsed ? (
            <Button variant="primary" size="sm" disabled={busy !== null} loading={busy === "execute"} onClick={() => void act("execute")}>
              Execute
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
