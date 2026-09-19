import { cn } from "@/lib/cn";

export interface ScoreDisplayProps {
  readonly score: number;
  readonly acceptThreshold: number;
  readonly borderlineThreshold: number;
  readonly className?: string;
}

/**
 * Linear score scale (spec: no circular gauges) with the module's frozen
 * borderline and accept thresholds as markers.
 */
export function ScoreDisplay({ score, acceptThreshold, borderlineThreshold, className }: ScoreDisplayProps) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-2 rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
          style={{ width: `${clamped}%` }}
        />
        <span
          aria-hidden
          className="absolute -top-1 h-4 w-px bg-fg-muted"
          style={{ left: `calc(${borderlineThreshold}% - 1px)` }}
          title={`Borderline threshold: ${borderlineThreshold}`}
        />
        <span
          aria-hidden
          className="absolute -top-1 h-4 w-px bg-accent-strong"
          style={{ left: `calc(${acceptThreshold}% - 1px)` }}
          title={`Accept threshold: ${acceptThreshold}`}
        />
        <span
          aria-hidden
          className="absolute -top-2.5 h-7 w-0.5 rounded bg-fg"
          style={{ left: `calc(${clamped}% - 1px)` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-fg-muted">
        <span>0</span>
        <span>BORDERLINE {borderlineThreshold}</span>
        <span>ACCEPT {acceptThreshold}</span>
        <span>100</span>
      </div>
    </div>
  );
}
