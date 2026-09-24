"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createWalletClient } from "@/adapters/genlayer-client";
import { coreClient } from "@/adapters/core-client";
import { governanceClient } from "@/adapters/governance-client";
import { ProtocolWriteError } from "@/lib/tx-runtime";
import { Button } from "@/components/primitives/Button";
import { Dialog } from "@/components/primitives/Dialog";
import { formatGEN, formatRelativeTime } from "@/lib/format";
import { useWallet } from "@/wallet/WalletProvider";
import type { Task } from "@/domain/types";

type ActionKind = "evaluate" | "finalize" | "dispute" | "challenge" | null;

const PHASE_STEPS = ["preparing", "awaiting_wallet", "submitted", "deciding", "finalizing", "finalized"] as const;

function phaseLabel(phase: string): string {
  switch (phase) {
    case "preparing": return "Preparing transaction";
    case "awaiting_wallet": return "Confirm in your wallet";
    case "submitted": return "Submitted";
    case "deciding": return "Waiting for validator consensus";
    case "finalizing": return "Finalizing on-chain";
    case "finalized": return "Confirmed";
    default: return "…";
  }
}

export interface TaskActionsProps {
  readonly task: Task;
}

/**
 * Action panel for evaluate / finalize / dispute / challenge. Client-side
 * eligibility mirrors the contract’s revert conditions exactly (the contract
 * remains the authority — its ERR codes are decoded on top); the dispute bond
 * is read live from governance and attached exactly.
 */
