/**
 * Network-aware configuration: resolves the active GenLayer network preset and
 * binds the deployed contract addresses. Moving to another supported network
 * (e.g., Studionet → Testnet Bradbury) is an environment change ONLY — no UI or
 * adapter code changes (D-01/D-13).
 */
import { localnet, studionet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";

import { loadEnv, type NetworkPresetName, type VeritasEnv } from "./env";

const CHAIN_PRESETS = {
  studionet,
  testnetBradbury,
  testnetAsimov,
  localnet,
} as const;

export type GenLayerChain = (typeof CHAIN_PRESETS)[NetworkPresetName];

export interface VeritasConfig {
  readonly env: VeritasEnv;
  readonly chain: GenLayerChain;
}

let cached: VeritasConfig | null = null;

export function getConfig(): VeritasConfig {
  if (cached === null) {
    const env = loadEnv();
    cached = { env, chain: CHAIN_PRESETS[env.network] };
  }
  return cached;
}

/** Test-only helper — resets the cached config (never used at runtime). */
export function resetConfigCacheForTests(): void {
  cached = null;
}
