# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# ═══════════════════════════════════════════════════════════════════════════════
# Veritas Protocol V2 — ModuleRegistry
#
# Owns module identity and metadata — registration, updates, and the
# integrity hashes that bind a module's evaluation-affecting policy to
# every task submitted against it. register_module() is payable, collects
# exactly the current registration bond, and forfeits it 100% to treasury
# immediately (no owner split — registration is the one bond type with no
# owner-split, since there is no module owner-of-record until this call
# completes).
#
# register_module() checks VeritasGovernance.is_paused() as its first real
# validation, reverting with ERR:PROTOCOL_PAUSED if set — the identical
# check and scoping VeritasCore.submit() uses. update_module() deliberately
# does NOT check it: an owner correcting their own module's terms during an
# incident is not itself a new source of risk and should remain available.
# update_module() does read VeritasGovernance for score_tolerance's current
# valid bounds, since threshold validation applies identically to
# registration and update.
#
# WHY `owner` IS PART OF THE CANONICAL SNAPSHOT HASH: VeritasCore's
# submit() needs a module's owner address to correctly pay the
# submission-bond owner-share. Since VeritasCore makes zero cross-contract
# calls to ModuleRegistry at runtime, the owner has to arrive as a
# caller-supplied field in submit(), exactly like every other module
# field. Trusting that field without verification would let a malicious
# submitter name ANY address as the module owner and redirect that
# address's bond share to themselves — so, consistent with this protocol's
# integrity model for every other module field, `owner` is bound into the
# hashed snapshot. It is therefore part of the canonical snapshot-hash
# field list in this file, and is identical in VeritasCore's own
# _compute_snapshot_hash — the two must remain byte-for-byte identical
# forever.
#
# score_tolerance's valid range is owned by VeritasGovernance
# (score_tolerance_min/max) and read live here, never cached — a module's
# own score_tolerance value remains module-owned and frozen into each
# task's snapshot at submission.
# ═══════════════════════════════════════════════════════════════════════════════

import hashlib
from dataclasses import dataclass
from genlayer import *


# ══════════════════════════════════════════════════════════════════════════════
# Module-level pure helpers
# Placed at module scope — carry no self/storage reference. hashlib.sha256
# is deterministic and safe to use in a GenVM contract.
# ══════════════════════════════════════════════════════════════════════════════

