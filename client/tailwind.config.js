/** @type {import('tailwindcss').Config} */

// Colours are CSS variables (see index.css) so one class works in light and dark mode,
// and Tailwind opacity modifiers such as bg-ink/70 keep working.
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"]
      },
      /**
       * Palette: creamy black and white, softened, with a matching dark mode.
       * Colour is rationed, as in the reference console: indigo for the active value, orange for a
       * highlighted word, rose for warnings and the status bar. Everything else is cream and ink.
       */
      colors: {
        cream: { DEFAULT: v("surface-2"), light: v("surface"), deep: v("deep"), dark: v("dark") },
        ink: { DEFAULT: v("ink"), soft: v("ink-soft"), faint: v("ink-faint") },
        accent: { DEFAULT: v("accent"), soft: v("accent-soft"), wash: v("accent-wash"), dark: v("accent-dark") },
        ember: v("ember"),
        good: v("good"),
        rose: { DEFAULT: v("rose"), deep: v("rose-deep"), wash: v("rose-wash") },
        paper: v("paper")
      }
    }
  },
  plugins: []
};
