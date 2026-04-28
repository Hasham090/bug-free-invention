import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: { 950: "#070b1a", 900: "#0b1224", 800: "#111a30", 700: "#172240", 600: "#1f2c54" },
        teal: { 300: "#5ef5e0", 400: "#2ee5cf", 500: "#13c8b6", 600: "#0fa697" },
        ink: { DEFAULT: "#e6ecff", muted: "#9aa3c7", soft: "#c2c9e8" },
      },
      boxShadow: {
        glow: "0 0 30px rgba(46,229,207,.18)",
        card: "0 4px 24px rgba(0,0,0,.35)",
      },
      backgroundImage: {
        "navy-grid":
          "radial-gradient(60% 60% at 20% 10%, rgba(46,229,207,.06) 0, transparent 60%), radial-gradient(50% 50% at 90% 0%, rgba(46,229,207,.05) 0, transparent 60%), linear-gradient(180deg, #070b1a 0%, #0b1224 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
