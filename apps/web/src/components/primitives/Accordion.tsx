"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface AccordionItem {
  readonly id: string;
  readonly summary: ReactNode;
  readonly content: ReactNode;
}

/** Single-open accessible disclosure (the progressive-disclosure primitive). */
export function Accordion({ items, defaultOpenId, className }: {
  readonly items: readonly AccordionItem[];
  readonly defaultOpenId?: string;
  readonly className?: string;
}) {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);

  return (
    <div className={cn("divide-y divide-hairline", className)}>
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id}>
            <h3>
              <button
                id={`${baseId}-trigger-${item.id}`}
                type="button"
                aria-expanded={open}
                aria-controls={`${baseId}-region-${item.id}`}
                onClick={() => setOpenId(open ? null : item.id)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-fg transition-colors hover:text-accent"
              >
                {item.summary}
                <span aria-hidden className={cn("text-fg-muted transition-transform", open && "rotate-180")}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3.5 6 8 10.5 12.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            </h3>
            <div
              id={`${baseId}-region-${item.id}`}
              role="region"
              aria-labelledby={`${baseId}-trigger-${item.id}`}
              hidden={!open}
              className="pb-5 text-sm leading-6 text-fg-secondary"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
