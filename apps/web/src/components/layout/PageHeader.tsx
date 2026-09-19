import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Container } from "./Container";

interface PageHeaderProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly className?: string;
}

/** Shared inner-page header (eyebrow / title / description / actions). */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("border-b border-hairline py-12 sm:py-16", className)}>
      <Container>
        {eyebrow ? (
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-fg-muted">{eyebrow}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tightest text-fg sm:text-4xl">{title}</h1>
          {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
        </div>
        {description ? <p className="mt-4 max-w-2xl text-base leading-7 text-fg-secondary">{description}</p> : null}
      </Container>
    </div>
  );
}
