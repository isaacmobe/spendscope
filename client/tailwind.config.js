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
       * Palette: creamy black and white, softened.
       * Colour is rationed, as in the reference console: indigo for the active value, orange for a
       * highlighted word, rose for warnings and the status bar. Everything else is cream and ink.
       */
      colors: {
        cream: { DEFAULT: "#F1EEE6", light: "#FAF8F3", deep: "#E6E2D6", dark: "#D5D0C2" },
        ink: { DEFAULT: "#2A2A31", soft: "#74727A", faint: "#A6A39B" },
        accent: { DEFAULT: "#5E62C4", soft: "#8E91D6", wash: "#E4E5F4", dark: "#454998" },
        ember: "#D98650",
        rose: { DEFAULT: "#E9A29B", deep: "#BC5F58", wash: "#F6DEDA" }
      },
      boxShadow: {
        lift: "0 18px 40px -18px rgba(42,42,49,0.35), 0 6px 14px -8px rgba(42,42,49,0.18)"
      }
    }
  },
  plugins: []
};
