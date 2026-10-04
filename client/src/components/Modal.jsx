import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import HexCard from "./HexCard";
import { IconClose } from "./icons";

/**
 * Modal
 * -----
 * A popup shaped like a tall hexagon, with two back plates for depth, a 3D tilt-in on open
 * and a short fade-out on close.
 * It sits on the native <dialog> element, so the browser still provides the focus trap, the
 * Escape key and screen-reader semantics; we only restyle it.
 * Children render only while open, so forms reset every time it is reopened.
 */
export default function Modal({ open, onClose, title, subtitle, children }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const [closing, setClosing] = useState(false);
  const reduced = useReducedMotion();

  // Keep the dialog's real open state in sync with the `open` prop.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Play the closing animation, then tell the parent to close.
  const requestClose = () => {
    if (closing) return;
    if (reduced) return onClose();
    setClosing(true);
    timer.current = setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  };

  return (
    <dialog
      ref={ref}
      className="popup"
      data-closing={closing}
      aria-labelledby="popup-title"
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      // A click on the dialog itself (its transparent padding), not the card, means the backdrop.
      onClick={(e) => e.target === ref.current && requestClose()}
    >
      {open && (
        <div className="popup-card w-[min(92vw,580px)]">
          <HexCard>
            <header className="flex items-center justify-between gap-4 bg-gradient-to-b from-[#3d3d46] to-[#25252b] py-3 pl-12 pr-10 text-cream-light">
              <div className="flex items-center gap-3">
                <span className="hexcell anim-pulse-soft h-3 w-3 bg-accent-soft" />
                <div>
                  <h2 id="popup-title" className="text-[13px] font-semibold uppercase tracking-[0.24em]">
                    {title}
                  </h2>
                  {subtitle && <p className="mt-0.5 text-[11px] tracking-wide text-cream-light/65">{subtitle}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center text-cream-light/80 transition hover:rotate-90 hover:text-white"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </header>
            <div className="soft-scroll max-h-[64vh] overflow-y-auto px-12 py-6">{children}</div>
          </HexCard>
        </div>
      )}
    </dialog>
  );
}
