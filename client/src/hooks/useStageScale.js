import { useEffect, useState } from "react";

/**
 * useStageScale(designWidth)
 * --------------------------
 * The desktop layout is drawn in a fixed-width design space. This returns a callback ref
 * for the wrapper element and the scale (never above 1) that fits the design to its width.
 * A callback ref (stored in state) is used because the wrapper mounts later than the
 * component itself, after data has loaded; the observer attaches whenever it appears.
 */
export function useStageScale(designWidth) {
  const [element, setElement] = useState(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / designWidth)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, designWidth]);

  return [setElement, scale];
}
