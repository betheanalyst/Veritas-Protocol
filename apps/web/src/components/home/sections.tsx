import Link from "next/link";

import { ConvergenceVisual } from "@/components/brand/ConvergenceVisual";
import { KNOWN_MODULE_IDS } from "@/config/known-modules";

/** Hero — welcoming product story; the result is the hero, not the transaction. */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-content gap-10 px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-fg-muted">
            Decentralized verification on GenLayer
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tightest text-fg sm:text-6xl">
            Make computation
            <br />
            <span className="text-accent">verifiable.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-fg-secondary">
            Veritas turns computation into results that can be evaluated, inspected, and
            challenged — with the evidence attached.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/verify"
              className="inline-flex h-12 items-center rounded-md bg-accent px-6 text-base font-medium text-[#171307] transition-colors hover:bg-accent-strong"
            >
              Run a verification
            </Link>
            <Link
              href="/modules"
              className="inline-flex h-12 items-center rounded-md bg-bg-surface-2 px-6 text-base font-medium text-fg ring-1 ring-inset ring-hairline transition-colors hover:ring-fg-muted"
            >
              Explore modules
            </Link>
          </div>
          <p className="mt-6 max-w-xl text-sm leading-6 text-fg-muted">
            No wallet required to explore. Wallet connection is only needed to submit a
            verification or dispute a result.
          </p>
        </div>
        <div aria-hidden className="hidden text-fg-muted lg:block">
          <ConvergenceVisual />
          <p className="mt-2 text-right text-xs text-fg-muted/70">
            Inputs converge through evaluation toward one inspectable outcome.
          </p>
        </div>
      </div>
    </section>
  );
}

const FLOW_STEPS = ["INPUT", "COMPUTE", "EVIDENCE", "CONSENSUS", "VERIFIED"] as const;

/** Conceptual protocol flow — explanatory only, clearly labeled conceptual. */
export function ProtocolFlow() {
  return (
    <section className="border-t border-hairline py-16">
      <div className="mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          {FLOW_STEPS.map((step, index) => (
            <div key={step} className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-fg-muted/60" />
                <span className="font-mono text-sm tracking-[0.14em] text-fg-secondary">{step}</span>
              </div>
              {index < FLOW_STEPS.length - 1 ? (
                <span aria-hidden className="hidden h-px w-10 bg-hairline sm:block" />
              ) : null}
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-fg-muted">Conceptual flow — illustrative, not a live protocol feed.</p>
      </div>
    </section>
  );
}

