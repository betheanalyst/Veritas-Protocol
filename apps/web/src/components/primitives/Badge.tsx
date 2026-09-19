import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const toneStyles: Record<BadgeTone, string> = {
  neutral: "bg-white/5 text-fg-secondary ring-hairline",
  accent: "bg-accent/10 text-accent ring-accent/25",
  success: "bg-success/10 text-success ring-success/25",
  warning: "bg-warning/10 text-warning ring-warning/25",
  danger: "bg-danger/10 text-danger ring-danger/25",
  info: "bg-info/10 text-info ring-info/25",
};

export function Badge({ tone = "neutral", className, children }: {
  readonly tone?: BadgeTone;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", toneStyles[tone], className)}>
      {children}
    </span>
  );
}
