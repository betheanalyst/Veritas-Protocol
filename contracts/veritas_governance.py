# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# ═══════════════════════════════════════════════════════════════════════════════
# Veritas Protocol V2 — VeritasGovernance
#
# Owns the admin set and every economic/operational parameter, including
# the permitted range for a module's own score_tolerance field
# (score_tolerance_min/max — the range is governance-owned; the per-module
# value within that range remains ModuleRegistry/VeritasCore's concern,
# never this contract's). Calls no other contract in this protocol, ever.
#
# ARCHITECTURAL BOUNDARY: this contract sets parameters. It never executes
# business logic. It has no method that writes to a task, module,
# evaluation, or dispute record — those concepts do not exist here. Where
# this contract's approval is required for an action on another contract
# (module flagging), this contract only ever RECORDS that an action was
# approved (flag_approvals); it never reaches into VeritasCore to perform
# the flagging itself. VeritasCore reads this contract's approval state via
# a view call and acts on its own storage locally — there is no synchronous
# cross-contract write primitive on this platform, so this is the only
# viable division of responsibility, not a stylistic choice.
#
# A single generic propose_action/approve_action/execute_action mechanism,
# dispatched by action_type, is used instead of a separate propose/approve/
# execute triple per parameter, since every governed parameter follows the
# identical propose/approve/timelock/execute pattern; a set of near-identical
# method triples would just be that same logic duplicated once per parameter.
#
# Pause is a separate, dedicated mechanism rather than a branch inside the
# generic one because pause executes upon its second approval, not after a
# subsequent 24-hour wait like every other governed parameter — a
# fundamentally different execution-timing semantic, not just a shorter
# timelock value. Keeping it as its own small pair of methods avoids making
# the generic mechanism's timing depend on which action type it's handling.
# ═══════════════════════════════════════════════════════════════════════════════

from dataclasses import dataclass
from datetime import datetime, timezone
from genlayer import *


# ══════════════════════════════════════════════════════════════════════════════
# Protocol-level constants
# ══════════════════════════════════════════════════════════════════════════════

MIN_VALID_TIMESTAMP: int = 1704067200  # 2024-01-01T00:00:00Z sanity floor — same
                                        # floor VeritasCore uses, for the same
                                        # reason (see VeritasCore._get_now()).

ADMIN_FLOOR:   int = 3  # enforced on every REMOVE_ADMIN execution
ADMIN_CEILING: int = 4  # enforced on every ADD_ADMIN execution

TIMELOCK_DURATION_SECONDS: int = 86400  # 24 hours. Fixed, not itself
    # governance-changeable, and deliberately not exposed as a
    # propose_action() target: allowing governance to change its own
    # timelock duration raises a self-referential question (does a "change
    # the timelock" proposal use the OLD or NEW duration?), avoided
    # entirely by fixing this value.
    #
    # The multisig (2-of-N distinct admins) is the primary security boundary
    # here; the timelock's role is transparency and stakeholder visibility
    # during the delay, not cryptographic protection. 24 hours balances
    # governance responsiveness against public-review time while remaining
    # conservative enough to preserve the delay's actual purpose.

EMERGENCY_PAUSE_WINDOW_SECONDS: int = 3600  # 1 hour. A short, separately
    # configured emergency-approval window, distinct from the 24-hour
    # timelock, so an emergency pause can take effect immediately on its
    # second approval rather than waiting out the standard delay.

VALID_ACTION_TYPES = frozenset({
    "ADD_ADMIN",
    "REMOVE_ADMIN",
    "SET_BOND_AMOUNT",                # target in {registration,submission,dispute}, value=amount
    "SET_TREASURY",                   # target=address hex, value unused
    "SET_SPLIT_BPS",                  # value=bps (0-10000), target unused
    "SET_REPUTATION_PRIOR_WEIGHT",    # value=weight (>0), target unused
    "SET_REPUTATION_SEED",            # target in {disputes,unchanged}, value=seed
    "SET_RATE_LIMIT_WINDOW",          # value=seconds, target unused
    "SET_RATE_LIMIT_MAX",             # value=count, target unused
    "FLAG_MODULE",                    # target=module_id, value unused
    "SET_SCORE_TOLERANCE_BOUNDS",     # target in {min,max}, value=new bound
})

