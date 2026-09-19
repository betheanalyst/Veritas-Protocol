import type { ReactNode } from "react";

export interface EmptyStateProps {
  readonly title: string;
  readonly message: string;
  readonly action?: ReactNode;
}

/** Simple, actionable empty state. */
export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-hairline bg-bg-surface/50 p-8 text-center">
      <p className="text-base font-medium text-fg">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-fg-secondary">{message}</p>
      {action ? <div className="mt-5 flex justify-center gap-3">{action}</div> : null}
    </div>
  );
}
