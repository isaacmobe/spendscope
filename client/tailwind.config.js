/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      /**
       * Typography
       * ----------
       * Keep Euclid Circular A first (if you have it locally / licensed),
       * then fall back to good system fonts.
       */
      fontFamily: {
        sans: [
          '"Euclid Circular A"',
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Arial",
          "sans-serif"
        ]
      },

      /**
       * Brand Color System
       * ------------------
       * Centralized palette so components do NOT hardcode random hex values.
       * Use like:
       * - bg-brand-cream
       * - text-brand-green
       * - text-brand-red
       * - bg-brand-yellow/10
       */
      colors: {
        brand: {
          green: "#115740",
          cream: "#F7F6F2",
          red: "#8F2D2D",
          yellow: "#D6B85A"
        }
      },

      /**
       * Shadows
       * -------
       * A soft "floating" shadow for bento cards.
       * Use like: shadow-float
       */
      boxShadow: {
        float: "0 10px 25px -10px rgba(0,0,0,0.12)"
      }
    }
  },
  plugins: []
};
