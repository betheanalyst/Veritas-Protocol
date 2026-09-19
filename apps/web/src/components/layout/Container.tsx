import { cn } from "@/lib/cn";

import type { ReactNode } from "react";

/** Page-width container — the single horizontal rhythm of the application. */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}
