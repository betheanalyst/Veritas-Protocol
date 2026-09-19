import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const fieldStyles =
  "w-full rounded-md bg-bg-input px-3 py-2 text-sm text-fg ring-1 ring-inset ring-hairline transition-shadow placeholder:text-fg-muted hover:ring-fg-muted/50 focus-visible:ring-2 focus-visible:ring-accent/70";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly invalid?: boolean;
}

export function Input({ invalid = false, className, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(fieldStyles, invalid && "ring-danger/60 focus-visible:ring-danger/70", className)}
      {...props}
    />
  );
}
