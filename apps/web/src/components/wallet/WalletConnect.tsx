"use client";

import { useWallet } from "@/wallet/WalletProvider";
import { buttonStyles } from "@/components/primitives/Button";
import { formatGEN, shortenHex } from "@/lib/format";

/**
 * Compact header wallet control (custom, Veritas-native — no wallet template).
 * Full connect UX (balance, switch flow, guidance) is completed in Phase 3.
 */
export function WalletConnect() {
  const { hasProvider, isConnected, isConnecting, isWrongNetwork, address, balanceWei, connect, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={disconnect}
        className={buttonStyles({ variant: "secondary", size: "sm" })}
        title="Disconnect wallet"
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
        {balanceWei !== null ? formatGEN(balanceWei, { maxFractionDigits: 2 }) : "…"}
        <span aria-hidden className="text-fg-muted">·</span>
        {shortenHex(address)}
      </button>
    );
  }

  if (!hasProvider) {
    return (
      <span
        className={buttonStyles({ variant: "ghost", size: "sm" }) + " cursor-default opacity-60"}
        title="No EIP-1193 browser wallet detected"
      >
        No wallet
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={connect}
      disabled={isConnecting}
      aria-busy={isConnecting || undefined}
      className={buttonStyles({ variant: isWrongNetwork ? "danger" : "primary", size: "sm" })}
    >
      {isWrongNetwork ? "Wrong network" : isConnecting ? "Connecting…" : "Connect"}
    </button>
  );
}
