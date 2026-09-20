"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";

/** Small inline copy button for IDs and hashes — click to copy, shows a checkmark. */
export function CopyableId({
  value,
  displayValue,
  className,
}: {
  readonly value: string;
  readonly displayValue?: string;
  readonly className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={"Copy: " + value}
      className={cn(
        "group/id inline-flex max-w-full items-center gap-1 font-mono text-inherit",
        className,
      )}
    >
      <span className="truncate">{displayValue ?? value}</span>
      <span
        aria-hidden
        className={cn(
          "shrink-0 text-[10px] transition-opacity",
          copied
            ? "text-success opacity-100"
            : "text-fg-muted opacity-0 group-hover/id:opacity-100",
        )}
      >
        {copied ? "✓" : "⧉"}
      </span>
      <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
