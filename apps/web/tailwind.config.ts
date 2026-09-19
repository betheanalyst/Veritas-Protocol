import type { Config } from "tailwindcss";

/**
 * Veritas design tokens (Phase 1 — Design Foundation).
 * Editorial graphite foundation · warm off-white text · one distinctive accent.
 * Monospace is reserved exclusively for IDs, hashes, addresses, technical values.
 * Semantic colors are used only when meaningful.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "bg-base": "#0B0C0E",
        "bg-surface": "#121316",
        "bg-surface-2": "#191B1F",
        "bg-input": "#0F1013",
        fg: "#F2F0EB",
        "fg-secondary": "#A9A69D",
        "fg-muted": "#71706A",
        hairline: "#26282E",
        accent: {
          DEFAULT: "#E8C15A",
          strong: "#F2CE6E",
        },
        success: "#5FC98B",
        warning: "#D9A441",
        danger: "#E07A6B",
        info: "#6BA8D9",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.035em",
        brand: "0.22em",
      },
      maxWidth: {
        content: "72rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        draw: {
          "0%": { "stroke-dashoffset": "1" },
          "100%": { "stroke-dashoffset": "0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-up": "fade-up 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
        draw: "draw 1700ms ease-out both",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
