import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0A0B0F",
          soft: "#111218",
          card: "#141620",
          hover: "#1A1C26",
        },
        border: {
          DEFAULT: "#22242F",
          strong: "#2D303D",
        },
        fg: {
          DEFAULT: "#E9ECF2",
          muted: "#8B90A0",
          subtle: "#5A5F6E",
        },
        accent: {
          DEFAULT: "#7C5CFF",
          soft: "#312A5C",
        },
        good: "#3DDC97",
        warn: "#F5A524",
        bad: "#F43F5E",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.2)",
        glow: "0 0 0 1px rgba(124,92,255,0.3), 0 8px 24px rgba(124,92,255,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
