import { describe, expect, it } from "vitest";

import { describeError, extractErrorCode, getProtocolError, PROTOCOL_ERROR_COUNT } from "./errors";

describe("protocol error registry", () => {
  it("covers the full contract inventory", () => {
    expect(PROTOCOL_ERROR_COUNT).toBeGreaterThanOrEqual(95);
  });

  it("maps snapshot-hash mismatch to actionable recovery messaging", () => {
    const info = describeError(new Error("execution failed: ERR:SNAPSHOT_HASH_MISMATCH"));
    expect(info.code).toBe("ERR:SNAPSHOT_HASH_MISMATCH");
    expect(info.whatHappened).toMatch(/module was updated/i);
    expect(info.whatToDo).toMatch(/Reload/i);
  });

  it("extracts codes from nested error data and strings", () => {
    expect(extractErrorCode({ data: "ERR:TASK_NOT_FOUND" })).toBe("ERR:TASK_NOT_FOUND");
    expect(extractErrorCode({ nested: { deep: "prefix ERR:COOLDOWN_ACTIVE suffix" } })).toBe("ERR:COOLDOWN_ACTIVE");
    expect(extractErrorCode("no code here")).toBeNull();
    expect(extractErrorCode(null)).toBeNull();
  });

  it("falls back honestly for unmapped codes", () => {
    const info = describeError(new Error("ERR:SOMETHING_NEW"));
    expect(info.code).toBe("ERR:SOMETHING_NEW");
    expect(info.whatHappened).toBe("The request failed.");
    expect(info.why).toMatch(/not yet mapped/);
  });

  it("scopes the pause error honestly (only submit/register blocked)", () => {
    const info = getProtocolError("ERR:PROTOCOL_PAUSED");
    expect(info?.why).toMatch(/only blocks submit\(\) and register_module\(\)/);
  });
});
