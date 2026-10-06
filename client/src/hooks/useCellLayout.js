import { useCallback, useEffect, useState } from "react";
import { APP } from "../config/app";

// Saved positions are { cellId: { dx, dy } }: how far each hexagon was dragged from its default spot.
const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(APP.storage.layout) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
};

/**
 * useCellLayout()
 * ---------------
 * Remembers where the user dragged each hexagon, in this browser. Returns the offsets, a setter
 * for one cell, and a reset that puts everything back to the default honeycomb.
 */
export function useCellLayout() {
  const [offsets, setOffsets] = useState(read);

  useEffect(() => {
    try {
      localStorage.setItem(APP.storage.layout, JSON.stringify(offsets));
    } catch {
      /* the layout still applies for this visit */
    }
  }, [offsets]);

  const setOffset = useCallback((id, offset) => setOffsets((prev) => ({ ...prev, [id]: offset })), []);
  const reset = useCallback(() => setOffsets({}), []);
  return { offsets, setOffset, reset, moved: Object.keys(offsets).length > 0 };
}
