/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"]
      },
      /**
       * Palette (inspired by a pale, technical "link console" look)
       * - paper: page and card backgrounds
       * - ink:   text and hexagon outlines
       * - accent: indigo for active/healthy values
       * - ember: orange for warnings and highlighted words
       * - salmon: status bar and over-budget state
       */
      colors: {
        paper: { DEFAULT: "#ECEBE6", light: "#F7F6F2" },
        ink: { DEFAULT: "#1E2130", soft: "#5A5E70" },
        line: "#C9C8C2",
        accent: { DEFAULT: "#5558C8", dark: "#3E41A8" },
        ember: "#E2793F",
        salmon: { DEFAULT: "#E88B84", dark: "#B8504A" }
      },
      keyframes: {
        "rise-in": { from: { opacity: 0, transform: "translateY(14px) scale(0.96)" }, to: { opacity: 1, transform: "none" } },
        breathe: { "0%,100%": { filter: "drop-shadow(0 0 0 rgba(85,88,200,0))" }, "50%": { filter: "drop-shadow(0 0 10px rgba(85,88,200,0.45))" } },
        flow: { to: { strokeDashoffset: -24 } }
      },
      animation: {
        "rise-in": "rise-in 600ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        breathe: "breathe 3.6s ease-in-out infinite",
        flow: "flow 1.6s linear infinite"
      }
    }
  },
  plugins: []
};