def _sha256(value: str) -> str:
    """Return lowercase 64-char hex SHA-256 of the UTF-8 encoding of value."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _compute_snapshot_hash(
    module_id:              str,
    owner:                    str,
    version:                   int,
    eval_prompt:                str,
    criteria:                    str,
    score_tolerance:               int,
    accept_threshold:                int,
    score_threshold_borderline:        int,
    min_confidence:                      int,
    max_dispute_rounds:                    int,
    challenge_window_sec:                    int,
    require_inline_content:                    bool,
    evaluation_method:                           str,
    scoring_scale:                                  str,
) -> str:
    """
    Canonical snapshot hash covering ALL evaluation-affecting policy fields,
    via pipe-delimited concatenation.

    Field order is CANONICAL and must match VeritasCore._compute_snapshot_hash
    exactly, field-for-field. Any divergence silently breaks all new
    submissions — this is the single most important cross-contract
    consistency requirement in the protocol.

    `owner` is passed and hashed as its hex-string form (owner.as_hex),
    exactly like every other non-string field here is stringified before
    concatenation — never the Address object itself.

    This hash is stored in VerificationModule.snapshot_hash and returned
    by get_module(). VeritasCore.submit() callers pass it as an argument,
    and submit() recomputes it locally. Zero runtime cross-contract call.
    """
    canonical = (
        module_id                       + "|" +
        owner                           + "|" +
        str(version)                    + "|" +
        eval_prompt                     + "|" +
        criteria                        + "|" +
        str(score_tolerance)            + "|" +
        str(accept_threshold)           + "|" +
        str(score_threshold_borderline) + "|" +
        str(min_confidence)             + "|" +
        str(max_dispute_rounds)         + "|" +
        str(challenge_window_sec)       + "|" +
        str(require_inline_content)     + "|" +
        evaluation_method               + "|" +
        scoring_scale
    )
    return _sha256(canonical)


# ══════════════════════════════════════════════════════════════════════════════
# Protocol-level constants
# These are enforced at registration and cannot be overridden by module owners.
# ══════════════════════════════════════════════════════════════════════════════

MAX_MODULE_ID_LEN:   int = 64
MAX_PROMPT_LEN:      int = 4000
MAX_CRITERIA_LEN:    int = 1000
MAX_DESCRIPTION_LEN: int = 256

# ── Prompt injection defence delimiters ───────────────────────────────────────
DELIM_OUTPUT_OPEN:   str = "<<<VERITAS_OUTPUT_START>>>"
DELIM_OUTPUT_CLOSE:  str = "<<<VERITAS_OUTPUT_END>>>"
DELIM_CONTEXT_OPEN:  str = "<<<VERITAS_CONTEXT_START>>>"
DELIM_CONTEXT_CLOSE: str = "<<<VERITAS_CONTEXT_END>>>"

# ── Threshold range enforcement ───────────────────────────────────────────────
# score_tolerance's valid range is owned by VeritasGovernance
# (score_tolerance_min/score_tolerance_max) and read live at
# register_module()/update_module() time, never cached here. See
# _validate_thresholds()'s parameters.
ACCEPT_THRESHOLD_MIN: int = 0
ACCEPT_THRESHOLD_MAX: int = 100
# score_threshold_borderline's own valid range is a fixed protocol bound
# (like ACCEPT_THRESHOLD's), not governance-tunable — only the relationship
# score_threshold_borderline <= accept_threshold is enforced beyond this
# range (see _validate_thresholds()).
SCORE_THRESHOLD_BORDERLINE_MIN: int = 0
SCORE_THRESHOLD_BORDERLINE_MAX: int = 100
MIN_CONFIDENCE_MIN:   int = 0
MIN_CONFIDENCE_MAX:   int = 100

# ── Dispute policy range enforcement ─────────────────────────────────────────
PROTOCOL_MAX_DISPUTE_ROUNDS: int = 3
DISPUTE_ROUNDS_MIN:          int = 1
CHALLENGE_WINDOW_MIN_SEC:    int = 3600     # 1 hour
CHALLENGE_WINDOW_MAX_SEC:    int = 604800   # 7 days

# ── Controlled vocabularies ────────────────────────────────────────────────────
VALID_MODULE_TYPES: tuple = (
    "FACTUALITY_CHECK",
    "SUMMARY_VERIFICATION",
    "CODE_CORRECTNESS",
    "HALLUCINATION_DETECTION",
    "EQUIVALENCE_CHECK",
    "CUSTOM",
)

VALID_EVAL_METHODS: tuple = (
    "LLM_CONSENSUS",
    "LLM_NON_COMPARATIVE",
)

VALID_SCORING_SCALES: tuple = ("0-100",)


# ══════════════════════════════════════════════════════════════════════════════
# Storage dataclass
# @allow_storage @dataclass, with every field using an SDK type (str, bool,
# u8, u32, Address), as required for GenVM contract storage.
# ══════════════════════════════════════════════════════════════════════════════

@allow_storage
@dataclass
class VerificationModule:
    # ── Identity ──────────────────────────────────────────────────────────────
    module_id:          str
    owner:              Address

    # ── Structured metadata (immutable after registration) ────────────────────
    module_type:        str     # one of VALID_MODULE_TYPES
    scoring_scale:      str     # one of VALID_SCORING_SCALES — evaluation-affecting;
                                 # part of the canonical snapshot hash and frozen
                                 # into ModuleSnapshot.
    evaluation_method:  str     # one of VALID_EVAL_METHODS
    description:        str     # human-readable summary <= 256 chars. Registry-only
                                 # metadata: NOT evaluation-affecting, NOT part of
                                 # the canonical snapshot hash, NOT frozen into
                                 # ModuleSnapshot. Purely descriptive — changing it
                                 # would have zero effect on any task's
                                 # classification, dispute outcome, or economic
                                 # settlement.

    # ── Evaluation config (mutable via update_module; snapshotted into Tasks) ─
    eval_prompt:        str     # template with <<<VERITAS_*>>> boundaries
    criteria:           str     # natural-language equivalence/acceptance criteria

    # ── Integrity hashes ──────────────────────────────────────────────────────
    prompt_hash:        str     # SHA-256(eval_prompt) — derived; NOT itself part of
                                 # the canonical snapshot hash's field list and NOT
                                 # frozen into ModuleSnapshot (trivially recomputable
                                 # from eval_prompt, which IS frozen).
    criteria_hash:      str     # SHA-256(criteria) — derived, same treatment as
                                 # prompt_hash above.
    snapshot_hash:      str     # SHA-256 over all evaluation-affecting policy fields
                                 # (incl. owner, score_threshold_borderline,
                                 # scoring_scale). This IS frozen into ModuleSnapshot;
                                 # it is the field's own identity check, not a field
                                 # it needs to re-derive.

    # ── Scoring thresholds ────────────────────────────────────────────────────
    score_tolerance:    u8      # validator agreement band; range governance-owned
                                 # (VeritasGovernance.score_tolerance_min/max)
    accept_threshold:   u8      # min score for VALID classification [0, 100]
    score_threshold_borderline: u8  # min score for BORDERLINE classification
                                     # [0, 100], <= accept_threshold
    min_confidence:     u8      # min confidence to avoid UNCERTAIN [0, 100]

    # ── Dispute policy ─────────────────────────────────────────────────────────
    max_dispute_rounds:   u8    # [1, PROTOCOL_MAX_DISPUTE_ROUNDS=3]
    challenge_window_sec: u32   # non-submitter window [3600, 604800] seconds

    # ── Content policy ────────────────────────────────────────────────────────
    require_inline_content: bool  # True → submit() rejects http/https output_ref

    # ── Lifecycle ─────────────────────────────────────────────────────────────
    version:   u32              # 1-based; incremented by update_module()


# ══════════════════════════════════════════════════════════════════════════════
# Contract
# ══════════════════════════════════════════════════════════════════════════════

class ModuleRegistry(gl.Contract):
    # Primary registry: module_id → VerificationModule
    modules:      TreeMap[str, VerificationModule]
    module_count: u32

    # Secondary index: owner Address → (sequential u32 index → module_id)
    owner_index:  TreeMap[Address, TreeMap[u32, str]]
    owner_counts: TreeMap[Address, u32]

    # ── Governance wiring ───────────────────────────────────────────────────────
    # Same one-time wiring pattern VeritasCore uses — see its configure()
    # docstring for the full reasoning; not repeated here beyond what's
    # specific to this contract.
    deployer:                  Address
    governance_address:        Address
    is_governance_configured:  bool

    def __init__(self) -> None:
        self.module_count = u32(0)
        self.deployer = gl.message.sender_address
        self.is_governance_configured = False

    @gl.public.write
    def configure(self, governance_address: str) -> None:
        """
        One-time, deployer-only wiring to a deployed VeritasGovernance
        instance. Simpler than VeritasCore's configure() — this contract has
        no counters to seed, only an address to record for later live reads
        (the registration bond amount and treasury address, read fresh on
        every register_module() call, never cached).
        """
        self._require(not self.is_governance_configured, "ERR:ALREADY_CONFIGURED")
        self._require(gl.message.sender_address == self.deployer, "ERR:NOT_DEPLOYER")
        gov_addr = Address(governance_address)
        self._require(
            gov_addr != Address("0x0000000000000000000000000000000000000000"),
            "ERR:GOVERNANCE_ADDRESS_CANNOT_BE_ZERO",
        )
        self.governance_address       = gov_addr
        self.is_governance_configured = True
        gl.trace("REGISTRY_CONFIGURED|governance:" + gov_addr.as_hex)

    # ── Internal guards ───────────────────────────────────────────────────────

    def _require(self, condition: bool, msg: str) -> None:
        if not condition:
            raise gl.vm.UserError(msg)

    def _only_owner(self, module_id: str) -> None:
        """Caller must be the registered module owner."""
        self._require(module_id in self.modules, "ERR:MODULE_NOT_FOUND")
        self._require(
            self.modules[module_id].owner == gl.message.sender_address,
            "ERR:NOT_MODULE_OWNER",
        )

    # ── Internal: validation helpers ──────────────────────────────────────────

    def _validate_prompt_structure(self, eval_prompt: str) -> None:
        """Enforce prompt injection defence at registration and update time."""
        self._require(DELIM_OUTPUT_OPEN   in eval_prompt, "ERR:MISSING_OUTPUT_OPEN_DELIMITER")
        self._require(DELIM_OUTPUT_CLOSE  in eval_prompt, "ERR:MISSING_OUTPUT_CLOSE_DELIMITER")
        self._require(DELIM_CONTEXT_OPEN  in eval_prompt, "ERR:MISSING_CONTEXT_OPEN_DELIMITER")
        self._require(DELIM_CONTEXT_CLOSE in eval_prompt, "ERR:MISSING_CONTEXT_CLOSE_DELIMITER")

        self._require("{output}"  in eval_prompt, "ERR:MISSING_OUTPUT_SLOT")
        self._require("{context}" in eval_prompt, "ERR:MISSING_CONTEXT_SLOT")

        out_open  = eval_prompt.find(DELIM_OUTPUT_OPEN)
        out_slot  = eval_prompt.find("{output}")
        out_close = eval_prompt.find(DELIM_OUTPUT_CLOSE)
        self._require(out_open  < out_slot,  "ERR:OUTPUT_SLOT_BEFORE_OPEN_DELIMITER")
        self._require(out_slot  < out_close, "ERR:OUTPUT_SLOT_AFTER_CLOSE_DELIMITER")

        ctx_open  = eval_prompt.find(DELIM_CONTEXT_OPEN)
        ctx_slot  = eval_prompt.find("{context}")
        ctx_close = eval_prompt.find(DELIM_CONTEXT_CLOSE)
        self._require(ctx_open  < ctx_slot,  "ERR:CONTEXT_SLOT_BEFORE_OPEN_DELIMITER")
        self._require(ctx_slot  < ctx_close, "ERR:CONTEXT_SLOT_AFTER_CLOSE_DELIMITER")

    def _validate_thresholds(
        self,
        score_tolerance:            int,
        accept_threshold:           int,
        score_threshold_borderline: int,
        min_confidence:             int,
        max_dispute_rounds:         int,
        challenge_window_sec:       int,
        score_tolerance_min:        int,
        score_tolerance_max:        int,
    ) -> None:
        """
        Range-check all numeric policy fields. Called identically from
        register_module() and update_module().

        score_tolerance's valid range is read live from VeritasGovernance
        (score_tolerance_min/score_tolerance_max) rather than a fixed local
        constant, mirroring the existing pattern for bond amounts and the
        pause flag: governance parameters are read fresh at every use,
        never cached in this contract.

        score_threshold_borderline is range-checked against its own fixed
        protocol bound, and against accept_threshold — a BORDERLINE floor
        above the VALID boundary would make the BORDERLINE tier
        unreachable, which is not a state this protocol permits a module
        to register into.
        """
        self._require(
            score_tolerance_min <= score_tolerance <= score_tolerance_max,
            "ERR:SCORE_TOLERANCE_OUT_OF_RANGE",
        )
        self._require(
            ACCEPT_THRESHOLD_MIN <= accept_threshold <= ACCEPT_THRESHOLD_MAX,
            "ERR:ACCEPT_THRESHOLD_OUT_OF_RANGE",
        )
        self._require(
            SCORE_THRESHOLD_BORDERLINE_MIN <= score_threshold_borderline <= SCORE_THRESHOLD_BORDERLINE_MAX,
            "ERR:BORDERLINE_THRESHOLD_OUT_OF_RANGE",
        )
        self._require(
            score_threshold_borderline <= accept_threshold,
            "ERR:BORDERLINE_THRESHOLD_EXCEEDS_ACCEPT_THRESHOLD",
        )
        self._require(
            MIN_CONFIDENCE_MIN <= min_confidence <= MIN_CONFIDENCE_MAX,
            "ERR:MIN_CONFIDENCE_OUT_OF_RANGE",
        )
        self._require(
            DISPUTE_ROUNDS_MIN <= max_dispute_rounds <= PROTOCOL_MAX_DISPUTE_ROUNDS,
            "ERR:MAX_DISPUTE_ROUNDS_OUT_OF_RANGE",
        )
        self._require(
            CHALLENGE_WINDOW_MIN_SEC <= challenge_window_sec <= CHALLENGE_WINDOW_MAX_SEC,
            "ERR:CHALLENGE_WINDOW_OUT_OF_RANGE",
        )

    # ── Write: register_module ─────────────────────────────────────────────────

    @gl.public.write.payable
    def register_module(
        self,
        module_id:              str,
        module_type:            str,
        scoring_scale:          str,
        evaluation_method:      str,
        description:            str,
        eval_prompt:            str,
        criteria:               str,
        score_tolerance:        int,
        accept_threshold:       int,
        score_threshold_borderline: int,
        min_confidence:         int,
        max_dispute_rounds:     int,
        challenge_window_sec:   int,
        require_inline_content: bool,
    ) -> str:
        """
        Register a new verification module. Returns module_id on success.

        `score_threshold_borderline` is an independent, module-owner-set
        BORDERLINE classification floor (`<= accept_threshold`).
        `score_tolerance` is validated against VeritasGovernance's current
        live bounds, not a fixed local constant.

        Payable. Caller must attach exactly the current registration bond
        amount (read live from VeritasGovernance — never cached). The bond
        is always forfeited, immediately, 100% to treasury — no owner
        split, because the module owner and the bond payer are the same
        party here (a partial refund to yourself is not an economic
        signal).

        Requires is_governance_configured — cannot resolve bond amount or
        treasury address before configure() has run.

        Checks-effects-interactions: the module record and owner index are
        fully committed to storage BEFORE the outbound transfer to
        treasury is attempted, never after — this protocol's reentrancy
        defense, followed at every bond-transfer site without exception.

        The protocol-pause check is the first real validation performed
        (immediately after the unavoidable technical prerequisite of
        confirming governance is configured at all, since the pause flag
        itself can only be read via a cross-contract call to
        governance_address). This method and VeritasCore.submit() are the
        ONLY two methods in the entire protocol that check is_paused() —
        see the file header for why update_module() deliberately never does.
        """
        self._require(self.is_governance_configured, "ERR:GOVERNANCE_NOT_CONFIGURED")
        paused = gl.get_contract_at(self.governance_address).view().is_paused()
        self._require(not paused, "ERR:PROTOCOL_PAUSED")

        # Identity
        self._require(
            0 < len(module_id) <= MAX_MODULE_ID_LEN,
            "ERR:INVALID_MODULE_ID_LENGTH",
        )
        self._require(module_id not in self.modules, "ERR:MODULE_ID_TAKEN")

        # Vocabularies
        self._require(module_type       in VALID_MODULE_TYPES,  "ERR:INVALID_MODULE_TYPE")
        self._require(scoring_scale     in VALID_SCORING_SCALES,"ERR:INVALID_SCORING_SCALE")
        self._require(evaluation_method in VALID_EVAL_METHODS,  "ERR:INVALID_EVAL_METHOD")

        # Lengths
        self._require(
            0 < len(description) <= MAX_DESCRIPTION_LEN,
            "ERR:DESCRIPTION_INVALID_LENGTH",
        )
        self._require(
            0 < len(eval_prompt) <= MAX_PROMPT_LEN,
            "ERR:EVAL_PROMPT_INVALID_LENGTH",
        )
        self._require(
            0 < len(criteria) <= MAX_CRITERIA_LEN,
            "ERR:CRITERIA_INVALID_LENGTH",
        )

        # Prompt structure and injection defence
        self._validate_prompt_structure(eval_prompt)

        # Numeric ranges. score_tolerance's bounds are read live from
        # VeritasGovernance — never cached in this contract, matching
        # every other governance parameter.
        st_bounds = gl.get_contract_at(self.governance_address).view().get_score_tolerance_bounds()
        st_min = int(st_bounds["min"])
        st_max = int(st_bounds["max"])
        self._validate_thresholds(
            score_tolerance,
            accept_threshold,
            score_threshold_borderline,
            min_confidence,
            max_dispute_rounds,
            challenge_window_sec,
            st_min,
            st_max,
        )

        # Bond: exact-match required, per specification (no excess-value
        # refunding implemented anywhere in this protocol).
        bond_amount = gl.get_contract_at(self.governance_address).view().get_bond_amount("registration")
        self._require(int(gl.message.value) == int(bond_amount), "ERR:INCORRECT_BOND_AMOUNT")

        gl.trace(
            "BondCollected"
            + "|payer:" + gl.message.sender_address.as_hex
            + "|kind:REGISTRATION"
            + "|amount:" + str(int(gl.message.value))
        )

        owner = gl.message.sender_address

        p_hash = _sha256(eval_prompt)
        c_hash = _sha256(criteria)
        s_hash = _compute_snapshot_hash(
            module_id,
            owner.as_hex,
            1,
            eval_prompt,
            criteria,
            score_tolerance,
            accept_threshold,
            score_threshold_borderline,
            min_confidence,
            max_dispute_rounds,
            challenge_window_sec,
            require_inline_content,
            evaluation_method,
            scoring_scale,
        )

        # Store module
        mod = VerificationModule(
            module_id               = module_id,
            owner                   = owner,
            module_type             = module_type,
            scoring_scale           = scoring_scale,
            evaluation_method       = evaluation_method,
            description             = description,
            eval_prompt             = eval_prompt,
            criteria                = criteria,
            prompt_hash             = p_hash,
            criteria_hash           = c_hash,
            snapshot_hash           = s_hash,
            score_tolerance         = u8(score_tolerance),
            accept_threshold        = u8(accept_threshold),
            score_threshold_borderline = u8(score_threshold_borderline),
            min_confidence          = u8(min_confidence),
            max_dispute_rounds      = u8(max_dispute_rounds),
            challenge_window_sec    = u32(challenge_window_sec),
            require_inline_content  = require_inline_content,
            version                 = u32(1),
        )
        self.modules[module_id]  = mod
        self.module_count        = u32(int(self.module_count) + 1)

        # Update owner index
        owner_idx = self.owner_counts.get(owner, u32(0))
        self.owner_index.get_or_insert_default(owner)[owner_idx] = module_id
        self.owner_counts[owner] = u32(int(owner_idx) + 1)

        # ModuleRegistered event: module_id, owner, module_type, version,
        # full snapshot_hash.
        gl.trace(
            "ModuleRegistered"
            + "|" + module_id
            + "|owner:" + owner.as_hex
            + "|module_type:" + module_type
            + "|v1"
            + "|hash:" + s_hash
        )

        # Bond forfeiture — AFTER every state write above has committed
        # (checks-effects-interactions). Always 100% to treasury; see this
        # method's docstring for why no owner split applies here.
        treasury = gl.get_contract_at(self.governance_address).view().get_treasury_address()

        # Settlement record matches the exact field schema
        # VeritasCore._trace_settlement() emits — same on-the-wire shape,
        # inlined here rather than shared via a helper, since these are two
        # independent contracts in separate files with no code-sharing
        # mechanism between them. What matters for an off-chain indexer is
        # the event shape being identical across both contracts, not
        # whether the Python emitting it is literally the same function.
        # owner_bps=0 and disputant fields zeroed, since registration has
        # no owner split and no disputant concept at all — this settlement
        # is always 100% to treasury, always a forfeiture (registration
        # bonds are never refunded).
        gl.trace(
            "BondForfeited"
            + "|type:FORFEITURE"
            + "|bond_type:REGISTRATION"
            + "|id:" + module_id
            + "|total:" + str(int(gl.message.value))
            + "|owner:" + owner.as_hex
            + "|owner_amount:0"
            + "|treasury:" + treasury
            + "|treasury_amount:" + str(int(gl.message.value))
            + "|owner_bps:0"
            + "|treasury_bps:10000"
            + "|disputant:0x0000000000000000000000000000000000000000"
            + "|disputant_amount:0"
        )

        @gl.evm.contract_interface
        class _EOA:
            class View:
                pass
            class Write:
                pass

        _EOA(Address(treasury)).emit_transfer(value=gl.message.value)

        return module_id

    # ── Write: update_module ────────────────────────────────────────────────────

    @gl.public.write
    def update_module(
        self,
        module_id:              str,
        eval_prompt:            str,
        criteria:               str,
        score_tolerance:        int,
        accept_threshold:       int,
        score_threshold_borderline: int,
        min_confidence:         int,
        max_dispute_rounds:     int,
        challenge_window_sec:   int,
        require_inline_content: bool,
    ) -> None:
        """
        Update an existing module's evaluation-affecting fields. Owner-only.
        No bond is collected here — only initial registration is bonded.

        Effect on existing tasks:
          Tasks already submitted hold a frozen ModuleSnapshot with the OLD
          snapshot_hash. Those snapshots are unaffected by this call.
          New submissions will use the updated eval_prompt, new hashes, and
          new snapshot_hash from get_module().

        Version is incremented on every successful call. Hashes are
        recomputed from the new values. The snapshot-hash recomputation
        passes mod.owner.as_hex as the owner argument — owner itself is
        immutable via this method (ownership transfer is not a feature
        this protocol implements), so this is always the module's
        original, unchanged owner, read from storage, never from caller
        input. scoring_scale is likewise immutable structural metadata and
        is read from storage, never taken as a parameter here — same
        pattern used for mod.evaluation_method below.

        Threshold validation is identical to registration: score_tolerance
        is checked against VeritasGovernance's current live bounds (a
        module owner cannot widen or narrow their own score_tolerance past
        a bound governance has since changed with no check at all —
        existing tasks are unaffected either way, since their snapshots
        are already frozen); score_threshold_borderline is validated
        identically to registration, including the
        score_threshold_borderline <= accept_threshold cross-check.

        Ownership is established BEFORE the governance-configured check,
        not after: the reverse order would let an unauthorized, non-owner
        caller learn whether the registry's governance wiring was
        configured before being told they don't own the module — a narrow
        but real information-disclosure ordering issue. `_only_owner()`
        already implies `module_id in self.modules` (`ERR:MODULE_NOT_FOUND`
        otherwise), so this ordering also means an unauthorized caller
        learns "module not found" or "not owner" before any
        governance-state fact, regardless of governance configuration.
        """
        self._only_owner(module_id)
        self._require(self.is_governance_configured, "ERR:GOVERNANCE_NOT_CONFIGURED")
        mod = self.modules[module_id]

        # One-way require_inline_content enforcement.
        if mod.require_inline_content and not require_inline_content:
            raise gl.vm.UserError("ERR:CANNOT_DOWNGRADE_INLINE_CONTENT_POLICY")

        # Length validation
        self._require(
            0 < len(eval_prompt) <= MAX_PROMPT_LEN,
            "ERR:EVAL_PROMPT_INVALID_LENGTH",
        )
        self._require(
            0 < len(criteria) <= MAX_CRITERIA_LEN,
            "ERR:CRITERIA_INVALID_LENGTH",
        )

        # Prompt structure and injection defence
        self._validate_prompt_structure(eval_prompt)

        # Numeric ranges. score_tolerance's bounds are read live from
        # VeritasGovernance.
        st_bounds = gl.get_contract_at(self.governance_address).view().get_score_tolerance_bounds()
        st_min = int(st_bounds["min"])
        st_max = int(st_bounds["max"])
        self._validate_thresholds(
            score_tolerance,
            accept_threshold,
            score_threshold_borderline,
            min_confidence,
            max_dispute_rounds,
            challenge_window_sec,
            st_min,
            st_max,
        )

        # Capture current hash before overwriting (for trace log)
        old_snapshot_hash = mod.snapshot_hash

        # Compute new hashes for the incremented version
        new_version = int(mod.version) + 1
        p_hash = _sha256(eval_prompt)
        c_hash = _sha256(criteria)
        s_hash = _compute_snapshot_hash(
            module_id,
            mod.owner.as_hex,        # unchanged owner, read from storage
            new_version,
            eval_prompt,
            criteria,
            score_tolerance,
            accept_threshold,
            score_threshold_borderline,
            min_confidence,
            max_dispute_rounds,
            challenge_window_sec,
            require_inline_content,
            mod.evaluation_method,   # structural field — immutable, read from storage
            mod.scoring_scale,       # structural field — immutable, read from storage
        )

        # Apply mutations and persist
        mod.eval_prompt            = eval_prompt
        mod.criteria               = criteria
        mod.prompt_hash            = p_hash
        mod.criteria_hash          = c_hash
        mod.snapshot_hash          = s_hash
        mod.score_tolerance        = u8(score_tolerance)
        mod.accept_threshold       = u8(accept_threshold)
        mod.score_threshold_borderline = u8(score_threshold_borderline)
        mod.min_confidence         = u8(min_confidence)
        mod.max_dispute_rounds     = u8(max_dispute_rounds)
        mod.challenge_window_sec   = u32(challenge_window_sec)
        mod.require_inline_content = require_inline_content
        mod.version                = u32(new_version)
        self.modules[module_id]    = mod

        gl.trace(
            "ModuleUpdated"
            + "|" + module_id
            + "|v" + str(new_version - 1) + "->v" + str(new_version)
            + "|old_hash:" + old_snapshot_hash
            + "|new_hash:" + s_hash
        )

    # There is deliberately no module-deactivation method in this contract.
    # VeritasCore never calls ModuleRegistry at runtime, so a local "active"
    # flag here could never actually stop a new submit() against a module —
    # enforcement would be purely cosmetic. Module-level unreliability is
    # instead handled exclusively by protocol_flag_module(), which VeritasCore
    # does enforce (a purely local read of its own storage in submit()).

    # ── View methods ─────────────────────────────────────────────────────────

    @gl.public.view
    def get_module(self, module_id: str) -> dict:
        """
        Return full module record. Primary use: submitters read this
        off-chain to obtain all snapshot fields (including snapshot_hash
        and owner, needed for VeritasCore.submit()'s bonding parameters)
        before calling submit().
        """
        self._require(module_id in self.modules, "ERR:MODULE_NOT_FOUND")
        m = self.modules[module_id]
        return {
            "module_id":               m.module_id,
            "owner":                   m.owner.as_hex,
            "module_type":             m.module_type,
            "scoring_scale":           m.scoring_scale,
            "evaluation_method":       m.evaluation_method,
            "description":             m.description,
            "eval_prompt":             m.eval_prompt,
            "criteria":                m.criteria,
            "prompt_hash":             m.prompt_hash,
            "criteria_hash":           m.criteria_hash,
            "snapshot_hash":           m.snapshot_hash,
            "score_tolerance":         int(m.score_tolerance),
            "accept_threshold":        int(m.accept_threshold),
            "score_threshold_borderline": int(m.score_threshold_borderline),
            "min_confidence":          int(m.min_confidence),
            "max_dispute_rounds":      int(m.max_dispute_rounds),
            "challenge_window_sec":    int(m.challenge_window_sec),
            "require_inline_content":  m.require_inline_content,
            "version":                 int(m.version),
        }

    @gl.public.view
    def get_snapshot_hash(self, module_id: str) -> str:
        """Return only snapshot_hash for a given module."""
        self._require(module_id in self.modules, "ERR:MODULE_NOT_FOUND")
        return self.modules[module_id].snapshot_hash

    @gl.public.view
    def get_module_count(self) -> int:
        """Total registered modules."""
        return int(self.module_count)

    @gl.public.view
    def get_owner_module_ids(self, owner_hex: str, offset: int, limit: int) -> list:
        """Paginated list of module IDs registered by owner_hex."""
        owner = Address(owner_hex)
        total = int(self.owner_counts.get(owner, u32(0)))
        if offset >= total or limit <= 0:
            return []
        capped_limit = min(limit, 50)
        end = min(offset + capped_limit, total)
        result = []
        for i in range(offset, end):
            result.append(self.owner_index[owner][u32(i)])
        return result
