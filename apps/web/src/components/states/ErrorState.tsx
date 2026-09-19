"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/primitives/Button";

export interface ErrorStateProps {
  readonly title: string;
  readonly message: string;
  /** Optional protocol error code for technical disclosure. */
  readonly code?: string;
  readonly onRetry?: () => void;
  readonly action?: ReactNode;
}

/**
 * Error state following the mandated pattern:
 * what happened -> why -> what can I do? (+ technical details).
 */
export function ErrorState({ title, message, code, onRetry, action }: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-lg border border-hairline bg-bg-surface p-6">
      <p className="text-base font-semibold text-fg">{title}</p>
      <p className="mt-2 text-sm leading-6 text-fg-secondary">{message}</p>
      {code ? (
        <p className="mt-3 font-mono text-xs text-fg-muted">
          Technical detail: <span className="break-all">{code}</span>
        </p>
      ) : null}
      {onRetry || action ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}
