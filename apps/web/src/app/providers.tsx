"use client";

import type { ReactNode } from "react";

import { QueryProvider } from "@/queries/QueryProvider";
import { ToastProvider } from "@/components/primitives/toast";
import { WalletProvider } from "@/wallet/WalletProvider";

/** Client provider stack: React Query -> Wallet -> Toasts. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <WalletProvider>
        <ToastProvider>{children}</ToastProvider>
      </WalletProvider>
    </QueryProvider>
  );
}
