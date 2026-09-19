"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "genlayer-js";

import { getConfig } from "@/config/network";

import { getEthereumProvider } from "./provider";

interface WalletState {
  readonly hasProvider: boolean;
  readonly address: string | null;
  readonly isConnected: boolean;
  readonly isConnecting: boolean;
  readonly chainId: string | null;
  readonly isWrongNetwork: boolean;
  /** Wallet GEN balance in wei (BigInt) — null while unknown. */
  readonly balanceWei: bigint | null;
  readonly error: string | null;
  connect(): Promise<void>;
  disconnect(): void;
}

const WalletContext = createContext<WalletState | null>(null);

function toChainIdHex(id: unknown): string | null {
  if (typeof id === "bigint") return `0x${id.toString(16)}`;
  if (typeof id === "number") return `0x${id.toString(16)}`;
  if (typeof id === "string") return id;
  return null;
}

/**
 * Wallet-layer SKELETON (Phase 0B): EIP-1193 connect/disconnect and chain
 * tracking via the official genlayer-js v1.1.8 flow (createClient +
 * client.connect). Balance display, the Veritas-native connect UI, and full
 * wrong-network switching UX are completed in Phase 3 (D-02).
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const { chain, env } = getConfig();
  const expectedChainId = toChainIdHex((chain as { id?: unknown }).id);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balanceWei, setBalanceWei] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const provider = getEthereumProvider();
    if (!provider?.on) return;
    const onAccountsChanged = (accounts: unknown) => {
      const next = Array.isArray(accounts) ? (accounts[0] as string | undefined) : undefined;
      setAddress(next ?? null);
    };
    const onChainChanged = (next: unknown) => setChainId(typeof next === "string" ? next : null);
    provider.on("accountsChanged", onAccountsChanged as never);
    provider.on("chainChanged", onChainChanged as never);
    return () => {
      provider.removeListener?.("accountsChanged", onAccountsChanged as never);
      provider.removeListener?.("chainChanged", onChainChanged as never);
    };
  }, []);

  const refreshBalance = useCallback(async (account: string) => {
    const provider = getEthereumProvider();
    if (!provider) return;
    try {
      const raw = (await provider.request({ method: "eth_getBalance", params: [account, "latest"] })) as string;
      if (typeof raw === "string") setBalanceWei(BigInt(raw));
    } catch {
      setBalanceWei(null);
    }
  }, []);

  const connect = useCallback(async () => {
    const provider = getEthereumProvider();
    if (!provider) {
      setError("No browser wallet detected. Install MetaMask or another EIP-1193 wallet.");
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const first = accounts?.[0];
      if (!first) {
        setError("No account authorized.");
        return;
      }
      setAddress(first);
      // Official v1.1.8 wallet flow: bind the client to the account, then ask
      // the wallet to switch/add the correct GenLayer network before signing.
      const client = createClient({ chain, account: first as `0x${string}` });
      await client.connect(env.network);
      const cid = (await provider.request({ method: "eth_chainId" })) as string;
      setChainId(cid);
      void refreshBalance(first);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsConnecting(false);
    }
  }, [chain, env.network, refreshBalance]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setBalanceWei(null);
    setError(null);
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      hasProvider: typeof window !== "undefined" && getEthereumProvider() !== null,
      address,
      isConnected: address !== null,
      isConnecting,
      chainId,
      balanceWei,
      isWrongNetwork:
        chainId !== null && expectedChainId !== null && chainId.toLowerCase() !== expectedChainId.toLowerCase(),
      error,
      connect,
      disconnect,
    }),
    [address, chainId, connect, disconnect, error, expectedChainId, isConnecting, balanceWei],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>.");
  return ctx;
}
