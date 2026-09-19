import { describe, expect, it } from "vitest";

import {
  PROMPT_TEMPLATE,
  validateModuleFields,
  validatePromptStructure,
  type ModulePolicyFields,
} from "./module-validation";

function validFields(): { -readonly [K in keyof ModulePolicyFields]: ModulePolicyFields[K] } {
  return {
    moduleId: "test-module-v1",
    description: "A test module.",
    moduleType: "FACTUALITY_CHECK",
    evaluationMethod: "LLM_CONSENSUS",
    scoringScale: "0-100",
    evalPrompt: PROMPT_TEMPLATE,
    criteria: "Check claims against the context.",
    scoreTolerance: 10,
    acceptThreshold: 85,
    scoreThresholdBorderline: 70,
    minConfidence: 55,
    maxDisputeRounds: 2,
    challengeWindowSec: 86400,
  };
}

const BOUNDS = { min: 1, max: 15 };

describe("validatePromptStructure", () => {
  it("accepts the conforming template", () => {
    expect(validatePromptStructure(PROMPT_TEMPLATE)).toBeNull();
  });
  it("rejects a missing delimiter", () => {
    expect(validatePromptStructure(PROMPT_TEMPLATE.replace("<<<VERITAS_OUTPUT_END>>>", ""))).toMatch(/output-close/);
  });
  it("rejects a slot outside its delimiters", () => {
    const broken = PROMPT_TEMPLATE.replace("<<<VERITAS_OUTPUT_START>>>\n{output}", "{output}\n<<<VERITAS_OUTPUT_START>>>");
    expect(validatePromptStructure(broken)).toMatch(/strictly inside/);
  });
  it("rejects a missing {context} slot", () => {
    expect(validatePromptStructure(PROMPT_TEMPLATE.replace("{context}", ""))).toMatch(/\{context\} slot/);
  });
});

describe("validateModuleFields", () => {
  it("accepts a fully valid module", () => {
    expect(validateModuleFields(validFields(), BOUNDS)).toEqual({});
  });
  it("rejects tolerance outside the LIVE governance bounds", () => {
    const fields = validFields();
    fields.scoreTolerance = 20; // above max bound 15
    expect(validateModuleFields(fields, BOUNDS).scoreTolerance).toMatch(/live governance bounds/);
  });
  it("rejects borderline above accept (ordering rule)", () => {
    const fields = validFields();
    fields.scoreThresholdBorderline = 90;
    fields.acceptThreshold = 85;
    expect(validateModuleFields(fields, BOUNDS).scoreThresholdBorderline).toMatch(/cannot exceed/);
  });
  it("rejects dispute rounds outside 1-3", () => {
    const fields = validFields();
    fields.maxDisputeRounds = 0;
    expect(validateModuleFields(fields, BOUNDS).maxDisputeRounds).toMatch(/1\u20133/);
  });
  it("rejects a challenge window outside 1h-7d", () => {
    const fields = validFields();
    fields.challengeWindowSec = 600;
    expect(validateModuleFields(fields, BOUNDS).challengeWindowSec).toMatch(/1 hour and 7 days/);
  });
  it("rejects an unsupported vocabulary value", () => {
    const fields = validFields();
    fields.moduleType = "NOT_REAL";
    expect(validateModuleFields(fields, BOUNDS).moduleType).toMatch(/supported module type/);
  });
  it("requires live bounds before validating tolerance", () => {
    expect(validateModuleFields(validFields(), null).scoreTolerance).toMatch(/could not be read/);
  });
});
