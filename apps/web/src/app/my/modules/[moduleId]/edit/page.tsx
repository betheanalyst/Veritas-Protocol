"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { createWalletClient } from "@/adapters/genlayer-client";
import { registryClient } from "@/adapters/registry-client";
import { governanceClient } from "@/adapters/governance-client";
import { describeError } from "@/adapters/errors";
import { ProtocolWriteError } from "@/lib/tx-runtime";
import {
  MAX_DISPUTE_ROUNDS,
  validateModuleFields,
  type ModulePolicyFields,
} from "@/lib/module-validation";
import { Badge } from "@/components/primitives/Badge";
import { Button } from "@/components/primitives/Button";
import { Dialog } from "@/components/primitives/Dialog";
import { Input } from "@/components/primitives/Input";
import { Select } from "@/components/primitives/Select";
import { Textarea } from "@/components/primitives/Textarea";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock } from "@/components/states/LoadingBlock";
import { ErrorState } from "@/components/states/ErrorState";
import { useWallet } from "@/wallet/WalletProvider";
import { KNOWN_MODULE_LABELS } from "@/config/known-modules";
import type { ScoreToleranceBounds } from "@/domain/types";

const PHASE_STEPS = ["preparing", "awaiting_wallet", "submitted", "deciding", "finalizing", "finalized"] as const;

function phaseLabel(phase: string): string {
  switch (phase) {
    case "preparing": return "Preparing transaction";
    case "awaiting_wallet": return "Confirm in your wallet";
    case "submitted": return "Submitted";
    case "deciding": return "Waiting for validator consensus";
    case "finalizing": return "Finalizing on-chain";
    case "finalized": return "Module updated";
    default: return "\u2026";
  }
}

const CHANGED_FIELDS = ["evalPrompt", "criteria", "scoreTolerance", "acceptThreshold", "scoreThresholdBorderline", "minConfidence", "maxDisputeRounds", "challengeWindowSec"] as const;