export function TaskActions({ task }: TaskActionsProps) {
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<ActionKind>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ message: string; code?: string } | null>(null);
  const [bond, setBond] = useState<bigint | null>(null);

  const isSubmitter = Boolean(wallet.address) && wallet.address?.toLowerCase() === task.submitter.toLowerCase();
  const evaluated = task.status === "EVALUATED";
  const windowEndSec = task.lastEvalTs + task.challengeWindowSec;
  const windowOpen = task.lastEvalTs > 0 && Date.now() / 1000 < windowEndSec;
  const roundsLeft = Math.max(0, Math.min(task.maxDisputeRounds, 3) - (task.evalHistory.length > 0 ? task.evalHistory.length - 1 : 0));

  // Dispute bond is read live whenever the panel needs it (never hard-coded).
  useEffect(() => {
    let cancelled = false;
    governanceClient
      .getBondAmount("dispute")
      .then((amount) => {
        if (!cancelled) setBond(amount);
      })
      .catch(() => {
        if (!cancelled) setBond(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(kind: Exclude<ActionKind, null>) {
    if (!wallet.address) return;
    setFailure(null);
    setPhase("preparing");
    try {
      const ctx = { writeClient: createWalletClient(wallet.address as `0x${string}`), accountAddress: wallet.address };
      if (kind === "evaluate") await coreClient.evaluate(ctx, task.taskId);
      else if (kind === "finalize") await coreClient.finalize(ctx, task.taskId);
      else if (kind === "dispute") {
        if (bond === null) throw new Error("The dispute bond could not be read yet — try again.");
        await coreClient.disputeBySubmitter(ctx, task.taskId, bond);
      } else if (kind === "challenge") {
        if (bond === null) throw new Error("The dispute bond could not be read yet — try again.");
        await coreClient.challenge(ctx, task.taskId, bond);
      }
      setPhase("finalized");
      // Real state changed on-chain: invalidate so every query refetches.
      await queryClient.invalidateQueries({ queryKey: ["core"] });
    } catch (error) {
      if (error instanceof ProtocolWriteError) {
        setFailure({ message: error.message, code: error.code });
      } else {
        setFailure({ message: error instanceof Error ? error.message : String(error) });
      }
      setPhase("failed");
    }
  }

  function openConfirm(kind: Exclude<ActionKind, null>) {
    setAction(kind);
    setConfirmOpen(true);
    setFailure(null);
    setPhase(null);
  }

  function closeAll() {
    setConfirmOpen(false);
    setAction(null);
    setPhase(null);
  }

  if (task.status === "FINALIZED") {
    return (
      <div className="rounded-lg border border-hairline bg-bg-surface p-5">
        <h3 className="text-sm font-semibold text-fg">Challengeability</h3>
        <p className="mt-2 text-sm text-fg-secondary">
          This verification is finalized — its result is permanently sealed.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-hairline bg-bg-surface p-5">
      <h3 className="text-sm font-semibold text-fg">Actions</h3>

      {task.status === "PENDING" ? (
        <div className="mt-3">
          <p className="text-sm leading-6 text-fg-secondary">
            This verification is awaiting evaluation. Evaluation is permissionless — anyone
            (including you) can trigger it; the consensus outcome is recorded on-chain.
          </p>
          <Button variant="primary" size="sm" className="mt-3" onClick={() => openConfirm("evaluate")} disabled={!wallet.isConnected}>
            Run evaluation
          </Button>
        </div>
      ) : null}

      {task.status === "DISPUTED" ? (
        <div className="mt-3">
          <p className="text-sm leading-6 text-fg-secondary">
            A dispute triggered re-evaluation. If the re-evaluation is not recorded yet, evaluation
            can be re-triggered once the underlying issue resolves.
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => openConfirm("evaluate")} disabled={!wallet.isConnected}>
            Retry evaluation
          </Button>
        </div>
      ) : null}

      {evaluated ? (
        <div className="mt-4 space-y-3">
          {isSubmitter && task.classification !== "UNCERTAIN" ? (
            <div>
              <p className="text-sm leading-6 text-fg-secondary">
                As the submitter you can dispute this {task.classification} result: a dispute bond is
                escrowed and re-evaluation is triggered. If the dispute genuinely changes the outcome,
                the bond is refunded in full; otherwise it is forfeited to the module owner and treasury.
                {task.classification === "VALID"
                  ? ` This VALID result is ${windowOpen ? "within" : "past"} its challenge window — third parties may also challenge it while the window remains open.`
                  : ""}
              </p>
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => openConfirm("dispute")} disabled={!wallet.isConnected || roundsLeft === 0}>
                Dispute this result
              </Button>
            </div>
          ) : null}
          {!isSubmitter && task.classification === "VALID" ? (
            <div>
              <p className="text-sm leading-6 text-fg-secondary">
                As a third party you can challenge this VALID result {windowOpen ? "while the window remains open" : "— the window has closed"}. A dispute bond is escrowed:
                refunded in full if the challenge genuinely changes the outcome, forfeited otherwise.
              </p>
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => openConfirm("challenge")} disabled={!wallet.isConnected || !windowOpen || roundsLeft === 0}>
                Challenge this result
              </Button>
            </div>
          ) : null}
          {isSubmitter && evaluated && !(task.classification === "VALID" && windowOpen) ? (
            <div>
              <p className="text-sm leading-6 text-fg-secondary">
                Finalization permanently seals this verification’s result.
              </p>
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => openConfirm("finalize")} disabled={!wallet.isConnected}>
                Finalize
              </Button>
            </div>
          ) : null}
          <p className="text-xs leading-5 text-fg-muted">
            Dispute rules: up to {task.maxDisputeRounds} rounds (module), one-hour cooldown between
            disputes, challenge window {Math.round(task.challengeWindowSec / 3600)} h after evaluation
            {task.lastEvalTs > 0 ? ` (elapsed ${formatRelativeTime(task.lastEvalTs)})` : ""}.
            {roundsLeft === 0 ? " No dispute rounds remain." : ` ${roundsLeft} round(s) remain.`}
          </p>
          {!wallet.isConnected ? (
            <p className="text-xs text-warning">Connect your wallet to act on this verification.</p>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={confirmOpen && phase === null}
        onClose={() => closeAll()}
        title={
          action === "evaluate"
            ? "Run evaluation"
            : action === "finalize"
              ? "Finalize this verification"
              : action === "dispute"
                ? "Dispute this result"
                : "Challenge this result"
        }
      >
        {action === "dispute" || action === "challenge" ? (
          <p className="text-sm leading-6 text-fg-secondary">
            A dispute bond of <span className="font-mono text-fg">{bond === null ? "…" : formatGEN(bond)}</span> will be
            attached exactly and escrowed. It is refunded in full if the dispute genuinely changes the
            outcome; otherwise it is forfeited (module owner / treasury split per governance).
          </p>
        ) : action === "finalize" ? (
          <p className="text-sm leading-6 text-fg-secondary">
            Finalization permanently seals this result. It cannot be undone, and the verification
            becomes non-challengeable.
          </p>
        ) : (
          <p className="text-sm leading-6 text-fg-secondary">
            Evaluation runs through GenLayer validator consensus against the module’s frozen policy
            and can take several minutes.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={closeAll}>
            Cancel
          </Button>
          <Button
            variant={action === "dispute" || action === "challenge" ? "danger" : "primary"}
            size="sm"
            onClick={() => {
              if (action) void run(action);
            }}
          >
            Confirm
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={phase !== null}
        onClose={() => {
          if (phase === "failed") closeAll();
        }}
        title={phase === "failed" ? "Transaction failed" : "Working on-chain"}
      >
        {phase === "failed" && failure ? (
          <div>
            <p className="text-sm leading-6 text-fg-secondary">{failure.message}</p>
            {failure.code ? <p className="mt-3 font-mono text-xs text-fg-muted">{failure.code}</p> : null}
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" size="sm" onClick={closeAll}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <ol className="space-y-3">
            {PHASE_STEPS.map((step) => {
              const currentIndex = phase ? PHASE_STEPS.indexOf(phase as never) : -1;
              const index = PHASE_STEPS.indexOf(step);
              const done = phase === "finalized" || index < currentIndex;
              const current = index === currentIndex && phase !== "finalized";
              return (
                <li key={step} className="flex items-center gap-3 text-sm">
                  <span
                    aria-hidden
                    className={
                      done
                        ? "h-2 w-2 rounded-full bg-success"
                        : current
                          ? "h-2 w-2 animate-pulse-soft rounded-full bg-accent"
                          : "h-2 w-2 rounded-full bg-hairline"
                    }
                  />
                  <span className={current ? "font-medium text-fg" : done ? "text-fg-secondary" : "text-fg-muted"}>
                    {phaseLabel(step)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {phase === "finalized" ? (
          <div className="mt-5 flex justify-end">
            <Button variant="primary" size="sm" onClick={closeAll}>
              Done — view updated result
            </Button>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
