"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { VeritasLogo } from "@/components/brand/VeritasLogo";
import { WalletConnect } from "@/components/wallet/WalletConnect";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/verify", label: "Verify" },
  { href: "/modules", label: "Modules" },
  { href: "/activity", label: "Activity" },
  { href: "/protocol", label: "Protocol" },
] as const;

/** Application header — visually quiet, wallet on the right (per spec). */
export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-bg-base/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-content items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Veritas home" className="shrink-0">
            <VeritasLogo />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm transition-colors",
                    active ? "text-fg" : "text-fg-secondary hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <WalletConnect />
      </div>
    </header>
  );
}
