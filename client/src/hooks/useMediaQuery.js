import { useSyncExternalStore } from "react";

// Subscribes to a CSS media query so components can switch layout without resize listeners.
export function useMediaQuery(query) {
  const subscribe = (callback) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", callback);
    return () => mq.removeEventListener("change", callback);
  };
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
