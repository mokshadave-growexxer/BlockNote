import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95"
        },
        ink: "#080B14",
        surface: "#141A2B",
        atelier: {
          navy: "#0B1020",
          midnight: "#080B14",
          panel: "#111827",
          lavender: "#F2EDFF",
          mist: "#FAF8FF",
          line: "#D8D0FF"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      boxShadow: {
        panel: "0 24px 60px rgba(91, 33, 182, 0.15)",
        atelier: "0 28px 80px rgba(17, 24, 39, 0.18)",
        glow: "0 24px 70px rgba(139, 92, 246, 0.28)"
      }
    }
  },
  plugins: []
} satisfies Config;
