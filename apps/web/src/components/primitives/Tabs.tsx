"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
}

/** Accessible tabs (roving tabindex, arrow keys). */
export function Tabs({ items, className }: { readonly items: readonly TabItem[]; readonly className?: string }) {
  const baseId = useId();
  const [active, setActive] = useState(items[0]?.id ?? "");
  const activeIndex = Math.max(items.findIndex((item) => item.id === active), 0);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") setActive(items[(activeIndex + 1) % items.length]?.id ?? active);
    if (event.key === "ArrowLeft") setActive(items[(activeIndex - 1 + items.length) % items.length]?.id ?? active);
    if (event.key === "Home") setActive(items[0]?.id ?? active);
    if (event.key === "End") setActive(items[items.length - 1]?.id ?? active);
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label="Sections" className="flex gap-1 border-b border-hairline" onKeyDown={onKeyDown}>
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              id={`${baseId}-tab-${item.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
                selected ? "border-accent text-fg" : "border-transparent text-fg-secondary hover:text-fg",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          id={`${baseId}-panel-${item.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== active}
          className="pt-5"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