/** Problem — why opaque computation is hard to trust. */
export function Problem() {
  return (
    <section className="border-t border-hairline py-16 sm:py-20">
      <div className="mx-auto grid w-full max-w-content gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <h2 className="text-3xl font-semibold tracking-tightest text-fg sm:text-4xl">
            Opaque computation is difficult to trust.
          </h2>
          <p className="mt-5 text-base leading-7 text-fg-secondary">
            When a model or program renders a verdict, the answer usually arrives alone. The
            rules that shaped it stay hidden, the reasoning is not inspectable, and there is no
            way to contest a result you suspect is wrong.
          </p>
        </div>
        <div className="space-y-4">
          {[
            "You cannot see which policy governed the evaluation.",
            "You cannot inspect the evidence behind a score.",
            "You cannot challenge a result that looks wrong.",
          ].map((point) => (
            <div key={point} className="flex items-start gap-3 rounded-md border border-hairline bg-bg-surface p-4">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fg-muted" />
              <p className="text-sm leading-6 text-fg-secondary">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const HOW_STEPS = [
  {
    title: "Choose a verification module",
    body: "Each module is a registered evaluation policy — what gets checked, against which thresholds, and how disputes are handled.",
  },
  {
    title: "Provide the input and context",
    body: "Supply the output to verify and, where the module uses it, the grounding context. Length limits and content policy are enforced by the protocol.",
  },
  {
    title: "The task is submitted with a bond",
    body: "A submission bond is attached exactly as the protocol requires; the module's policy snapshot is frozen to the task at submission time.",
  },
  {
    title: "Evaluation runs through GenLayer consensus",
    body: "Independent evaluation against the frozen policy produces a score, a confidence, and a classification — with the reasoning attached.",
  },
  {
    title: "Inspect the result — and challenge it where allowed",
    body: "Every result carries integrity evidence (snapshot, output, context hashes). Supported results can be disputed within the protocol's rules.",
  },
] as const;

/** How it works. */
export function HowItWorks() {
  return (
    <section className="border-t border-hairline py-16 sm:py-20">
      <div className="mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tightest text-fg sm:text-4xl">How Veritas works</h2>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {HOW_STEPS.map((step, index) => (
            <li key={step.title} className="bg-bg-surface p-6">
              <span className="font-mono text-xs text-fg-muted">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-base font-medium text-fg">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-fg-secondary">{step.body}</p>
            </li>
          ))}
          <li className="flex flex-col justify-between bg-bg-surface p-6">
            <p className="text-sm leading-6 text-fg-secondary">
              Modules define policy. The protocol enforces it. Results carry the evidence.
            </p>
            <Link href="/verify" className="mt-4 text-sm font-medium text-accent underline-offset-4 hover:underline">
              Start a verification
            </Link>
          </li>
        </ol>
      </div>
    </section>
  );
}

/** Why GenLayer — restrained, no undocumented claims. */
export function WhyGenLayer() {
  return (
    <section className="border-t border-hairline py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tightest text-fg sm:text-4xl">Why GenLayer</h2>
        <p className="mt-5 text-base leading-7 text-fg-secondary">
          Veritas runs on GenLayer, a network whose intelligent contracts execute with AI
          participation and reach outcomes through validator consensus. That substrate is what
          lets a verification be more than a promise: the evaluation happens inside the
          protocol, and the result is recorded with its evidence rather than asserted by an
          interface.
        </p>
        <p className="mt-4 text-sm leading-6 text-fg-muted">
          The contracts live in this repository, and every value this application shows is read
          live from them.
        </p>
      </div>
    </section>
  );
}

/** Integrity — module version, policy snapshot, and the three hashes. */
export function Integrity() {
  return (
    <section className="border-t border-hairline py-16 sm:py-20">
      <div className="mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-semibold tracking-tightest text-fg sm:text-4xl">
              Every result carries its evidence.
            </h2>
            <p className="mt-5 text-base leading-7 text-fg-secondary">
              At submission, the module&apos;s evaluation policy is frozen into the task and bound to
              a snapshot hash. The submitted content is bound to output and context hashes. A
              module can evolve, but an existing verification keeps the policy it was evaluated
              under — permanently.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-hairline">
            <div className="border-b border-hairline bg-bg-surface px-5 py-4">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-fg-muted">Module</p>
              <p className="mt-1 text-sm text-fg">identity · version</p>
            </div>
            <div className="border-b border-hairline bg-bg-surface px-5 py-4">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-fg-muted">Policy snapshot</p>
              <p className="mt-1 text-sm text-fg">frozen evaluation policy</p>
            </div>
            <div className="border-b border-hairline bg-bg-surface px-5 py-4">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-fg-muted">Snapshot hash</p>
              <p className="mt-1 break-all font-mono text-sm text-fg-secondary">sha-256 of the frozen policy</p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-hairline">
              <div className="bg-bg-surface px-5 py-4">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-fg-muted">Output hash</p>
                <p className="mt-1 text-sm text-fg">what was verified</p>
              </div>
              <div className="bg-bg-surface px-5 py-4">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-fg-muted">Context hash</p>
                <p className="mt-1 text-sm text-fg">what grounded it</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Challengeability — RESULT -> CHALLENGE -> RE-EVALUATION -> RESOLUTION. */
export function Challengeability() {
  return (
    <section className="border-t border-hairline py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tightest text-fg sm:text-4xl">
          A result you can question is a result you can trust.
        </h2>
        <p className="mt-5 text-base leading-7 text-fg-secondary">
          Verifications can be disputed under the protocol&apos;s rules: within the challenge window,
          within the allowed rounds, with a bond at stake. A dispute triggers re-evaluation, and
          the outcome — including whether the dispute was genuine — is recorded.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-sm tracking-[0.12em] text-fg-secondary">
          <span>RESULT</span>
          <span aria-hidden className="text-fg-muted">→</span>
          <span>CHALLENGE</span>
          <span aria-hidden className="text-fg-muted">→</span>
          <span>RE-EVALUATION</span>
          <span aria-hidden className="text-fg-muted">→</span>
          <span className="text-accent">RESOLUTION</span>
        </div>
      </div>
    </section>
  );
}

/** Module ecosystem — explains modules; lists the curated known set honestly. */
export function ModuleEcosystem() {
  return (
    <section className="border-t border-hairline py-16 sm:py-20">
      <div className="mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tightest text-fg sm:text-4xl">
              Different jobs need different verification.
            </h2>
            <p className="mt-5 text-base leading-7 text-fg-secondary">
              Modules are the capabilities of the protocol: a claim checked against grounding,
              code checked for correctness, a summary checked for fidelity. Each carries its own
              thresholds, dispute policy, and reputation.
            </p>
          </div>
          <Link
            href="/modules"
            className="inline-flex h-11 items-center rounded-md bg-bg-surface-2 px-5 text-sm font-medium text-fg ring-1 ring-inset ring-hairline transition-colors hover:ring-fg-muted"
          >
            Explore modules
          </Link>
        </div>
        <ul className="mt-10 grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          {KNOWN_MODULE_IDS.map((moduleId) => (
            <li key={moduleId} className="bg-bg-surface p-5">
              <p className="break-all font-mono text-sm text-fg">{moduleId}</p>
              <p className="mt-2 text-xs text-fg-muted">Known verification module</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5 text-fg-muted">
          This is the curated set of modules currently known to this application — not a global
          registry. The protocol does not expose a global module enumeration.
        </p>
      </div>
    </section>
  );
}

/** Final CTA. */
export function FinalCta() {
  return (
    <section className="border-t border-hairline py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tightest text-fg sm:text-4xl">
          Simple at the surface. Precise underneath.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-fg-secondary">
          Run a verification and see the result, the confidence, the reasoning, and the evidence
          it stands on.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/verify"
            className="inline-flex h-12 items-center rounded-md bg-accent px-6 text-base font-medium text-[#171307] transition-colors hover:bg-accent-strong"
          >
            Run a verification
          </Link>
          <Link
            href="/modules"
            className="inline-flex h-12 items-center rounded-md bg-bg-surface-2 px-6 text-base font-medium text-fg ring-1 ring-inset ring-hairline transition-colors hover:ring-fg-muted"
          >
            Explore modules
          </Link>
        </div>
      </div>
    </section>
  );
}
