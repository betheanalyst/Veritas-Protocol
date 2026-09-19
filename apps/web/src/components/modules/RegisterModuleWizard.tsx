"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { createWalletClient } from "@/adapters/genlayer-client";
import { registryClient } from "@/adapters/registry-client";
import { governanceClient } from "@/adapters/governance-client";
import { ProtocolWriteError } from "@/lib/tx-runtime";
import {
  EVALUATION_METHODS,
  MAX_DISPUTE_ROUNDS,
  MODULE_TYPES,
  PROMPT_TEMPLATE,
  SCORING_SCALES,
  validateModuleFields,
  type ModulePolicyFields,
} from "@/lib/module-validation";
import { Button } from "@/components/primitives/Button";
import { Dialog } from "@/components/primitives/Dialog";
import { Input } from "@/components/primitives/Input";
import { Select } from "@/components/primitives/Select";
import { Textarea } from "@/components/primitives/Textarea";
import { formatGEN } from "@/lib/format";
import { useWallet } from "@/wallet/WalletProvider";
import type { ScoreToleranceBounds } from "@/domain/types";

const PHASE_STEPS = ["preparing", "awaiting_wallet", "submitted", "deciding", "finalizing", "finalized"] as const;

function phaseLabel(phase: string): string {
  switch (phase) {
    case "preparing": return "Preparing transaction";
    case "awaiting_wallet": return "Confirm in your wallet";
    case "submitted": return "Submitted";
    case "deciding": return "Waiting for validator consensus";
    case "finalizing": return "Finalizing on-chain";
    case "finalized": return "Module registered";
    default: return "\u2026";
  }
}

