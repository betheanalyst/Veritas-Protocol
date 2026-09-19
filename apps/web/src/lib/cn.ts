import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Class-name composition for the token-driven design system (Phase 1). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
