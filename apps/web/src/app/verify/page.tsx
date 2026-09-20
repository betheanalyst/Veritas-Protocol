"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { createWalletClient } from "@/adapters/genlayer-client";
import { describeError } from "@/adapters/errors";
import { coreClient } from "@/adapters/core-client";
import { governanceClient } from "@/adapters/governance-client";
import { KNOWN_MODULE_LABELS } from "@/config/known-modules";
import { Badge } from "@/components/primitives/Badge";
import { Button, buttonStyles } from "@/components/primitives/Button";
import { Dialog } from "@/components/primitives/Dialog";
import { Input } from "@/components/primitives/Input";
import { Textarea } from "@/components/primitives/Textarea";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock } from "@/components/states/LoadingBlock";
import { ErrorState } from "@/components/states/ErrorState";
import { useKnownModules, useOwnerModules, useModule } from "@/queries/useProtocolReads";
import { useWallet } from "@/wallet/WalletProvider";
import {
  clearPendingTxHash,
  isSubmitSuccess,
  readPendingTxHash,
  runSubmitVerification,
  type SubmitPhase,
} from "@/flows/submitVerification";
import { formatGEN, shortenHex } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Module } from "@/domain/types";

type Step = "select" | "brief" | "input" | "review";

const MAX_OUTPUT = 8000;
const MAX_CONTEXT = 2000;
const MAX_METADATA = 256;

const PHASE_STEPS: readonly Exclude<SubmitPhase, "idle" | "failed">[] = [
  "preparing",
  "awaiting_wallet",
  "submitted",
  "deciding",
  "finalizing",
  "finalized",
];

