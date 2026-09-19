/**
 * Environment configuration — the ONLY module that reads raw environment variables.
 * (Next.js inlines NEXT_PUBLIC_* values only for static `process.env.NAME` references,
 * so every variable is referenced statically here and nowhere else.)
 *
 * Fail-clear-and-safe: missing or malformed configuration throws a descriptive
 * ConfigurationError. The application NEVER falls back to fabricated values.
 */

export class ConfigurationError extends Error {
  readonly missing: readonly string[];

  constructor(message: string, missing: readonly string[] = []) {
    super(message);
    this.name = "ConfigurationError";
    this.missing = missing;
  }
}

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export type NetworkPresetName =
  | "studionet"
  | "testnetBradbury"
  | "testnetAsimov"
  | "localnet";

export const SUPPORTED_NETWORKS: readonly NetworkPresetName[] = [
  "studionet",
  "testnetBradbury",
  "testnetAsimov",
  "localnet",
];

export interface VeritasEnv {
  readonly network: NetworkPresetName;
  readonly contracts: {
    readonly core: `0x${string}`;
    readonly registry: `0x${string}`;
    readonly governance: `0x${string}`;
  };
  /** Fixture/demo mode must be explicit and obvious; default false (Rule 16). */
  readonly fixturesEnabled: boolean;
}

function readRawEnv() {
  return {
    network: process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "",
    core: process.env.NEXT_PUBLIC_VERITAS_CORE_ADDRESS ?? "",
    registry: process.env.NEXT_PUBLIC_VERITAS_REGISTRY_ADDRESS ?? "",
    governance: process.env.NEXT_PUBLIC_VERITAS_GOVERNANCE_ADDRESS ?? "",
    fixtures: process.env.NEXT_PUBLIC_ENABLE_FIXTURES ?? "false",
  };
}

export function loadEnv(): VeritasEnv {
  const raw = readRawEnv();
  const missing: string[] = [];
  if (!raw.network) missing.push("NEXT_PUBLIC_GENLAYER_NETWORK");
  if (!raw.core) missing.push("NEXT_PUBLIC_VERITAS_CORE_ADDRESS");
  if (!raw.registry) missing.push("NEXT_PUBLIC_VERITAS_REGISTRY_ADDRESS");
  if (!raw.governance) missing.push("NEXT_PUBLIC_VERITAS_GOVERNANCE_ADDRESS");

  if (missing.length > 0) {
    throw new ConfigurationError(
      `Veritas configuration is incomplete. Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Set them in apps/web/.env.local (see .env.example) or in your deployment environment. ` +
        `The application does not fabricate configuration values.`,
      missing,
    );
  }

  const network = raw.network.trim() as NetworkPresetName;
  if (!SUPPORTED_NETWORKS.includes(network)) {
    throw new ConfigurationError(
      `Unsupported NEXT_PUBLIC_GENLAYER_NETWORK: "${raw.network}". Supported values: ${SUPPORTED_NETWORKS.join(", ")}.`,
      ["NEXT_PUBLIC_GENLAYER_NETWORK"],
    );
  }

  const addressChecks: readonly [string, string, string][] = [
    ["VeritasCore", raw.core, "NEXT_PUBLIC_VERITAS_CORE_ADDRESS"],
    ["ModuleRegistry", raw.registry, "NEXT_PUBLIC_VERITAS_REGISTRY_ADDRESS"],
    ["VeritasGovernance", raw.governance, "NEXT_PUBLIC_VERITAS_GOVERNANCE_ADDRESS"],
  ];
  for (const [label, value, variable] of addressChecks) {
    if (!HEX_ADDRESS.test(value.trim())) {
      throw new ConfigurationError(
        `Invalid ${variable}: "${value}" is not a valid 20-byte hex address for ${label}. ` +
          `Check the deployed contract addresses for the selected network (current: ${network}).`,
        [variable],
      );
    }
  }

  return {
    network,
    contracts: {
      core: raw.core.trim() as `0x${string}`,
      registry: raw.registry.trim() as `0x${string}`,
      governance: raw.governance.trim() as `0x${string}`,
    },
    fixturesEnabled: raw.fixtures.trim().toLowerCase() === "true",
  };
}
