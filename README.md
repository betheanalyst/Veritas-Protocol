# Veritas Protocol

**Verification you can dispute.**

Veritas is an AI-native, on-chain verification protocol built on GenLayer. Anyone can
define a reusable verification module — an evaluation prompt, a set of pass/fail
criteria, and a set of thresholds — and anyone else can submit a piece of content against
it: an output to fact-check, a summary to validate, code to grade, a claim to test for
hallucination. Independent AI validators evaluate the submission against the module's own
criteria and must reach consensus before a result is accepted. What comes out is not a
black-box score: it is a **classification, a score, and a confidence**, economically
bonded, disputable by the submitter, challengeable by any third party, and tracked over
time into a transparent, dispute-derived **reputation** for the module itself.

Veritas does not claim to be an oracle of truth. What it offers is something narrower and
more honest: a **priced, disputable, reputation-tracked verification result** — recorded
on-chain, reproducible, and open to challenge by anyone who thinks it's wrong.

---

## The Problem

Most "AI verification" today is a single opaque call to a single model, with no way to
challenge the result, no economic cost to being wrong, and no memory of whether a given
verifier has been right before:

- **No recourse.** A wrong classification is final the moment it's returned. There is no
  built-in way to contest it, and no on-chain record that a contest even happened.
- **No cost to being wrong.** Nothing is staked on the result, so there is no economic
  signal distinguishing a careful verification module from a careless one.
- **No memory.** Every call is stateless. A module that has been overturned by dispute a
  hundred times looks identical, from the outside, to one that has never been wrong.
- **No consensus.** A single model call is a single point of failure — there is no
  requirement that independent evaluators actually agree before a result is trusted.

Veritas addresses all four: every result is disputable and challengeable, every
submission and dispute is economically bonded, every module accrues a reputation derived
solely from how its results hold up under dispute, and no result is accepted until
independent validators reach consensus on it.

## The Veritas Approach

A task on Veritas is a record that grows:

- **Module** — registered by its owner with an evaluation prompt, criteria, a module type
  (`FACTUALITY_CHECK`, `SUMMARY_VERIFICATION`, `CODE_CORRECTNESS`,
  `HALLUCINATION_DETECTION`, `EQUIVALENCE_CHECK`, `CUSTOM`), an evaluation method
  (`LLM_CONSENSUS` or `LLM_NON_COMPARATIVE`), and scoring thresholds. Every
  evaluation-affecting field is bound into a canonical **snapshot hash**, so a task can
  later prove exactly which policy it was evaluated against, authenticated at submission
  time against the module's own on-chain record.
- **Submission** — a reference to the content being verified (inline text or a URL),
  submitted against a specific module with a bonded fee, split between the module owner
  and the protocol treasury the moment it's collected.
- **Evaluation** — an AI leader evaluates the submission against the module's frozen
  prompt and criteria; independent validators re-run the identical, deterministically
  constructed evaluation and must agree before a result — `VALID`, `INVALID`,
  `BORDERLINE`, or `UNCERTAIN`, with a score and confidence — is accepted on-chain.
- **Dispute / Challenge** — the original submitter can dispute their own result; any third
  party can challenge a `VALID` result within its module's challenge window. Either
  triggers a fresh, independent re-evaluation and posts a dispute bond, capped at
  `min(module.max_dispute_rounds, 3)` rounds per task with a cooldown between rounds.
