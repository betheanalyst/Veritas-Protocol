import { describe, expect, it } from "vitest";

import { formatGEN, formatRelativeTime, shortenHex } from "./format";

describe("formatGEN (BigInt-safe)", () => {
  it("formats zero and whole amounts with grouping", () => {
    expect(formatGEN(0n)).toBe("0 GEN");
    expect(formatGEN(10n ** 18n)).toBe("1 GEN");
    expect(formatGEN(1234n * 10n ** 18n)).toBe("1,234 GEN");
  });
  it("formats fractional amounts without unsafe Number conversion", () => {
    expect(formatGEN(1234500000000000000n)).toBe("1.2345 GEN");
    expect(formatGEN(1500000000000000000n, { maxFractionDigits: 2 })).toBe("1.5 GEN");
  });
  it("truncates dust below the display precision (documented behavior)", () => {
    expect(formatGEN(1n)).toBe("0 GEN");
  });
  it("handles negative amounts", () => {
    expect(formatGEN(-(10n ** 18n))).toBe("-1 GEN");
  });
  it("never loses precision on huge values", () => {
    const huge = 12345678901234567890n * 10n ** 18n;
    expect(formatGEN(huge)).toContain("12,345,678,901,234,567,890 GEN");
  });
});

describe("shortenHex", () => {
  it("shortens long hex values and preserves short ones", () => {
    expect(shortenHex("0x6eDB217AB5cc661578D61622284e8914D77996Ee")).toBe("0x6eDB…96Ee");
    expect(shortenHex("0x1234")).toBe("0x1234");
  });
});

describe("formatRelativeTime", () => {
  it("formats past and future relative times", () => {
    const now = 1_700_000_000;
    expect(formatRelativeTime(now - 30, now)).toMatch(/30 seconds ago/);
    expect(formatRelativeTime(now + 3600, now)).toMatch(/in 1 hour/);
    expect(formatRelativeTime(now - 86_400 * 3, now)).toMatch(/3 days ago/);
  });
});
