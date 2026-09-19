import { cn } from "@/lib/cn";

/** Loading state — convergence mark pulse; text remains present without motion. */
export function LoadingBlock({ label = "Loading", className }: { readonly label?: string; readonly className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center gap-3 text-sm text-fg-secondary", className)}>
      <span
        aria-hidden
        className="inline-block h-4 w-4 animate-pulse-soft rounded-full border-2 border-accent/80 border-t-transparent"
      />
      {label}
    </div>
  );
}