function PhaseIndicator({ phase }: { readonly phase: SubmitPhase }) {
  const activeIndex = PHASE_STEPS.indexOf(phase as Exclude<SubmitPhase, "idle" | "failed">);
  return (
    <ol className="space-y-3">
      {PHASE_STEPS.map((step, index) => {
        const done = phase === "finalized" || index < activeIndex;
        const current = index === activeIndex && phase !== "finalized";
        return (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden
              className={cn(
                "h-2 w-2 rounded-full",
                done ? "bg-success" : current ? "animate-pulse-soft bg-accent" : "bg-hairline",
              )}
            />
            <span className={cn(done ? "text-fg-secondary" : current ? "font-medium text-fg" : "text-fg-muted")}>
              {step === "preparing"
                ? "Preparing transaction"
                : step === "awaiting_wallet"
                  ? "Confirm in your wallet"
                  : step === "submitted"
                    ? "Submitted"
                    : step === "deciding"
                      ? "Waiting for validator consensus"
                      : step === "finalizing"
                        ? "Finalizing on-chain"
                        : "Confirmed"}
            </span>
            {current ? <span className="sr-only">(in progress)</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

function VerifyWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedModuleId = searchParams.get("module");
  const wallet = useWallet();
  const curatedQuery = useKnownModules();
  const ownerQuery = useOwnerModules(wallet.address ?? null);
  const modulesQuery = {
    data: useMemo(() => {
      const curated = curatedQuery.data ?? [];
      const owned = ownerQuery.data ?? [];
      const seen = new Set(curated.map((m) => m.moduleId));
      return [...curated, ...owned.filter((m) => !seen.has(m.moduleId))];
    }, [curatedQuery.data, ownerQuery.data]),
    isSuccess: curatedQuery.isSuccess,
    isPending: curatedQuery.isPending,
    isError: curatedQuery.isError,
    error: curatedQuery.error,
    refetch: curatedQuery.refetch,
  };

  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<Module | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [outputRef, setOutputRef] = useState("");
  const [contextRef, setContextRef] = useState("");
  const [metadata, setMetadata] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [failure, setFailure] = useState<{ message: string; code?: string; snapshotStale?: boolean } | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [moduleSearch, setModuleSearch] = useState("");

  // Fresh brief module (re-fetched whenever the wizard reaches the brief step).
  const briefModuleQuery = useModule(selected?.moduleId ?? "");
  const briefModule = briefModuleQuery.data ?? null;
  const [bondWei, setBondWei] = useState<bigint | null>(null);
  const [rateRemaining, setRateRemaining] = useState<number | null>(null);
  const [paused, setPaused] = useState<boolean | null>(null);

  // Auto-select module from ?module= query param
  useEffect(() => {
    if (preselectedModuleId && modulesQuery.isSuccess && step === "select") {
      const preselected = modulesQuery.data.find(
        (mod) => mod.moduleId === preselectedModuleId,
      );
      if (preselected) {
        setSelected(preselected);
        setStep("brief");
      }
    }
  }, [preselectedModuleId, modulesQuery.isSuccess, modulesQuery.data, step]);

  // Resume tracking a persisted tx (timeout != failure; never blind-retry).
  useEffect(() => {
    const pending = readPendingTxHash();
    if (pending && phase === "idle") {
      setTxHash(pending);
      setPhase("deciding");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== "brief" || !selected) return;
    let cancelled = false;
    (async () => {
      try {
        const [bond, isPaused] = await Promise.all([
          governanceClient.getBondAmount("submission"),
          governanceClient.isPaused(),
        ]);
        if (cancelled) return;
        setBondWei(bond);
        setPaused(isPaused);
        if (wallet.address) {
          const rate = await coreClient.getRateLimitStatus(wallet.address, selected.moduleId);
          if (!cancelled) setRateRemaining(rate.remaining);
        } else {
          setRateRemaining(null);
        }
      } catch (error) {
        if (!cancelled) setBriefError(describeError(error).whatHappened);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, selected, wallet.address]);

  const trimmedOutput = outputRef.trim();
  const isUrl = trimmedOutput.startsWith("http://") || trimmedOutput.startsWith("https://");

  const inputErrors = useMemo(() => {
    if (step !== "input" || !briefModule) return {} as Record<string, string>;
    const errors: Record<string, string> = {};
    if (!trimmedOutput) errors.output = "Provide the output to verify.";
    else if (trimmedOutput.length > MAX_OUTPUT) errors.output = `The output exceeds the protocol limit of ${MAX_OUTPUT} characters.`;
    else if (briefModule.requireInlineContent && isUrl)
      errors.output = "This module requires content to be supplied directly — URLs are not accepted.";
    if (contextRef.trim().length > MAX_CONTEXT)
      errors.context = `The context exceeds the protocol limit of ${MAX_CONTEXT} characters.`;
    if (metadata.trim().length > MAX_METADATA)
      errors.metadata = `Metadata is limited to ${MAX_METADATA} characters.`;
    return errors;
  }, [step, briefModule, trimmedOutput, isUrl, contextRef, metadata]);

  function selectModule(mod: Module) {
    setSelected(mod);
    setBriefError(null);
    setConfirmed(false);
    setStep("brief");
  }

  async function submit() {
    if (!wallet.address || !briefModule) return;
    setFailure(null);
    const writeClient = createWalletClient(wallet.address as `0x${string}`);
    const result = await runSubmitVerification(
      {
        writeClient,
        accountAddress: wallet.address,
        onPhase: (next) => setPhase(next),
      },
      {
        module: briefModule,
        outputRef: trimmedOutput,
        contextRef: contextRef.trim(),
        metadata: metadata.trim(),
      },
    );
    if (isSubmitSuccess(result)) {
      setPhase("finalized");
      router.push(`/verify/${encodeURIComponent(result.taskId)}`);
    } else {
      setPhase("failed");
      setFailure({ message: result.message, code: result.code, snapshotStale: result.snapshotStale });
      if (result.kind === "wallet_rejected") {
        setStep("review");
      }
      if (result.snapshotStale) {
        void briefModuleQuery.refetch();
        setStep("brief");
      }
    }
  }

  function resetFlow() {
    setPhase("idle");
    setFailure(null);
    setTxHash(null);
    clearPendingTxHash();
  }

  const busy = phase !== "idle" && phase !== "failed";

  return (
    <>
      <PageHeader
        eyebrow="Verification"
        title="Run a verification"
        description="Select a module, provide the content, review the cost, and submit. Every value below is read live from the protocol."
        actions={
          <Link href="/verify/lookup" className={buttonStyles({ variant: "ghost", size: "sm" })}>
            Inspect an existing verification
          </Link>
        }
      />
      <Container className="py-12">
        {modulesQuery.isPending ? <LoadingBlock label="Loading modules…" /> : null}
        {modulesQuery.isError ? (
          <ErrorState
            title="We could not load the modules"
            message={describeError(modulesQuery.error).whatHappened}
            code={describeError(modulesQuery.error).code}
            onRetry={() => modulesQuery.refetch()}
          />
        ) : null}

        {modulesQuery.isSuccess && step === "select" ? (
          <section aria-label="Select a module">
            <div className="mb-6 max-w-md">
              <label htmlFor="module-search-verify" className="text-xs uppercase tracking-[0.14em] text-fg-muted">
                Search modules
              </label>
              <Input
                id="module-search-verify"
                className="mt-2"
                placeholder="Search by name, type, or description…"
                value={moduleSearch}
                onChange={(event) => setModuleSearch(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modulesQuery.data
                .filter(
                  (mod) =>
                    !moduleSearch.trim() ||
                    mod.moduleId.toLowerCase().includes(moduleSearch.toLowerCase()) ||
                    mod.description.toLowerCase().includes(moduleSearch.toLowerCase()) ||
                    mod.moduleType.toLowerCase().includes(moduleSearch.toLowerCase()),
                )
                .map((mod) => (
                <button
                  key={mod.moduleId}
                  type="button"
                  onClick={() => selectModule(mod)}
                  className="rounded-lg border border-hairline bg-bg-surface p-5 text-left transition-colors hover:border-fg-muted/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone="neutral">{mod.moduleType.replaceAll("_", " ")}</Badge>
                    <span className="font-mono text-xs text-fg-muted">v{mod.version}</span>
                  </div>
                  <h3 className="mt-3 text-base font-medium text-fg">
                    {KNOWN_MODULE_LABELS[mod.moduleId as keyof typeof KNOWN_MODULE_LABELS] ?? mod.moduleId}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-fg-secondary">{mod.description}</p>
                </button>
                ))}
            </div>
            <p className="mt-6 text-xs leading-5 text-fg-muted">
              Curated set of known modules — not a global registry (the protocol does not expose one).
            </p>
          </section>
        ) : null}

        {step !== "select" && briefModule ? (
          <div className="mx-auto max-w-2xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <p className="font-mono text-xs text-fg-muted">
                {briefModule.moduleId} · v{briefModule.version}
              </p>
              <button
                type="button"
                onClick={() => {
                  setStep("select");
                  setConfirmed(false);
                }}
                className="text-sm text-fg-secondary underline-offset-4 hover:text-fg hover:underline"
                disabled={busy}
              >
                Change module
              </button>
            </div>

            {step === "brief" ? (
              <section aria-label="Verification brief" className="space-y-4">
                {briefError ? <ErrorState title="Brief unavailable" message={briefError} /> : null}
                <div className="rounded-lg border border-hairline bg-bg-surface p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Verification brief</h2>
                  <dl className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Accept threshold</dt>
                      <dd className="mt-1 font-mono text-sm text-fg">{briefModule.acceptThreshold}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Min confidence</dt>
                      <dd className="mt-1 font-mono text-sm text-fg">{briefModule.minConfidence}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Max dispute rounds</dt>
                      <dd className="mt-1 font-mono text-sm text-fg">{briefModule.maxDisputeRounds}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Challenge window</dt>
                      <dd className="mt-1 font-mono text-sm text-fg">{Math.round(briefModule.challengeWindowSec / 3600)} h</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-sm text-fg">
                    Content policy:{" "}
                    {briefModule.requireInlineContent
                      ? "content must be supplied directly (inline) — URLs are not accepted for the output."
                      : "output may be supplied inline or as a URL."}
                  </p>
                </div>
                <div className="rounded-lg border border-hairline bg-bg-surface p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Cost &amp; eligibility</h2>
                  <dl className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Submission bond</dt>
                      <dd className="mt-1 font-mono text-sm text-fg">
                        {bondWei === null ? "…" : formatGEN(bondWei)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-fg-muted">Submissions remaining</dt>
                      <dd className="mt-1 font-mono text-sm text-fg">
                        {wallet.address ? (rateRemaining === null ? "…" : String(rateRemaining)) : "connect wallet"}
                      </dd>
                    </div>
                  </dl>
                  {paused ? (
                    <p className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                      New submissions are currently paused by protocol governance.
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs leading-5 text-fg-muted">
                    The bond is attached exactly and forfeited to the protocol on submission. On the
                    current network there is no separate fee deposit; the total wallet requirement is
                    the bond plus standard transaction gas.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="primary" onClick={() => setStep("input")} disabled={paused === true}>
                    Continue to input
                  </Button>
                </div>
              </section>
            ) : null}

            {step === "input" ? (
              <section aria-label="Verification input" className="space-y-5">
                <div>
                  <label htmlFor="output" className="text-xs uppercase tracking-[0.14em] text-fg-muted">
                    Output {briefModule.requireInlineContent ? "(inline — required by this module)" : "(inline or URL)"}
                  </label>
                  {briefModule.requireInlineContent || !isUrl ? (
                    <Textarea
                      id="output"                      className="mt-2 font-mono"
                      value={outputRef}
                      onChange={(event) => setOutputRef(event.target.value)}
                      invalid={Boolean(inputErrors.output)}
                      aria-describedby={inputErrors.output ? "output-error" : undefined}
                    />
                  ) : (
                    <Input
                      id="output"                      className="mt-2 font-mono"
                      value={outputRef}
                      onChange={(event) => setOutputRef(event.target.value)}
                      invalid={Boolean(inputErrors.output)}
                      aria-describedby={inputErrors.output ? "output-error" : undefined}
                    />
                  )}
                  <div className="mt-1 flex items-center justify-between">
                    {inputErrors.output ? (
                      <p id="output-error" role="alert" className="text-xs text-danger">
                        {inputErrors.output}
                      </p>
                    ) : (
                      <span />
                    )}
                    <span className="font-mono text-[10px] text-fg-muted">
                      {trimmedOutput.length}/{MAX_OUTPUT}
                    </span>
                  </div>
                </div>
                <div>
                  <label htmlFor="context" className="text-xs uppercase tracking-[0.14em] text-fg-muted">
                    Grounding context (optional)
                  </label>
                  <Textarea
                    id="context"                    className="mt-2"
                    value={contextRef}
                    onChange={(event) => setContextRef(event.target.value)}
                    invalid={Boolean(inputErrors.context)}
                    aria-describedby={inputErrors.context ? "context-error" : undefined}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    {inputErrors.context ? (
                      <p id="context-error" role="alert" className="text-xs text-danger">
                        {inputErrors.context}
                      </p>
                    ) : (
                      <span />
                    )}
                    <span className="font-mono text-[10px] text-fg-muted">
                      {contextRef.trim().length}/{MAX_CONTEXT}
                    </span>
                  </div>
                </div>
                <div>
                  <label htmlFor="metadata" className="text-xs uppercase tracking-[0.14em] text-fg-muted">
                    Metadata (optional)
                  </label>
                  <Input
                    id="metadata"                    className="mt-2"
                    value={metadata}
                    onChange={(event) => setMetadata(event.target.value)}
                    invalid={Boolean(inputErrors.metadata)}
                  />
                  <p className="mt-1 text-right font-mono text-[10px] text-fg-muted">
                    {metadata.trim().length}/{MAX_METADATA}
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setStep("brief")}>
                    Back
                  </Button>
                  <Button variant="primary" onClick={() => setStep("review")} disabled={Object.keys(inputErrors).length > 0 || !trimmedOutput}>
                    Review
                  </Button>
                </div>
              </section>
            ) : null}

            {step === "review" ? (
              <section aria-label="Review" className="space-y-4">
                <div className="rounded-lg border border-hairline bg-bg-surface p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Module</h2>
                  <p className="mt-2 text-sm text-fg">
                    {KNOWN_MODULE_LABELS[briefModule.moduleId as keyof typeof KNOWN_MODULE_LABELS] ?? briefModule.moduleId} · v{briefModule.version}
                  </p>
                  <p className="mt-1 font-mono text-xs text-fg-muted">snapshot {shortenHex(briefModule.snapshotHash, 10, 6)}</p>
                </div>
                <div className="rounded-lg border border-hairline bg-bg-surface p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Input summary</h2>
                  <p className="mt-2 break-all text-sm text-fg-secondary">
                    {isUrl ? "URL output" : "Inline output"} · {trimmedOutput.length} chars
                    {contextRef.trim() ? ` · context ${contextRef.trim().length} chars` : ""}
                    {metadata.trim() ? ` · metadata “${metadata.trim()}”` : ""}
                  </p>
                </div>
                <div className="rounded-lg border border-hairline bg-bg-surface p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Cost</h2>
                  <p className="mt-2 font-mono text-lg text-fg">
                    {bondWei === null ? "…" : formatGEN(bondWei)}
                    <span className="ml-2 text-xs font-sans text-fg-muted">submission bond (forfeited to the protocol)</span>
                  </p>
                  <p className="mt-2 text-xs text-fg-muted">
                    Attached exactly as the protocol requires; plus standard transaction gas. Current Studionet has no separate fee deposit.
                  </p>
                </div>
                <label className="flex items-start gap-3 text-sm text-fg-secondary">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#E8C15A]"
                  />
                  I understand the bond is attached and forfeited on submission, and that the
                  module’s policy shown above will be frozen to this verification.
                </label>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setStep("input")} disabled={busy}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={submit}
                    disabled={!confirmed || busy || paused === true}
                    loading={busy}
                  >
                    Submit verification
                  </Button>
                </div>
                {!wallet.isConnected ? (
                  <p className="text-sm text-warning">Connect your wallet to submit.</p>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}

        <Dialog
          open={busy || phase === "failed"}
          onClose={() => {
            if (phase === "failed") resetFlow();
          }}
          title={phase === "failed" ? "Submission failed" : "Submitting verification"}
        >
          {phase === "failed" && failure ? (
            <div>
              <p className="text-sm leading-6 text-fg-secondary">{failure.message}</p>
              {failure.code ? (
                <p className="mt-3 font-mono text-xs text-fg-muted">{failure.code}</p>
              ) : null}
              {txHash ? (
                <p className="mt-3 break-all font-mono text-xs text-fg-muted">tx: {txHash}</p>
              ) : null}
              <div className="mt-5 flex justify-end gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    resetFlow();
                    setStep("review");
                  }}
                >
                  Back to review
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <PhaseIndicator phase={phase} />
              <p className="mt-5 text-xs leading-5 text-fg-muted">
                Consensus can take several minutes. This dialog reflects real protocol state — it
                will not claim completion before the chain confirms it.
              </p>
            </div>
          )
          }
        </Dialog>
      </Container>
    </>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <Container className="py-20">
        <LoadingBlock label="Loading…" />
      </Container>
    }>
      <VerifyWizard />
    </Suspense>
  );
}
