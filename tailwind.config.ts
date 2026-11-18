import type { Config } from "tailwindcss";

/**
 * Bid Terminal tema tokenları. Değerlerin kendisi app/globals.css içinde
 * CSS custom property olarak tanımlı; burada Tailwind sınıflarına bağlanıyor
 * (bg-panel, text-muted, border-border, text-accent, text-up, text-down ...).
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-alt": "var(--bg-alt)",
        panel: "var(--panel)",
        border: "var(--border)",
        "border-dim": "var(--border-dim)",
        text: "var(--text)",
        muted: "var(--muted)",
        dim: "var(--dim)",
        accent: "var(--accent)",
        up: "var(--up)",
        down: "var(--down)",
        info: "var(--info)",
      },
      fontFamily: {
        mono: ["var(--font-mono)"],
        display: ["var(--font-mono)"],
        body: ["var(--font-body)"],
        sans: ["var(--font-body)"],
      },
      borderRadius: {
        DEFAULT: "6px",
        card: "8px",
      },
    },
  },
};

export default config;
