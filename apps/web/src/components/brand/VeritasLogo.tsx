import { cn } from "@/lib/cn";

import { VeritasMark } from "./VeritasMark";

/** VeritasLogo — mark + letterspaced wordmark. */
export function VeritasLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <VeritasMark className="h-7 w-7" />
      <span className="text-[17px] font-semibold tracking-brand text-fg">VERITAS</span>
    </span>
  );
}
