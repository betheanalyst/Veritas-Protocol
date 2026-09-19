"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ToastTone = "info" | "success" | "warning" | "danger";

export interface ToastMessage {
  readonly id: number;
  readonly title: string;
  readonly description?: string;
  readonly tone: ToastTone;
}

interface ToastContextValue {
  show(toast: { title: string; description?: string; tone?: ToastTone }): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneRing: Record<ToastTone, string> = {
  info: "ring-info/40",
  success: "ring-success/40",
  warning: "ring-warning/40",
  danger: "ring-danger/40",
};

/** Minimal, accessible toast system (announced via role=status). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly ToastMessage[]>([]);

  const show = useCallback<ToastContextValue["show"]>(({ title, description, tone = "info" }) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, title, description, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5200);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto rounded-md border border-hairline bg-bg-surface-2 p-3 shadow-lg ring-1 ring-inset animate-fade-up",
              toneRing[toast.tone],
            )}
          >
            <p className="text-sm font-medium text-fg">{toast.title}</p>
            {toast.description ? <p className="mt-0.5 text-xs leading-5 text-fg-secondary">{toast.description}</p> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>.");
  return ctx;
}