VALID_BOND_KINDS       = frozenset({"registration", "submission", "dispute"})
VALID_REPUTATION_SEEDS = frozenset({"disputes", "unchanged"})


# ══════════════════════════════════════════════════════════════════════════════
# Storage dataclasses
# ══════════════════════════════════════════════════════════════════════════════

@allow_storage
@dataclass
class PendingAction:
    """
    One record per proposed parameter/admin-set change. Generic payload
    encoding (target: str, value: u256) rather than a typed field per
    action_type — GenVM's storage model has no easy union/variant type, and
    this project's established convention (see VeritasCore) is to accept a
    loosely-typed but validated payload over a combinatorial explosion of
    near-identical dataclasses.
    """
    action_type:        str
    target:              str
    value:                u256
    proposer:             Address
    proposed_ts:          u64
    second_approver:      Address
    second_approval_ts:   u64   # 0 until approved — the timelock clock starts here
    executed:              bool


@allow_storage
@dataclass
class PendingPauseAction:
    """
    Separate, lighter-weight structure for pause/unpause proposals — see
    file header for why this is not folded into PendingAction. Executes
    immediately upon its second approval; the only "window" here is an
    expiry on how long a first proposal remains approvable at all.
    """
    proposer:         Address
    target_paused:     bool
    proposed_ts:       u64
    approver:          Address
    executed:           bool


# ══════════════════════════════════════════════════════════════════════════════
# Contract
# ══════════════════════════════════════════════════════════════════════════════

