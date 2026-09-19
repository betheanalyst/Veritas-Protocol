import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly invalid?: boolean;
}

export function Select({ invalid = false, className, children, ...props }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full appearance-none rounded-md bg-bg-input px-3 py-2 text-sm text-fg ring-1 ring-inset ring-hairline transition-shadow hover:ring-fg-muted/50 focus-visible:ring-2 focus-visible:ring-accent/70",
        invalid && "ring-danger/60 focus-visible:ring-danger/70",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
