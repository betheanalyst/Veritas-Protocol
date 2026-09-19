"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";

export interface DataFieldProps {
  readonly label: string;
  /** The full, exact protocol value. */
  readonly value: string;
  /** Optional shortened display form (full value stays available via copy). */
  readonly displayValue?: string;
  /** Optional different value to copy (defaults to `value`). */
  readonly copyValue?: string;
  readonly className?: string;
}

/**
 * DataField — label + monospace protocol value with copy access.
 * Protocol-sourced values only; shortening is presentational (labeled derived).
 */
export function DataField({ label, value, displayValue, copyValue, className }: DataFieldProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (e.g. permissions) — silently keep the value visible.
    }
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.14em] text-fg-muted">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="rounded px-1.5 py-0.5 text-xs text-fg-muted transition-colors hover:text-fg"
          aria-label={`Copy ${label}`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p title={value} className="mt-1 break-all font-mono text-sm text-fg">
        {displayValue ?? value}
      </p>
    </div>
  );
}