class VeritasGovernance(gl.Contract):
    """
    Owns the admin set and every economic/operational parameter. Never
    owns, reads, or writes any module/task/evaluation/dispute/reputation
    data — see the file header's Architectural Boundary note. Calls no
    other contract, ever.
    """

    # ── Admin set ──────────────────────────────────────────────────────────────
    admins:      TreeMap[str, bool]   # address_hex -> is_admin
    admin_count: u32

    # ── Generic parameter-change action queue ─────────────────────────────────
    action_counter:  u256
    pending_actions: TreeMap[str, PendingAction]

    # ── Pause-specific action queue (separate mechanism, see file header) ─────
    pause_action_counter:  u256
    pending_pause_actions: TreeMap[str, PendingPauseAction]

    # ── Governed parameters ────────────────────────────────────────────────────
    bond_amount_registration: u256
    bond_amount_submission:    u256
    bond_amount_dispute:        u256
    treasury_address:            Address
    revenue_split_bps:            u32
    paused:                        bool
    reputation_prior_weight:        u256
    reputation_seed_disputes:        u256
    reputation_seed_unchanged:        u256
    rate_limit_window_sec:             u256
    rate_limit_max:                     u32

    # ── Module-flag approvals (consumed by VeritasCore.protocol_flag_module) ──
    flag_approvals: TreeMap[str, bool]

    # ── score_tolerance bounds ──────────────────────────────────────────────
    # Governance owns only the permitted RANGE for a module's own score_tolerance
    # field, not any individual module's chosen value within it (which remains
    # module-owned, frozen into each task's snapshot, and used unmodified as the
    # materiality threshold everywhere the shared classification-change
    # comparator is used). Read live by ModuleRegistry at both register_module()
    # and update_module() time — never cached there, matching every other
    # governance parameter in this protocol.
    score_tolerance_min: u32
    score_tolerance_max: u32

    def __init__(
        self,
        initial_bond_registration:          int,
        initial_bond_submission:            int,
        initial_bond_dispute:                int,
        initial_treasury:                     str,
        initial_split_bps:                     int,
        initial_reputation_prior_weight:        int,
        initial_reputation_seed_disputes:        int,
        initial_reputation_seed_unchanged:        int,
        initial_rate_limit_window_sec:             int,
        initial_rate_limit_max:                     int,
        initial_score_tolerance_min:                 int,
        initial_score_tolerance_max:                  int,
    ) -> None:
        """
        Ten constructor parameters is a lot, and deliberately so: unlike
        VeritasCore (whose behavior mostly comes from runtime calls, not
        construction-time configuration), this contract's entire purpose is
        to BE a parameter store — every one of these is a real, meaningful
        initial value a deployer must choose, not scaffolding. There is no
        governance mechanism to set these before this contract itself
        exists, so they must arrive as constructor arguments.

        The deploying address becomes the sole initial admin (admin_count
        = 1), matching this codebase's established deployer convention.
        bootstrap_add_second_admin() is the only way to reach admin_count
        = 2; from there, every further admin-set or parameter change goes
        through the standard propose/approve/(timelock)/execute path.
        """
        self._require(initial_split_bps <= 10000, "ERR:SPLIT_BPS_EXCEEDS_100_PERCENT")
        self._require(initial_reputation_seed_disputes > 0, "ERR:REPUTATION_SEED_MUST_BE_NONZERO")
        self._require(
            initial_reputation_seed_unchanged <= initial_reputation_seed_disputes,
            "ERR:REPUTATION_SEED_UNCHANGED_EXCEEDS_TOTAL",
        )
        self._require(initial_reputation_prior_weight > 0, "ERR:REPUTATION_PRIOR_WEIGHT_MUST_BE_NONZERO")
        self._require(initial_score_tolerance_min >= 1, "ERR:SCORE_TOLERANCE_MIN_MUST_BE_AT_LEAST_ONE")
        self._require(initial_score_tolerance_max <= 100, "ERR:SCORE_TOLERANCE_MAX_TOO_LARGE")
        self._require(
            initial_score_tolerance_min <= initial_score_tolerance_max,
            "ERR:SCORE_TOLERANCE_MIN_EXCEEDS_MAX",
        )
        treasury = Address(initial_treasury)
        self._require(
            treasury != Address("0x0000000000000000000000000000000000000000"),
            "ERR:TREASURY_CANNOT_BE_ZERO_ADDRESS",
        )

        deployer_hex = gl.message.sender_address.as_hex
        self.admins[deployer_hex] = True
        self.admin_count = u32(1)

        self.action_counter       = u256(0)
        self.pause_action_counter = u256(0)

        self.bond_amount_registration   = u256(initial_bond_registration)
        self.bond_amount_submission     = u256(initial_bond_submission)
        self.bond_amount_dispute        = u256(initial_bond_dispute)
        self.treasury_address           = treasury
        self.revenue_split_bps          = u32(initial_split_bps)
        self.paused                     = False
        self.reputation_prior_weight    = u256(initial_reputation_prior_weight)
        self.reputation_seed_disputes   = u256(initial_reputation_seed_disputes)
        self.reputation_seed_unchanged  = u256(initial_reputation_seed_unchanged)
        self.rate_limit_window_sec      = u256(initial_rate_limit_window_sec)
        self.rate_limit_max             = u32(initial_rate_limit_max)
        self.score_tolerance_min        = u32(initial_score_tolerance_min)
        self.score_tolerance_max        = u32(initial_score_tolerance_max)

    # ── Internal guards ────────────────────────────────────────────────────────

    def _require(self, condition: bool, msg: str) -> None:
        if not condition:
            raise gl.vm.UserError(msg)

    def _get_now(self) -> u64:
        """Identical pattern to VeritasCore._get_now() — see its docstring."""
        try:
            raw: str = gl.message_raw["datetime"]
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            ts = int(dt.timestamp())
            if ts < MIN_VALID_TIMESTAMP:
                raise gl.vm.UserError("ERR:TIMESTAMP_BELOW_FLOOR")
            return u64(ts)
        except gl.vm.UserError:
            raise
        except Exception:
            raise gl.vm.UserError("ERR:TIMESTAMP_UNAVAILABLE")

    def _require_admin(self) -> None:
        self._require(
            self.admins.get(gl.message.sender_address.as_hex, False),
            "ERR:NOT_ADMIN",
        )

    def _make_action_id(self) -> str:
        aid = f"ACT-{int(self.action_counter):08d}"
        self.action_counter = u256(int(self.action_counter) + 1)
        return aid

    def _make_pause_action_id(self) -> str:
        aid = f"PAUSE-{int(self.pause_action_counter):08d}"
        self.pause_action_counter = u256(int(self.pause_action_counter) + 1)
        return aid

    def _validate_action_payload(self, action_type: str, target: str, value: int) -> None:
        """
        Fail-fast validation at propose time, per this codebase's
        established convention (ModuleRegistry validates immediately at
        registration, not deferred). execute_action() also re-validates
        floor/ceiling live for admin actions (see _apply_action) since
        that specific bound can change between proposal and execution due
        to a different, concurrently-executing action — everything else
        here cannot drift between propose and execute, so is not
        re-checked at execution time.
        """
        if action_type in ("ADD_ADMIN", "REMOVE_ADMIN"):
            self._require(len(target) > 0, "ERR:TARGET_ADDRESS_REQUIRED")
        elif action_type == "SET_BOND_AMOUNT":
            self._require(target in VALID_BOND_KINDS, "ERR:INVALID_BOND_KIND")
            self._require(value >= 0, "ERR:VALUE_MUST_BE_NON_NEGATIVE")
        elif action_type == "SET_TREASURY":
            addr = Address(target)
            self._require(
                addr != Address("0x0000000000000000000000000000000000000000"),
                "ERR:TREASURY_CANNOT_BE_ZERO_ADDRESS",
            )
        elif action_type == "SET_SPLIT_BPS":
            self._require(0 <= value <= 10000, "ERR:SPLIT_BPS_OUT_OF_RANGE")
        elif action_type == "SET_REPUTATION_PRIOR_WEIGHT":
            self._require(value > 0, "ERR:REPUTATION_PRIOR_WEIGHT_MUST_BE_NONZERO")
        elif action_type == "SET_REPUTATION_SEED":
            self._require(target in VALID_REPUTATION_SEEDS, "ERR:INVALID_REPUTATION_SEED_KIND")
            self._require(value >= 0, "ERR:VALUE_MUST_BE_NON_NEGATIVE")
        elif action_type == "SET_RATE_LIMIT_WINDOW":
            self._require(value > 0, "ERR:RATE_LIMIT_WINDOW_MUST_BE_NONZERO")
        elif action_type == "SET_RATE_LIMIT_MAX":
            self._require(value > 0, "ERR:RATE_LIMIT_MAX_MUST_BE_NONZERO")
        elif action_type == "FLAG_MODULE":
            self._require(len(target) > 0, "ERR:MODULE_ID_REQUIRED")
        elif action_type == "SET_SCORE_TOLERANCE_BOUNDS":
            self._require(target in ("min", "max"), "ERR:INVALID_SCORE_TOLERANCE_BOUND_KIND")
            self._require(1 <= value <= 100, "ERR:SCORE_TOLERANCE_BOUND_OUT_OF_RANGE")

    def _apply_action(self, action: "PendingAction") -> None:
        """
        Dispatch by action_type. Called only from execute_action(), only
        after approval + timelock checks have already passed. The
        floor/ceiling bound for ADD_ADMIN/REMOVE_ADMIN is checked HERE,
        against the LIVE admin_count — not only at propose time — to guard
        against two concurrently-pending actions that were each
        individually valid when proposed but would jointly violate the
        bound if both execute.
        """
        t = action.action_type
        if t == "ADD_ADMIN":
            new_count = int(self.admin_count) + 1
            self._require(new_count <= ADMIN_CEILING, "ERR:ADMIN_CEILING_EXCEEDED")
            new_hex = Address(action.target).as_hex
            self._require(not self.admins.get(new_hex, False), "ERR:ALREADY_ADMIN")
            self.admins[new_hex] = True
            self.admin_count = u32(new_count)
        elif t == "REMOVE_ADMIN":
            new_count = int(self.admin_count) - 1
            self._require(new_count >= ADMIN_FLOOR, "ERR:ADMIN_FLOOR_VIOLATED")
            rm_hex = Address(action.target).as_hex
            self._require(self.admins.get(rm_hex, False), "ERR:NOT_CURRENTLY_ADMIN")
            self.admins[rm_hex] = False
            self.admin_count = u32(new_count)
        elif t == "SET_BOND_AMOUNT":
            if action.target == "registration":
                self.bond_amount_registration = action.value
            elif action.target == "submission":
                self.bond_amount_submission = action.value
            else:
                self.bond_amount_dispute = action.value
        elif t == "SET_TREASURY":
            self.treasury_address = Address(action.target)
        elif t == "SET_SPLIT_BPS":
            self.revenue_split_bps = u32(int(action.value))
        elif t == "SET_REPUTATION_PRIOR_WEIGHT":
            self.reputation_prior_weight = action.value
        elif t == "SET_REPUTATION_SEED":
            # Cross-field consistency (seed_unchanged <= seed_disputes) cannot
            # be validated at propose time alone, since the two seed values
            # are proposed as independent actions and either could execute
            # first. Checked here, against the FINAL post-update state,
            # reverting the whole execute_action() call if violated —
            # matching the Economic/State-consistency discipline established
            # elsewhere in this codebase (never let a write commit into a
            # state whose invariant doesn't hold).
            if action.target == "disputes":
                self.reputation_seed_disputes = action.value
            else:
                self.reputation_seed_unchanged = action.value
            self._require(
                int(self.reputation_seed_unchanged) <= int(self.reputation_seed_disputes),
                "ERR:REPUTATION_SEED_UNCHANGED_EXCEEDS_TOTAL",
            )
        elif t == "SET_RATE_LIMIT_WINDOW":
            self.rate_limit_window_sec = action.value
        elif t == "SET_RATE_LIMIT_MAX":
            self.rate_limit_max = u32(int(action.value))
        elif t == "FLAG_MODULE":
            self.flag_approvals[action.target] = True
        elif t == "SET_SCORE_TOLERANCE_BOUNDS":
            # Cross-field consistency (min <= max) cannot be validated at
            # propose time alone, since the two bounds are proposed as
            # independent actions and either could execute first — same
            # pattern as SET_REPUTATION_SEED above. Checked here, against
            # the FINAL post-update state, reverting the whole
            # execute_action() call if violated.
            if action.target == "min":
                self.score_tolerance_min = u32(int(action.value))
            else:
                self.score_tolerance_max = u32(int(action.value))
            self._require(
                int(self.score_tolerance_min) <= int(self.score_tolerance_max),
                "ERR:SCORE_TOLERANCE_MIN_EXCEEDS_MAX",
            )
        else:
            # Unreachable given propose_action()'s VALID_ACTION_TYPES gate —
            # defensive, not a real code path.
            raise gl.vm.UserError("ERR:UNKNOWN_ACTION_TYPE")

    # ── Write: admin bootstrap ──────────────────────────────────────────────────

    @gl.public.write
    def bootstrap_add_second_admin(self, new_admin_hex: str) -> None:
        """
        The ONE unilateral admin-add exception. Only callable while
        admin_count == 1, by the sole existing admin. No multisig, no
        timelock.

        Guaranteed single-use by construction, not by a separate flag:
        REMOVE_ADMIN's floor of 3 (enforced in _apply_action) makes it
        structurally impossible for admin_count to ever legitimately fall
        back to 1 after this point, so this method's own guard
        (admin_count == 1) can never be satisfied a second time.
        """
        self._require(int(self.admin_count) == 1, "ERR:BOOTSTRAP_ONLY_AT_ONE_ADMIN")
        self._require_admin()
        new_hex = Address(new_admin_hex).as_hex
        self._require(not self.admins.get(new_hex, False), "ERR:ALREADY_ADMIN")
        self.admins[new_hex] = True
        self.admin_count = u32(2)
        gl.trace("ADMIN_BOOTSTRAPPED|" + new_hex)

    # ── Write: generic parameter/admin-set action mechanism ────────────────────

    @gl.public.write
    def propose_action(self, action_type: str, target: str, value: int) -> str:
        """Admin-only. Returns the new action_id."""
        self._require_admin()
        self._require(action_type in VALID_ACTION_TYPES, "ERR:INVALID_ACTION_TYPE")
        self._validate_action_payload(action_type, target, value)
        now = self._get_now()
        action_id = self._make_action_id()
        self.pending_actions[action_id] = PendingAction(
            action_type         = action_type,
            target              = target,
            value               = u256(max(0, value)),
            proposer            = gl.message.sender_address,
            proposed_ts         = now,
            second_approver     = Address("0x0000000000000000000000000000000000000000"),
            second_approval_ts  = u64(0),
            executed            = False,
        )
        gl.trace("ACTION_PROPOSED|" + action_id + "|" + action_type)
        return action_id

    @gl.public.write
    def approve_action(self, action_id: str) -> None:
        """
        Admin-only, must be a distinct admin from the proposer (2-of-N).
        Starts the 24-hour timelock clock — does not execute the action.
        """
        self._require_admin()
        self._require(action_id in self.pending_actions, "ERR:ACTION_NOT_FOUND")
        action = self.pending_actions[action_id]
        self._require(not action.executed, "ERR:ACTION_ALREADY_EXECUTED")
        self._require(int(action.second_approval_ts) == 0, "ERR:ACTION_ALREADY_APPROVED")
        self._require(
            gl.message.sender_address != action.proposer,
            "ERR:APPROVER_MUST_DIFFER_FROM_PROPOSER",
        )
        now = self._get_now()
        action.second_approver    = gl.message.sender_address
        action.second_approval_ts = now
        self.pending_actions[action_id] = action
        gl.trace("ACTION_APPROVED|" + action_id)

    @gl.public.write
    def execute_action(self, action_id: str) -> None:
        """
        Permissionless — callable by anyone, once approved and the
        24-hour timelock has elapsed since the second approval.
        """
        self._require(action_id in self.pending_actions, "ERR:ACTION_NOT_FOUND")
        action = self.pending_actions[action_id]
        self._require(not action.executed, "ERR:ACTION_ALREADY_EXECUTED")
        self._require(int(action.second_approval_ts) > 0, "ERR:ACTION_NOT_APPROVED")
        now = self._get_now()
        elapsed = int(now) - int(action.second_approval_ts)
        self._require(elapsed >= TIMELOCK_DURATION_SECONDS, "ERR:TIMELOCK_NOT_ELAPSED")

        self._apply_action(action)

        action.executed = True
        self.pending_actions[action_id] = action
        gl.trace("ACTION_EXECUTED|" + action_id + "|" + action.action_type)

    # ── Write: pause mechanism (separate, lighter-weight — see file header) ───

    @gl.public.write
    def propose_pause_toggle(self, target_paused_state: bool) -> str:
        """Admin-only. Returns the new pause action_id."""
        self._require_admin()
        now = self._get_now()
        action_id = self._make_pause_action_id()
        self.pending_pause_actions[action_id] = PendingPauseAction(
            proposer      = gl.message.sender_address,
            target_paused = target_paused_state,
            proposed_ts   = now,
            approver      = Address("0x0000000000000000000000000000000000000000"),
            executed      = False,
        )
        gl.trace("PAUSE_PROPOSED|" + action_id + "|target:" + str(target_paused_state))
        return action_id

    @gl.public.write
    def approve_pause_toggle(self, action_id: str) -> None:
        """
        Admin-only, must be a distinct admin from the proposer. Unlike
        approve_action(), this EXECUTES IMMEDIATELY upon this call — no
        separate execute step, no 24-hour wait. The only time constraint is
        that this approval must arrive within EMERGENCY_PAUSE_WINDOW_SECONDS
        of the original proposal, or the proposal must be re-made.
        """
        self._require_admin()
        self._require(action_id in self.pending_pause_actions, "ERR:PAUSE_ACTION_NOT_FOUND")
        action = self.pending_pause_actions[action_id]
        self._require(not action.executed, "ERR:PAUSE_ACTION_ALREADY_EXECUTED")
        self._require(
            gl.message.sender_address != action.proposer,
            "ERR:APPROVER_MUST_DIFFER_FROM_PROPOSER",
        )
        now = self._get_now()
        elapsed = int(now) - int(action.proposed_ts)
        self._require(elapsed <= EMERGENCY_PAUSE_WINDOW_SECONDS, "ERR:PAUSE_APPROVAL_WINDOW_EXPIRED")

        self.paused = action.target_paused
        action.approver = gl.message.sender_address
        action.executed = True
        self.pending_pause_actions[action_id] = action
        gl.trace("PAUSE_TOGGLED|" + action_id + "|paused:" + str(self.paused))

    # ── View methods ─────────────────────────────────────────────────────────

    @gl.public.view
    def is_admin(self, address_hex: str) -> bool:
        return self.admins.get(Address(address_hex).as_hex, False)

    @gl.public.view
    def get_admin_count(self) -> int:
        return int(self.admin_count)

    @gl.public.view
    def get_bond_amount(self, kind: str) -> int:
        if kind == "registration":
            return int(self.bond_amount_registration)
        if kind == "submission":
            return int(self.bond_amount_submission)
        if kind == "dispute":
            return int(self.bond_amount_dispute)
        raise gl.vm.UserError("ERR:INVALID_BOND_KIND")

    @gl.public.view
    def get_treasury_address(self) -> str:
        return self.treasury_address.as_hex

    @gl.public.view
    def get_revenue_split_bps(self) -> int:
        return int(self.revenue_split_bps)

    @gl.public.view
    def is_paused(self) -> bool:
        return self.paused

    @gl.public.view
    def get_reputation_prior_weight(self) -> int:
        """
        Called LIVE by VeritasCore.get_module_reputation() on every
        invocation — never cached by the caller.
        """
        return int(self.reputation_prior_weight)

    @gl.public.view
    def get_reputation_seed(self) -> dict:
        """
        Called by VeritasCore exactly ONCE, at its own configure() time, to
        seed its local, evolving protocol_total_disputes/
        protocol_total_unchanged counters — not read live thereafter. See
        VeritasCore.configure() for the one-time consumption of this value.
        """
        return {
            "seed_disputes":  int(self.reputation_seed_disputes),
            "seed_unchanged": int(self.reputation_seed_unchanged),
        }

    @gl.public.view
    def get_score_tolerance_bounds(self) -> dict:
        """
        Called LIVE by ModuleRegistry on every register_module() and
        update_module() call — never cached there, matching every other
        governance parameter this contract exposes.
        """
        return {
            "min": int(self.score_tolerance_min),
            "max": int(self.score_tolerance_max),
        }

    @gl.public.view
    def get_rate_limit_params(self) -> dict:
        return {
            "window_sec": int(self.rate_limit_window_sec),
            "max":        int(self.rate_limit_max),
        }

    @gl.public.view
    def is_flag_approved(self, module_id: str) -> bool:
        """
        Called by VeritasCore.protocol_flag_module() to verify a FLAG_MODULE
        action for this module_id has been proposed, approved, timelocked,
        and executed on this contract, before VeritasCore applies the flag
        to its own local storage. This contract never reaches into
        VeritasCore to perform the flagging itself — see the file header's
        Architectural Boundary note.
        """
        return self.flag_approvals.get(module_id, False)

    @gl.public.view
    def get_pending_action(self, action_id: str) -> dict:
        self._require(action_id in self.pending_actions, "ERR:ACTION_NOT_FOUND")
        a = self.pending_actions[action_id]
        return {
            "action_id":           action_id,
            "action_type":         a.action_type,
            "target":              a.target,
            "value":               int(a.value),
            "proposer":            a.proposer.as_hex,
            "proposed_ts":         int(a.proposed_ts),
            "second_approver":     a.second_approver.as_hex,
            "second_approval_ts":  int(a.second_approval_ts),
            "executed":            a.executed,
        }

    @gl.public.view
    def get_pending_pause_action(self, action_id: str) -> dict:
        self._require(action_id in self.pending_pause_actions, "ERR:PAUSE_ACTION_NOT_FOUND")
        a = self.pending_pause_actions[action_id]
        return {
            "action_id":     action_id,
            "proposer":      a.proposer.as_hex,
            "target_paused": a.target_paused,
            "proposed_ts":   int(a.proposed_ts),
            "approver":      a.approver.as_hex,
            "executed":      a.executed,
        }

    @gl.public.view
    def get_timelock_duration(self) -> int:
        return TIMELOCK_DURATION_SECONDS

    @gl.public.view
    def get_governance_summary(self) -> dict:
        """Convenience aggregate view for dashboards/consumers."""
        return {
            "admin_count":                int(self.admin_count),
            "bond_amount_registration":   int(self.bond_amount_registration),
            "bond_amount_submission":     int(self.bond_amount_submission),
            "bond_amount_dispute":        int(self.bond_amount_dispute),
            "treasury_address":           self.treasury_address.as_hex,
            "revenue_split_bps":          int(self.revenue_split_bps),
            "paused":                     self.paused,
            "reputation_prior_weight":    int(self.reputation_prior_weight),
            "rate_limit_window_sec":      int(self.rate_limit_window_sec),
            "rate_limit_max":             int(self.rate_limit_max),
            "timelock_duration_sec":      TIMELOCK_DURATION_SECONDS,
            "score_tolerance_min":        int(self.score_tolerance_min),
            "score_tolerance_max":        int(self.score_tolerance_max),
        }
