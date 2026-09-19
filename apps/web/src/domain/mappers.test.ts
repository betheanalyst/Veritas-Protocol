import { describe, expect, it } from "vitest";

import { mapGovernanceSummary, mapTask, toCount, toValue } from "./mappers";

function makeRawTask(): Record<string, unknown> {
  return {
    task_id: "VT-00000001-0xabc",
    submitter: "0xabc",
    status: "EVALUATED",
    module_id: "hallucination-detector-v1",
    module_type: "HALLUCINATION_DETECTION",
    scoring_scale: "0-100",
    module_version: 3n,
    snapshot_hash: "abc123",
    score_tolerance: 5n,
    accept_threshold: 90n,
    score_threshold_borderline: 80n,
    min_confidence: 60n,
    max_dispute_rounds: 2n,
    challenge_window_sec: 86400n,
    output_hash: "oh",
    context_hash: "ch",
    metadata: "m",
    score: 91n,
    confidence: 88n,
    classification: "VALID",
    reasoning: "ok",
    eval_round: 1n,
    created_ts: 1700000000n,
    last_eval_ts: 1700000100n,
    eval_history: [
      {
        round_num: 0n,
        score: 91n,
        confidence: 88n,
        classification: "VALID",
        eval_ts: 1700000100n,
        triggered_by: "0xdead",
      },
    ],
  };
}

describe("toCount", () => {
  it("narrows bigint counts to numbers", () => {
    expect(toCount(42n)).toBe(42);
    expect(toCount(0n)).toBe(0);
  });
  it("accepts plain numbers", () => {
    expect(toCount(7)).toBe(7);
  });
  it("rejects values beyond the safe integer range", () => {
    expect(() => toCount(2n ** 53n)).toThrowError(/safe integer/);
  });
  it("rejects non-integer inputs", () => {
    expect(() => toCount(1.5)).toThrowError(TypeError);
    expect(() => toCount("abc")).toThrowError(TypeError);
    expect(() => toCount(null)).toThrowError(TypeError);
  });
});

describe("toValue", () => {
  it("preserves bigint values exactly (no unsafe Number conversion)", () => {
    const huge = 10n ** 30n;
    expect(toValue(huge)).toBe(huge);
  });
  it("converts integer strings and safe integers to bigint", () => {
    expect(toValue(1000)).toBe(1000n);
    expect(toValue("123456789012345678901234567890")).toBe(123456789012345678901234567890n);
  });
  it("rejects fractional numbers", () => {
    expect(() => toValue(1.5)).toThrowError(TypeError);
  });
});

describe("mapTask", () => {
  it("maps a raw snake_case task into the domain model", () => {
    const task = mapTask(makeRawTask());
    expect(task.taskId).toBe("VT-00000001-0xabc");
    expect(task.status).toBe("EVALUATED");
    expect(task.moduleVersion).toBe(3);
    expect(task.score).toBe(91);
    expect(task.challengeWindowSec).toBe(86400);
    expect(task.evalHistory).toHaveLength(1);
    expect(task.evalHistory[0]?.triggeredBy).toBe("0xdead");
  });

  it("rejects an unknown classification instead of passing it through", () => {
    const raw = makeRawTask();
    raw.classification = "MAYBE";
    expect(() => mapTask(raw)).toThrowError(/classification/);
  });

  it("treats a missing eval history as empty (never fabricated)", () => {
    const raw = makeRawTask();
    delete raw.eval_history;
    expect(mapTask(raw).evalHistory).toEqual([]);
  });
});

describe("mapGovernanceSummary", () => {
  it("preserves wei-scale amounts as bigint and narrows counts", () => {
    const submissionBond = 5n * 10n ** 18n;
    const summary = mapGovernanceSummary({
      admin_count: 2n,
      bond_amount_registration: 10n ** 18n,
      bond_amount_submission: submissionBond,
      bond_amount_dispute: 2n ** 18n,
      treasury_address: "0xdeadbeef",
      revenue_split_bps: 5000n,
      paused: false,
      reputation_prior_weight: 10n,
      rate_limit_window_sec: 3600n,
      rate_limit_max: 10n,
      timelock_duration_sec: 86400n,
      score_tolerance_min: 1n,
      score_tolerance_max: 100n,
    });
    expect(summary.adminCount).toBe(2);
    expect(summary.bondAmountSubmission).toBe(submissionBond);
    expect(typeof summary.bondAmountSubmission).toBe("bigint");
    expect(summary.rateLimitWindowSec).toBe(3600n);
    expect(summary.scoreToleranceMax).toBe(100);
  });
});
