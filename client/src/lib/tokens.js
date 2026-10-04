/**
 * tokens.js
 * ---------
 * Reads theme colours from the CSS variables in index.css, for inline SVG styles and for
 * values the canvas scene needs. Using variables keeps light and dark mode in one place.
 *   rgb("ink", 0.5)  ->  "rgb(var(--c-ink) / 0.5)"
 */
export const rgb = (name, alpha) => (alpha == null ? `rgb(var(--c-${name}))` : `rgb(var(--c-${name}) / ${alpha})`);
