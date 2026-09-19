import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const baseStyles =
  "inline-flex select-none items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-[#171307] hover:bg-accent-strong",
  secondary: "bg-bg-surface-2 text-fg ring-1 ring-inset ring-hairline hover:ring-fg-muted",
  ghost: "text-fg-secondary hover:bg-bg-surface-2 hover:text-fg",
  danger: "bg-danger/15 text-danger ring-1 ring-inset ring-danger/30 hover:bg-danger/25",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface ButtonStyleOptions {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly className?: string;
}

/** Style accessor so <Link> (and other elements) can reuse button styling. */
export function buttonStyles({ variant = "secondary", size = "md", className }: ButtonStyleOptions = {}): string {
  return cn(baseStyles, variantStyles[variant], sizeStyles[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** Shows an inline spinner and disables interaction (real async work only). */
  readonly loading?: boolean;
}

export function Button({ variant, size, loading = false, className, children, disabled, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}
