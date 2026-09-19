import { cn } from "@/lib/cn";

/** Thin precise separator. */
export function Divider({ className }: { readonly className?: string }) {
  return <hr className={cn("border-0 border-t border-hairline", className)} />;
}