- **Settlement** — whether the new result is a *genuine* change from the original (past
  the module's own tolerance, not just numerically different) decides the bond outcome:
  refunded in full to the disputant if genuine, forfeited and split between the module
  owner and treasury if not.
- **Reputation** — every genuine/not-genuine outcome feeds the module's reputation, a
  Bayesian-smoothed score derived exclusively from dispute history and returned alongside
  a `sample_confidence` label so a consumer can judge how much weight the score deserves.

## Built on GenLayer

Veritas runs as GenVM contracts: `submit()`'s single evaluation call is executed
independently by multiple validator nodes, and GenLayer's non-deterministic execution
(`run_nondet_unsafe`) decides whether their outputs agree before a result is accepted.

- **Leader/validator consensus, not a single model call.** A leader validator evaluates
  the submission; every other validator independently re-derives its own result using the
  *exact same* captured inputs — same prompt template, same truncation, same criteria —
  and compares deterministically via one shared, protocol-owned comparator, never a second
  LLM call. Both are defined as nested closures over the same enclosing scope, so their
  prompt construction cannot structurally diverge.
- **Injection-resistant by construction.** Submitted criteria are appended to the prompt
  inside delimiter-based, explicitly data-only framing — module owners intend criteria to
  matter to evaluation, so it has to reach the prompt, but never as free-form instruction
  text.
- **Deterministic where it must be.** Task IDs, timestamps, and classification comparisons
  are computed without randomness or wall-clock calls — GenVM's transaction timestamp is
  the only source of "now," and every deterministic contract path stays deterministic.
- **No cross-contract writes, anywhere.** The only cross-contract interaction anywhere in
  the protocol is deterministic view reads — governance parameters, read live on every
  call that needs them, and, since a module-authentication fix in `VeritasCore`, one
  read to `ModuleRegistry` per `submit()` call, confirming the caller-supplied module
  data actually matches what's on record. Never a live write from one contract into
  another.

## How a Task Moves Through Veritas

```
register_module()        → module registered, snapshot hash issued (ModuleRegistry)
submit()                  → task PENDING, submission bond forfeited (VeritasCore)
evaluate()                 → leader/validator consensus → EVALUATED, result stored
finalize()                 → after the challenge window (VALID results only) → FINALIZED
  ├─ dispute_by_submitter() → submitter disputes a non-UNCERTAIN result
  └─ challenge()             → third party challenges a VALID result
       both →  DISPUTED → re-evaluated → back to EVALUATED, bond settled
```

Settlement and reputation are computed identically regardless of which path triggered the
re-evaluation — there is exactly one definition of "did this genuinely change," reused
everywhere it's needed, never re-implemented per call site.

## Three-Contract Architecture

| Contract | Responsibility | Relationship |
|---|---|---|
| `veritas_core.py` | Task submission, evaluation/consensus, disputes, reputation, bonding, pause, rate limiting | Reads governance parameters live. Authenticates every module field a task needs by reading `ModuleRegistry`'s snapshot hash live, once per `submit()` call, and requiring the caller-supplied fields to hash to that exact value. Never writes to either sibling contract. |
| `veritas_governance.py` | Admin multisig, propose→approve→timelock→execute parameter pipeline, emergency pause | **Structurally incapable** of touching a task, a module, a dispute, or a bond — it owns parameters and admin state only, and never calls the other two contracts. |
| `module_registry.py` | Module registration, updates, and the canonical snapshot-hash integrity check | Reads governance parameters live for bond amounts and score-tolerance bounds. Called by `VeritasCore` for exactly one purpose — a read-only snapshot-hash lookup during `submit()` — and never called for anything else; never writes to either sibling contract. |

Each contract is wired to `VeritasGovernance` through its own `configure()` call —
deployer-only, and callable **exactly once** per contract. `VeritasCore`'s `configure()`
additionally wires it to `ModuleRegistry` in the same one-time call. Once set, no pointer
can be changed by anyone, including the deployer: a trust anchor that could be silently
repointed would be a standing backdoor around every other protection in the protocol.

## Governance

No protocol parameter, bond amount, treasury address, or the pause itself is controlled
by a single key:

- **Admin set** — bounded between 3 and 4 distinct admins. The deploying address starts as
  the sole admin; a one-time, unilateral `bootstrap_add_second_admin()` is the only way to
  reach two, after which every further admin change goes through the standard multisig
  path.
- **Proposals & approval** — any admin proposes one of eleven action types (bond amounts,
  treasury, revenue split, reputation prior/seed, rate-limit parameters, score-tolerance
  bounds, admin add/remove, module flagging); a second, distinct admin must approve before
  it can execute (2-of-N).
- **Timelock** — 24 hours between approval and execution, fixed and not itself
  governance-changeable, to avoid a self-referential "which duration applies" question.
  The multisig — not the timelock — is the real security boundary here; the delay exists
  for visibility, not cryptographic protection.
- **Emergency pause** — a separate, faster mechanism (1-hour approval window, no timelock)
  from every other governed parameter, because pause needs to be able to act before a
  24-hour delay would make it useless. Its scope is deliberately narrow: only
  `submit()` and `register_module()` check it. Evaluation, finalization, disputes, and
  module updates already in flight are never blocked by a pause — trapping an in-progress
  task would be a strictly worse failure mode than whatever incident prompted the pause.

## Settlement Integrity

- **Checks-effects-interactions everywhere.** Every bond-transfer site commits its state
  writes before attempting the outbound transfer, without exception.
- **Exact conservation.** Every bond split computes the owner's share by floor division and
  derives the treasury's share as a subtraction, never as an independently rounded value —
  so a rounding remainder can never silently leak or duplicate.
- **Settlements are recorded at the moment they happen**, not reconstructed later from
  current parameters — because the revenue split and bond amounts are themselves mutable
  governance parameters, and a past settlement must remain independently verifiable
  regardless of what those parameters are now.
- **Frozen snapshots.** A task's evaluation policy is frozen into it at submission time.
  A later module update — or even a protocol-level flag — never retroactively alters an
  already-submitted task.

## Deployments

**Network:** GenLayer Studionet

| | |
|---|---|
| Chain ID | `61999` |
| RPC | `https://studio.genlayer.com/api` |

| Contract | Address |
|---|---|
| `veritas_core.py` | `0x0D38aDC5e11A395B0785A8F0AF9ee012252b7763` |
| `veritas_governance.py` | `0x1A3E7a5B67e961dD2dB6D64C5732635fc5e0Cd9D` |
| `module_registry.py` | `0xBb087A4FA41d5a40a4f40450a0A565d3748f0080` |

## Project Structure

```
Veritas-Protocol/
│
├── apps/
│   └── web/                         # Veritas Protocol frontend
│       │
│       ├── app/                     # Next.js application routes
│       ├── components/              # Reusable UI components
│       ├── lib/                     # Contract, protocol, and application utilities
│       ├── hooks/                   # React hooks
│       ├── types/                   # TypeScript/domain types
│       ├── public/                  # Static assets
│       ├── scripts/                 # Development / verification scripts
│       │
│       ├── .env.example             # Public frontend configuration template
│       ├── package.json             # Frontend dependencies and scripts
│       ├── next.config.*            # Next.js configuration
│       ├── tsconfig.json             # TypeScript configuration
│       ├── tailwind.config.*         # Tailwind configuration
│       └── ...
│
├── contracts/
│   ├── veritas_core.py              # Core task/evaluation/dispute/reputation logic
│   ├── module_registry.py            # Verification module registry + snapshots
│   └── veritas_governance.py         # Governance, parameters, pause/timelock
│
├── .nvmrc                            # Required Node.js version
├── package.json                      # Repository-level development commands
├── DEPLOYMENT.md                     # Deployment information
├── SECURITY.md                       # Security information
├── README.md                         # Project documentation
└── .gitignore
```

## Running Locally

**Prerequisites**

- Node.js 22+
- npm

**Setup**

```bash
git clone https://github.com/betheanalyst/Veritas-Protocol.git
cd Veritas-Protocol

cp apps/web/.env.example apps/web/.env.local

npm --prefix apps/web install
```

**Start the development server**

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:3000
```

**Other commands**

```bash
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run linting
npm run type-check   # TypeScript checks
npm run test         # Run tests
npm run smoke        # Verify GenLayer connectivity
```

> The frontend reads its configuration from `apps/web/.env.local` to connect to the
> configured GenLayer network and Veritas V2 contracts. Never commit `.env.local` or
> expose private keys, seed phrases, or other sensitive credentials. See
> [`DEPLOYMENT.md`](./DEPLOYMENT.md) and [`SECURITY.md`](./SECURITY.md) for further detail.

## Current Status & Limitations

- **Studionet deployment.** The contracts above are deployed and configured on Studionet;
  treat bond amounts, treasury, and every other governance parameter as whatever the
  current on-chain configuration reports, not as fixed defaults.
- **Consensus depends on validator availability.** As with any GenVM contract, evaluation
  requires enough validators to independently execute and agree; this is a platform-level
  property of GenLayer, not something Veritas layers on top.
- **Reputation is dispute-derived only.** A module with very few disputes carries a `LOW`
  `sample_confidence` reputation regardless of how many submissions it has processed —
  submission volume alone never inflates reputation.

---

*Veritas is built on GenLayer — AI-mediated verification, made disputable rather than
oracular.*
