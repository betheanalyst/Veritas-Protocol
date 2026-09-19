import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ConfigurationError, loadEnv } from "./env";

const REQUIRED_VARS = [
  "NEXT_PUBLIC_GENLAYER_NETWORK",
  "NEXT_PUBLIC_VERITAS_CORE_ADDRESS",
  "NEXT_PUBLIC_VERITAS_REGISTRY_ADDRESS",
  "NEXT_PUBLIC_VERITAS_GOVERNANCE_ADDRESS",
] as const;

/** Real deployed public protocol configuration (Studionet, owner-supplied). */
const VALID: Record<string, string> = {
  NEXT_PUBLIC_GENLAYER_NETWORK: "studionet",
  NEXT_PUBLIC_VERITAS_CORE_ADDRESS: "0x6eDB217AB5cc661578D61622284e8914D77996Ee",
  NEXT_PUBLIC_VERITAS_REGISTRY_ADDRESS: "0xBb087A4FA41d5a40a4f40450a0A565d3748f0080",
  NEXT_PUBLIC_VERITAS_GOVERNANCE_ADDRESS: "0x1A3E7a5B67e961dD2dB6D64C5732635fc5e0Cd9D",
};

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const name of REQUIRED_VARS) {
    saved[name] = process.env[name];
    process.env[name] = VALID[name];
  }
  process.env.NEXT_PUBLIC_ENABLE_FIXTURES = "false";
});

afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  delete process.env.NEXT_PUBLIC_ENABLE_FIXTURES;
});

describe("loadEnv", () => {
  it("loads a valid configuration and preserves exact address strings", () => {
    const env = loadEnv();
    expect(env.network).toBe("studionet");
    expect(env.contracts.core).toBe(VALID.NEXT_PUBLIC_VERITAS_CORE_ADDRESS);
    expect(env.contracts.registry).toBe(VALID.NEXT_PUBLIC_VERITAS_REGISTRY_ADDRESS);
    expect(env.contracts.governance).toBe(VALID.NEXT_PUBLIC_VERITAS_GOVERNANCE_ADDRESS);
    expect(env.fixturesEnabled).toBe(false);
  });

  it.each(REQUIRED_VARS)("fails clearly and safely when %s is missing", (name) => {
    delete process.env[name];
    try {
      loadEnv();
      expect.unreachable("loadEnv should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      const configurationError = error as ConfigurationError;
      expect(configurationError.message).toContain(name);
      expect(configurationError.missing).toContain(name);
    }
  });

  it("rejects an unsupported network with a clear message", () => {
    process.env.NEXT_PUBLIC_GENLAYER_NETWORK = "not-a-network";
    expect(() => loadEnv()).toThrowError(/Unsupported NEXT_PUBLIC_GENLAYER_NETWORK/);
  });

  it("rejects a malformed contract address instead of fabricating one", () => {
    process.env.NEXT_PUBLIC_VERITAS_CORE_ADDRESS = "0x123";
    expect(() => loadEnv()).toThrowError(/Invalid NEXT_PUBLIC_VERITAS_CORE_ADDRESS/);
  });

  it("enables fixtures only when explicitly requested", () => {
    process.env.NEXT_PUBLIC_ENABLE_FIXTURES = "true";
    expect(loadEnv().fixturesEnabled).toBe(true);
  });
});
