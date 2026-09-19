import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly invalid?: boolean;
}

export function Textarea({ invalid = false, className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-md bg-bg-input px-3 py-2 text-sm text-fg ring-1 ring-inset ring-hairline transition-shadow placeholder:text-fg-muted hover:ring-fg-muted/50 focus-visible:ring-2 focus-visible:ring-accent/70",
        invalid && "ring-danger/60 focus-visible:ring-danger/70",
        className,
      )}
      {...props}
    />
  );
}
