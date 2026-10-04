import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * useCountUp(target)
 * ------------------
 * Returns a number that eases from its previous value to `target` over ~700 ms,
 * so totals "roll" when you add earnings. Jumps instantly with reduced motion.
 */
export function useCountUp(target, duration = 700) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    if (reduced) {
      fromRef.current = target;
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    const from = fromRef.current;
    const start = performance.now();
    let id;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const next = from + (target - from) * eased;
      fromRef.current = next;
      setValue(next);
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, duration, reduced]);

  return value;
}