export default function ModuleEditPage() {
  const params = useParams<{ moduleId: string }>();
  const moduleId = decodeURIComponent(params.moduleId);
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const modQuery = useQuery({
    queryKey: ["registry", "module", moduleId, "edit"],
    queryFn: () => registryClient.getModule(moduleId),
    retry: false,
  });
  const mod = modQuery.data;

  const [fields, setFields] = useState<ModulePolicyFields | null>(null);
  const [requireInlineContent, setRequireInlineContent] = useState(false);
  const [bounds, setBounds] = useState<ScoreToleranceBounds | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ message: string; code?: string } | null>(null);

  useEffect(() => {
    if (mod && fields === null) {
      setFields({
        moduleId: mod.moduleId,
        description: mod.description,
        moduleType: mod.moduleType,
        evaluationMethod: mod.evaluationMethod,
        scoringScale: mod.scoringScale,
        evalPrompt: mod.evalPrompt,
        criteria: mod.criteria,
        scoreTolerance: mod.scoreTolerance,
        acceptThreshold: mod.acceptThreshold,
        scoreThresholdBorderline: mod.scoreThresholdBorderline,
        minConfidence: mod.minConfidence,
        maxDisputeRounds: mod.maxDisputeRounds,
        challengeWindowSec: mod.challengeWindowSec,
      });
      setRequireInlineContent(mod.requireInlineContent);
    }
  }, [mod, fields]);

  useEffect(() => {
    let cancelled = false;
    governanceClient
      .getScoreToleranceBounds()
      .then((b) => !cancelled && setBounds(b))
      .catch(() => !cancelled && setBounds(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const errors = useMemo(
    () => (fields ? validateModuleFields(fields, bounds) : {}),
    [fields, bounds],
  );
  const dirty =
    fields !== null &&
    mod !== null &&
    (CHANGED_FIELDS.some((key) => fields[key] !== mod?.[key]) || requireInlineContent !== mod?.requireInlineContent);
  const valid = fields !== null && Object.keys(errors).length === 0 && dirty && wallet.isConnected;
  const busy = phase !== null && phase !== "failed";
  const isOwner = Boolean(wallet.address && mod && wallet.address.toLowerCase() === mod.owner.toLowerCase());

  const changedList = useMemo(() => {
    if (!fields || !mod) return [] as string[];
    return CHANGED_FIELDS.filter((key) => fields[key] !== mod[key]);
  }, [fields, mod]);

  function update<K extends keyof ModulePolicyFields>(key: K, value: ModulePolicyFields[K]) {
    setFields((current) => (current ? { ...current, [key]: value } : current));
  }

  async function submit() {
    if (!wallet.address || !fields) return;
    setFailure(null);
    setPhase("preparing");
    try {
      const ctx = { writeClient: createWalletClient(wallet.address as `0x${string}`), accountAddress: wallet.address };
      await registryClient.updateModule(ctx, moduleId, {
        evalPrompt: fields.evalPrompt,
        criteria: fields.criteria,
        scoreTolerance: fields.scoreTolerance,
        acceptThreshold: fields.acceptThreshold,
        scoreThresholdBorderline: fields.scoreThresholdBorderline,
        minConfidence: fields.minConfidence,
        maxDisputeRounds: fields.maxDisputeRounds,
        challengeWindowSec: fields.challengeWindowSec,
        requireInlineContent,
      });
      setPhase("finalized");
      await queryClient.invalidateQueries({ queryKey: ["registry"] });
    } catch (error) {
      setFailure({
        message: error instanceof ProtocolWriteError ? error.message : error instanceof Error ? error.message : String(error),
        code: error instanceof ProtocolWriteError ? error.code : undefined,
      });
      setPhase("failed");
    }
  }

  if (modQuery.isPending) {
    return <Container className="py-20"><LoadingBlock label="Loading module\u2026" /></Container>;
  }
  if (modQuery.isError) {
    const described = describeError(modQuery.error);
    return (
      <Container className="py-20">
        <ErrorState title="We could not load this module" message={described.whatHappened} code={described.code} onRetry={() => modQuery.refetch()} />
      </Container>
    );
  }
  if (!mod || !fields) return null;

  return (
    <>
      <PageHeader
        eyebrow={"Module editor"}
        title={KNOWN_MODULE_LABELS[moduleId as keyof typeof KNOWN_MODULE_LABELS] ?? moduleId}
        description={"Update the evaluation policy. Existing verifications keep the historical snapshot they were submitted under \u2014 this update applies to future verifications only."}
        actions={
          <Link href={"/modules/" + encodeURIComponent(moduleId)} className="text-sm text-fg-secondary underline-offset-4 hover:text-fg hover:underline">
            View public page
          </Link>
        }
      />
      <Container className="py-12">
        {!isOwner ? (
          <div role="alert" className="mb-6 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            Only the module owner can update this module. Your connected wallet is not the owner.
          </div>
        ) : null}

        {failure ? (
          <div role="alert" className="mb-6 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            {failure.message}
            {failure.code ? <p className="mt-1 font-mono text-xs text-fg-muted">{failure.code}</p> : null}
          </div>
        ) : null}

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{"Version " + mod.version}</Badge>
          <Badge tone="neutral">{mod.moduleType.replaceAll("_", " ")}</Badge>
          <Badge tone="neutral">{mod.evaluationMethod.replaceAll("_", " ")}</Badge>
          <Badge tone="neutral">scale {mod.scoringScale}</Badge>
          {mod.requireInlineContent ? <Badge tone="info">inline required (permanent)</Badge> : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="sm:col-span-2 lg:col-span-2">
            <label htmlFor="edit-prompt" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Evaluation prompt</label>
            <Textarea id="edit-prompt" className="mt-2 font-mono text-xs" rows={8} value={fields.evalPrompt} onChange={(event) => update("evalPrompt", event.target.value)} invalid={Boolean(errors.evalPrompt)} disabled={busy} />
            {errors.evalPrompt ? <p className="mt-1 text-xs text-danger">{errors.evalPrompt}</p> : null}
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label htmlFor="edit-criteria" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Evaluation criteria</label>
            <Textarea id="edit-criteria" className="mt-2" rows={3} value={fields.criteria} onChange={(event) => update("criteria", event.target.value)} invalid={Boolean(errors.criteria)} disabled={busy} />
            {errors.criteria ? <p className="mt-1 text-xs text-danger">{errors.criteria}</p> : null}
          </div>
          <div>
            <label htmlFor="edit-tolerance" className="text-xs uppercase tracking-[0.14em] text-fg-muted">
              Score tolerance (live bounds: {bounds ? bounds.min + "\u2013" + bounds.max : "\u2026"})
            </label>
            <Input id="edit-tolerance" type="number" min={0} className="mt-2" value={fields.scoreTolerance} onChange={(event) => update("scoreTolerance", Number(event.target.value))} invalid={Boolean(errors.scoreTolerance)} disabled={busy} />
            {errors.scoreTolerance ? <p className="mt-1 text-xs text-danger">{errors.scoreTolerance}</p> : null}
          </div>
          <div>
            <label htmlFor="edit-accept" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Accept threshold (0\u2013100)</label>
            <Input id="edit-accept" type="number" min={0} max={100} className="mt-2" value={fields.acceptThreshold} onChange={(event) => update("acceptThreshold", Number(event.target.value))} invalid={Boolean(errors.acceptThreshold)} disabled={busy} />
            {errors.acceptThreshold ? <p className="mt-1 text-xs text-danger">{errors.acceptThreshold}</p> : null}
          </div>
          <div>
            <label htmlFor="edit-borderline" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Borderline threshold (\u2264 accept)</label>
            <Input id="edit-borderline" type="number" min={0} max={100} className="mt-2" value={fields.scoreThresholdBorderline} onChange={(event) => update("scoreThresholdBorderline", Number(event.target.value))} invalid={Boolean(errors.scoreThresholdBorderline)} disabled={busy} />
            {errors.scoreThresholdBorderline ? <p className="mt-1 text-xs text-danger">{errors.scoreThresholdBorderline}</p> : null}
          </div>
          <div>
            <label htmlFor="edit-minconf" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Minimum confidence (0\u2013100)</label>
            <Input id="edit-minconf" type="number" min={0} max={100} className="mt-2" value={fields.minConfidence} onChange={(event) => update("minConfidence", Number(event.target.value))} invalid={Boolean(errors.minConfidence)} disabled={busy} />
            {errors.minConfidence ? <p className="mt-1 text-xs text-danger">{errors.minConfidence}</p> : null}
          </div>
          <div>
            <label htmlFor="edit-rounds" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Max dispute rounds (1\u20133)</label>
            <Select id="edit-rounds" className="mt-2" value={String(fields.maxDisputeRounds)} onChange={(event) => update("maxDisputeRounds", Number(event.target.value))} disabled={busy}>
              {Array.from({ length: MAX_DISPUTE_ROUNDS }, (_, index) => index + 1).map((rounds) => (
                <option key={rounds} value={rounds}>{rounds}</option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="edit-window" className="text-xs uppercase tracking-[0.14em] text-fg-muted">Challenge window (hours, 1\u2013168)</label>
            <Input id="edit-window" type="number" min={1} max={168} className="mt-2" value={Math.round(fields.challengeWindowSec / 3600)} onChange={(event) => update("challengeWindowSec", Number(event.target.value) * 3600)} invalid={Boolean(errors.challengeWindowSec)} disabled={busy} />
            {errors.challengeWindowSec ? <p className="mt-1 text-xs text-danger">{errors.challengeWindowSec}</p> : null}
          </div>
          <label className="flex items-center gap-3 text-sm text-fg-secondary lg:col-span-2">
            <input type="checkbox" checked={requireInlineContent || mod.requireInlineContent} disabled={mod.requireInlineContent || busy} onChange={(event) => setRequireInlineContent(event.target.checked)} className="h-4 w-4 accent-[#E8C15A]" />
            Require inline content
            {mod.requireInlineContent ? " (already required \u2014 this policy is one-way and cannot be downgraded)" : " (one-way: once required, it cannot be turned off)"}
          </label>
        </div>

        <div className="mt-6 rounded-md border border-hairline p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-fg-muted">Change summary</p>
          {changedList.length === 0 && requireInlineContent === mod.requireInlineContent ? (
            <p className="mt-2 text-sm text-fg-muted">No changes yet.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {changedList.map((key) => (
                <Badge key={key} tone="accent">{key}</Badge>
              ))}
              {requireInlineContent !== mod.requireInlineContent ? <Badge tone="accent">requireInlineContent</Badge> : null}
              <span className="self-center text-xs text-fg-muted">\u2192 version {mod.version} \u2192 {mod.version + 1}</span>
            </div>
          )}
          <p className="mt-3 text-xs leading-5 text-fg-muted">
            Module type, scoring scale, and evaluation method are structural and immutable after
            registration. Ownership is never transferred.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="primary" onClick={submit} disabled={!valid || busy} loading={busy}>
            Save update (version {mod.version + 1})
          </Button>
        </div>
      </Container>

      <Dialog
        open={busy || phase === "failed"}
        onClose={() => {
          if (phase === "failed") {
            setPhase(null);
            setFailure(null);
          }
        }}
        title={phase === "failed" ? "Update failed" : "Updating module"}
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
            <Button variant="primary" size="sm" onClick={() => { setPhase(null); void queryClient.invalidateQueries({ queryKey: ["registry"] }); }}>
              Done
            </Button>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
