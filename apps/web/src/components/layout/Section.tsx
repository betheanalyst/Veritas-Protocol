import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Container } from "./Container";

interface SectionProps {
  readonly id?: string;
  readonly className?: string;
  readonly containerClassName?: string;
  /** Hairline top border (default true) — the editorial section rhythm. */
  readonly bordered?: boolean;
  readonly children: ReactNode;
}

export function Section({ id, className, containerClassName, bordered = true, children }: SectionProps) {
  return (
    <section id={id} className={cn(bordered && "border-t border-hairline", "py-16 sm:py-20", className)}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
