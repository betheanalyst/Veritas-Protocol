import { cn } from "@/lib/cn";

export interface ConfidenceDisplayProps {
  readonly confidence: number;
  readonly className?: string;
}

/** Confidence is always visually distinct from score (never merged). */
export function ConfidenceDisplay({ confidence, className }: ConfidenceDisplayProps) {
  const clamped = Math.max(0, Math.min(100, confidence));
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-[0.14em] text-fg-muted">Confidence</span>
        <span className="font-mono text-sm text-fg-secondary">{clamped}%</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-fg-secondary/70" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
