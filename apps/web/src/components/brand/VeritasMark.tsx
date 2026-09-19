import { cn } from "@/lib/cn";

interface VeritasMarkProps {
  className?: string;
  title?: string;
  /** When true (default) the mark is presentational and hidden from AT. */
  decorative?: boolean;
}

/**
 * VeritasMark — the geometric convergent mark: independent paths converging
 * toward a single vertex (verification). Serves as logo mark, favicon,
 * loading motif, and result-state motif. Phase 1 deliverable — the owner
 * reviews the mark before release.
 */
export function VeritasMark({ className, title = "Veritas", decorative = true }: VeritasMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      className={cn("h-7 w-7 text-fg", className)}
      fill="none"
    >
      <path d="M3.5 5 16 27.5" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M28.5 5 16 27.5" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M10 5 16 15.8" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
      <path d="M22 5 16 15.8" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
      <path d="M16 4.5 16 11.5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" opacity={0.32} />
      <circle cx="16" cy="27.5" r="2.1" className="fill-accent" />
    </svg>
  );
}
