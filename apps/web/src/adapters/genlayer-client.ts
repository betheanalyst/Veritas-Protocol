/**
 * GenLayerJS client factory — the ONLY place genlayer-js clients are created.
 * SDK pin: genlayer-js@1.1.8, EXACT (D-12). UI components never import
 * genlayer-js directly; all interaction flows through the typed adapters.
 */
import { createClient } from "genlayer-js";
import { TransactionHashVariant } from "genlayer-js/types";

import { getConfig, type GenLayerChain } from "@/config/network";

export type GenLayerClient = ReturnType<typeof createClient>;

/**
 * Read finality policy — verified against the INSTALLED genlayer-js@1.1.8
 * package types (2026-09-13; the SDK README's `stateStatus` example is stale):
 *   LATEST_NONFINAL ("latest-nonfinal") — SDK default; newest non-final state;
 *     responsive post-write reads; an appeal/recomputation can still change it.
 *   LATEST_FINAL ("latest-final") — durable finalized state; the conservative
 *     choice for trustworthy UI decisions (D-10).
 * Note: `jsonSafeReturn` defaults to true in this SDK, so u256 wei values are
 * decoded as decimal STRINGS — `toValue()` converts them to BigInt at the
 * adapter boundary (Rule 8).
 */
export type StateStatus = TransactionHashVariant;
export const DEFAULT_STATE_STATUS: StateStatus = TransactionHashVariant.LATEST_NONFINAL;

const readClientCache = new Map<GenLayerChain, GenLayerClient>();

/** Account-free client for public view reads (no wallet, no fee). */
export function getReadClient(): GenLayerClient {
  const { chain } = getConfig();
  let client = readClientCache.get(chain);
  if (client === undefined) {
    client = createClient({ chain });
    readClientCache.set(chain, client);
  }
  return client;
}

/**
 * Wallet-backed client for writes: bound to the connected account address;
 * signing routes through the EIP-1193 provider after client.connect
 * (official v1.1.8 browser-wallet pattern, D-02).
 */
export function createWalletClient(account: `0x${string}`): GenLayerClient {
  const { chain } = getConfig();
  return createClient({ chain, account });
}
