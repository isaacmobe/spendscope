import { useEffect, useState } from "react";

/**
 * useStageFit(designWidth, designHeight)
 * --------------------------------------
 * The desktop console is drawn in a fixed design space. This returns a callback ref for the
 * wrapper element and the scale that makes the whole console fit the window without page
 * scrolling: limited by the wrapper's width and by the height left below the wrapper's top edge.
 * The scale is kept between `min` and `max` so text never becomes unreadably small (below `min`
 * the page simply scrolls a little) or needlessly large on very big screens.
 * A callback ref (kept in state) is used because the wrapper mounts after the data has loaded.
 */
export function useStageFit(designWidth, designHeight, { min = 0.62, max = 1.25, bottomGap = 16 } = {}) {
  const [element, setElement] = useState(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!element) return;
    const measure = () => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      const byWidth = element.clientWidth / designWidth;
      const byHeight = (window.innerHeight - top - bottomGap) / designHeight;
      setScale(Math.min(max, Math.max(min, Math.min(byWidth, byHeight))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [element, designWidth, designHeight, min, max, bottomGap]);

  return [setElement, scale];
}
