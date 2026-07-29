import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        bg: { DEFAULT: "#0a0a0f", soft: "#101018", raised: "#15151f" },
        line: "rgba(255,255,255,0.08)",
        ink: { DEFAULT: "#EDF1FA", muted: "#A2A8BD", faint: "#5C6274" },
        accent: { DEFAULT: "#7C5CFF", cyan: "#3EE6DB", hot: "#B85CFF" },
      },
      fontFamily: {
        sans: ["var(--font-geist)", "Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(100deg, #7C5CFF, #3EE6DB)",
        "grid-pattern":
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(124,92,255,0.35)",
        "glow-lg": "0 0 70px rgba(124,92,255,0.45)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        "gradient-flow": { to: { backgroundPosition: "250% center" } },
        "aurora-drift": { "0%": { transform: "translate(-50%,0) scale(1)" }, "100%": { transform: "translate(-48%,16px) scale(1.06)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        marquee: "marquee 32s linear infinite",
        "gradient-flow": "gradient-flow 8s linear infinite",
        "aurora-drift": "aurora-drift 22s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
