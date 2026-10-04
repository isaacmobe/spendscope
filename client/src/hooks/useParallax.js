import { useEffect, useState } from "react";

/**
 * useParallax(enabled)
 * --------------------
 * Gives the console depth: it publishes the pointer position as two CSS variables, --px and
 * --py (each from -1 to 1, eased every frame), on the element it is attached to. Layers inside
 * shift by `calc(var(--px) * N px)` with a different N each, so the core, the nodes and the
 * wiring drift at different speeds like objects at different distances.
 * Plain 2D translation is used on purpose: 3D transforms (preserve-3d) broke clicking on the
 * clipped hexagon buttons. Returns a callback ref, because the element mounts after data loads.
 * The DOM is updated directly, so React never re-renders on mouse move.
 */
export function useParallax(enabled) {
  const [el, setEl] = useState(null);

  useEffect(() => {
    if (!el || !enabled) return;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;

    const loop = () => {
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      el.style.setProperty("--px", x.toFixed(4));
      el.style.setProperty("--py", y.toFixed(4));
      frame = Math.abs(targetX - x) > 0.002 || Math.abs(targetY - y) > 0.002 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!frame) frame = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      el.style.removeProperty("--px");
      el.style.removeProperty("--py");
    };
  }, [el, enabled]);

  return setEl;
}

// Style for a layer that drifts `x` and `y` pixels at full pointer deflection.
export const layerShift = (x, y) => ({ transform: `translate(calc(var(--px, 0) * ${x}px), calc(var(--py, 0) * ${y}px))` });
