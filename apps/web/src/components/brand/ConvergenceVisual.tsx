import { cn } from "@/lib/cn";

interface Node {
  readonly x: number;
  readonly y: number;
}

const SOURCES: readonly Node[] = [
  { x: 56, y: 60 },
  { x: 56, y: 130 },
  { x: 56, y: 200 },
  { x: 56, y: 270 },
  { x: 56, y: 340 },
];

const VERTEX: Node = { x: 470, y: 200 };
const OUTPUT: Node = { x: 600, y: 200 };

/**
 * ConvergenceVisual — the signature Veritas motif: independent inputs
 * converging through evaluation toward a single verified outcome.
 * Presentational only (aria-hidden): it never implies validator data or
 * live protocol activity (Protocol truth drives animation — never the
 * reverse).
 */
export function ConvergenceVisual({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 660 400"
      aria-hidden="true"
      className={cn("h-auto w-full", className)}
      fill="none"
    >
      {SOURCES.map((source, index) => (
        <g key={source.y}>
          <circle cx={source.x} cy={source.y} r={4} className="fill-fg-muted" opacity={0.5} />
          <path
            d={`M ${source.x + 10} ${source.y} C 240 ${source.y}, 330 ${VERTEX.y}, ${VERTEX.x - 26} ${VERTEX.y}`}
            stroke="currentColor"
            className="text-fg-muted"
            strokeWidth={1.2}
            opacity={0.35}
            pathLength={1}
            strokeDasharray={1}
            style={{ animation: `draw 1600ms ${index * 120}ms ease-out both` }}
          />
        </g>
      ))}
      <path
        d={`M ${VERTEX.x + 8} ${VERTEX.y} L ${OUTPUT.x - 14} ${OUTPUT.y}`}
        stroke="currentColor"
        className="text-accent"
        strokeWidth={2}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        style={{ animation: "draw 900ms 1100ms ease-out both" }}
      />
      <circle cx={VERTEX.x} cy={VERTEX.y} r={7} className="fill-accent" />
      <circle cx={VERTEX.x} cy={VERTEX.y} r={13} className="fill-accent/20" />
      <circle cx={OUTPUT.x} cy={OUTPUT.y} r={5} className="fill-fg" />
    </svg>
  );
}