export function RegisterModuleWizard() {
  const wallet = useWallet();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<ModulePolicyFields>({
    moduleId: "",
    description: "",
    moduleType: "FACTUALITY_CHECK",
    evaluationMethod: "LLM_CONSENSUS",
    scoringScale: "0-100",
    evalPrompt: "",
    criteria: "",
    scoreTolerance: 10,
    acceptThreshold: 85,
    scoreThresholdBorderline: 70,
    minConfidence: 55,
    maxDisputeRounds: 2,
    challengeWindowSec: 86400,
  });
  const [requireInlineContent, setRequireInlineContent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bounds, setBounds] = useState<ScoreToleranceBounds | null>(null);
  const [bond, setBond] = useState<bigint | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ message: string; code?: string } | null>(null);
  const [showPromptTemplate, setShowPromptTemplate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    governanceClient
      .getScoreToleranceBounds()
      .then((b) => !cancelled && setBounds(b))
      .catch(() => !cancelled && setBounds(null));
    governanceClient
      .getBondAmount("registration")
      .then((b) => !cancelled && setBond(b))
      .catch(() => !cancelled && setBond(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const errors = useMemo(() => validateModuleFields(fields, bounds), [fields, bounds]);
  const valid = Object.keys(errors).length === 0 && wallet.isConnected;
  const busy = phase !== null && phase !== "failed";

  function update<K extends keyof ModulePolicyFields>(key: K, value: ModulePolicyFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!wallet.address || !valid) return;
    setFailure(null);
    setPhase("preparing");
    try {
      const ctx = { writeClient: createWalletClient(wallet.address as `0x${string}`), accountAddress: wallet.address };
      await registryClient.registerModule(
        ctx,
        {
          moduleId: fields.moduleId.trim(),
          moduleType: fields.moduleType,
          scoringScale: fields.scoringScale,
          evaluationMethod: fields.evaluationMethod,
          description: fields.description.trim(),
          evalPrompt: fields.evalPrompt,
          criteria: fields.criteria.trim(),
          scoreTolerance: fields.scoreTolerance,
          acceptThreshold: fields.acceptThreshold,
          scoreThresholdBorderline: fields.scoreThresholdBorderline,
          minConfidence: fields.minConfidence,
          maxDisputeRounds: fields.maxDisputeRounds,
          challengeWindowSec: fields.challengeWindowSec,
          requireInlineContent,
        },
        bond as bigint,
      );
      setPhase("finalized");
      await queryClient.invalidateQueries({ queryKey: ["registry"] });
      await queryClient.invalidateQueries({ queryKey: ["core"] });
    } catch (error) {
      setFailure({
        message: error instanceof ProtocolWriteError ? error.message : error instanceof Error ? error.message : String(error),
        code: error instanceof ProtocolWriteError ? error.code : undefined,
      });
      setPhase("failed");
    }
  }

  if (!open) {
    return (
      <Button variant="primary" size="sm" onClick={() => setOpen(true)} disabled={!wallet.isConnected}>
        Register a module
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-hairline bg-bg-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-fg">Register a module</h2>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
          Close
        </Button>
      </div>

      {failure ? (
        <div role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {failure.message}
          {failure.code ? <p className="mt-1 font-mono text-xs text-fg-muted">{failure.code}</p> : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="reg-module-id" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Module ID</label>
          <Input id="reg-module-id" className="mt-2 font-mono" value={fields.moduleId} onChange={(event) => update("moduleId", event.target.value)} invalid={Boolean(errors.moduleId)} />
          {errors.moduleId ? <p className="mt-1 text-xs text-danger">{errors.moduleId}</p> : null}
        </div>
        <div>
          <label htmlFor="reg-type" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Module type</label>
          <Select id="reg-type" className="mt-2" value={fields.moduleType} onChange={(event) => update("moduleType", event.target.value)}>
            {MODULE_TYPES.map((type) => (
              <option key={type} value={type}>{type.replaceAll("_", " ")}</option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="reg-description" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Description</label>
          <Input id="reg-description" className="mt-2" value={fields.description} onChange={(event) => update("description", event.target.value)} invalid={Boolean(errors.description)} />
          {errors.description ? <p className="mt-1 text-xs text-danger">{errors.description}</p> : null}
        </div>
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <label htmlFor="reg-prompt" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Evaluation prompt</label>
            <button type="button" className="text-xs text-accent underline-offset-4 hover:underline" onClick={() => setShowPromptTemplate((current) => !current)}>
              {showPromptTemplate ? "Hide template" : "Use conforming template"}
            </button>
          </div>
          {showPromptTemplate ? (
            <button type="button" className="mt-2 w-full rounded border border-dashed border-hairline p-2 text-left text-xs text-fg-muted hover:text-fg" onClick={() => update("evalPrompt", PROMPT_TEMPLATE)}>
              Insert the template with the required delimiters and slots.
            </button>
          ) : null}
          <Textarea id="reg-prompt" className="mt-2 font-mono text-xs" rows={8} value={fields.evalPrompt} onChange={(event) => update("evalPrompt", event.target.value)} invalid={Boolean(errors.evalPrompt)} />
          {errors.evalPrompt ? <p className="mt-1 text-xs text-danger">{errors.evalPrompt}</p> : null}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="reg-criteria" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Evaluation criteria</label>
          <Textarea id="reg-criteria" className="mt-2" rows={3} value={fields.criteria} onChange={(event) => update("criteria", event.target.value)} invalid={Boolean(errors.criteria)} />
          {errors.criteria ? <p className="mt-1 text-xs text-danger">{errors.criteria}</p> : null}
        </div>
        <div>
          <label htmlFor="reg-method" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Evaluation method</label>
          <Select id="reg-method" className="mt-2" value={fields.evaluationMethod} onChange={(event) => update("evaluationMethod", event.target.value)}>
            {EVALUATION_METHODS.map((method) => (
              <option key={method} value={method}>{method.replaceAll("_", " ")}</option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="reg-scale" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Scoring scale</label>
          <Select id="reg-scale" className="mt-2" value={fields.scoringScale} onChange={(event) => update("scoringScale", event.target.value)}>
            {SCORING_SCALES.map((scale) => (
              <option key={scale} value={scale}>{scale}</option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="reg-tolerance" className="text-xs uppercase tracking-[0.14em] text-fg-muted">
            Score tolerance (live bounds: {bounds ? bounds.min + "\u2013" + bounds.max : "\u2026"})
          </label>
          <Input id="reg-tolerance" type="number" min={0} className="mt-2" value={fields.scoreTolerance} onChange={(event) => update("scoreTolerance", Number(event.target.value))} invalid={Boolean(errors.scoreTolerance)} />
          {errors.scoreTolerance ? <p className="mt-1 text-xs text-danger">{errors.scoreTolerance}</p> : null}
        </div>
        <div>
          <label htmlFor="reg-accept" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Accept threshold (0\u2013100)</label>
          <Input id="reg-accept" type="number" min={0} max={100} className="mt-2" value={fields.acceptThreshold} onChange={(event) => update("acceptThreshold", Number(event.target.value))} invalid={Boolean(errors.acceptThreshold)} />
          {errors.acceptThreshold ? <p className="mt-1 text-xs text-danger">{errors.acceptThreshold}</p> : null}
        </div>
        <div>
          <label htmlFor="reg-borderline" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Borderline threshold (\u2264 accept)</label>
          <Input id="reg-borderline" type="number" min={0} max={100} className="mt-2" value={fields.scoreThresholdBorderline} onChange={(event) => update("scoreThresholdBorderline", Number(event.target.value))} invalid={Boolean(errors.scoreThresholdBorderline)} />
          {errors.scoreThresholdBorderline ? <p className="mt-1 text-xs text-danger">{errors.scoreThresholdBorderline}</p> : null}
        </div>
        <div>
          <label htmlFor="reg-minconf" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Minimum confidence (0\u2013100)</label>
          <Input id="reg-minconf" type="number" min={0} max={100} className="mt-2" value={fields.minConfidence} onChange={(event) => update("minConfidence", Number(event.target.value))} invalid={Boolean(errors.minConfidence)} />
          {errors.minConfidence ? <p className="mt-1 text-xs text-danger">{errors.minConfidence}</p> : null}
        </div>
        <div>
          <label htmlFor="reg-rounds" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Max dispute rounds (1\u20133)</label>
          <Select id="reg-rounds" className="mt-2" value={String(fields.maxDisputeRounds)} onChange={(event) => update("maxDisputeRounds", Number(event.target.value))}>
            {Array.from({ length: MAX_DISPUTE_ROUNDS }, (_, index) => index + 1).map((rounds) => (
              <option key={rounds} value={rounds}>{rounds}</option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="reg-window" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Challenge window (hours, 1\u2013168)</label>
          <Input id="reg-window" type="number" min={1} max={168} className="mt-2" value={Math.round(fields.challengeWindowSec / 3600)} onChange={(event) => update("challengeWindowSec", Number(event.target.value) * 3600)} invalid={Boolean(errors.challengeWindowSec)} />
          {errors.challengeWindowSec ? <p className="mt-1 text-xs text-danger">{errors.challengeWindowSec}</p> : null}
        </div>
        <label className="flex items-center gap-3 text-sm text-fg-secondary sm:col-span-2">
          <input type="checkbox" checked={requireInlineContent} onChange={(event) => setRequireInlineContent(event.target.checked)} className="h-4 w-4 accent-[#E8C15A]" />
          Require inline content (one-way policy: once required, it can never be turned off)
        </label>
      </div>

      <div className="mt-5 rounded-md border border-hairline p-4">
        <p className="text-sm text-fg">
          Registration bond: <span className="font-mono">{bond === null ? "\u2026" : formatGEN(bond)}</span>
          <span className="ml-2 text-xs text-fg-muted">\u2014 attached exactly and forfeited 100% to the protocol treasury.</span>
        </p>
      </div>

      <label className="mt-4 flex items-start gap-3 text-sm text-fg-secondary">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-[#E8C15A]" />
        I understand the bond is forfeited on registration and that this module\u2019s policy will be frozen into every verification submitted against it.
      </label>

      <div className="mt-5 flex justify-end">
        <Button variant="primary" onClick={submit} disabled={!valid || !confirmed || busy} loading={busy}>
          Register module
        </Button>
      </div>

      <Dialog
        open={busy || phase === "failed"}
        onClose={() => {
          if (phase === "failed") {
            setPhase(null);
            setFailure(null);
          }
        }}
        title={phase === "failed" ? "Registration failed" : "Registering module"}
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
        {phase === "finalized" ? (
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="primary" size="sm" onClick={() => { setPhase(null); setOpen(false); router.push("/modules/" + encodeURIComponent(fields.moduleId.trim())); }}>
              View module
            </Button>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
