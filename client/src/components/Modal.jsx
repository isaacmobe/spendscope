import { useEffect, useRef, useState } from "react";
import { useToast } from "../context/toast";
import { useReducedMotion } from "../hooks/useReducedMotion";
import HexCard from "./HexCard";
import { IconClose } from "./icons";
import ToastViewport from "./ToastViewport";

/**
 * Modal
 * -----
 * A popup shaped like a tall hexagon, with two back plates for depth, a 3D tilt-in on open
 * and a short fade-out on close. The scrolling area has no visible scrollbar (a soft fade at
 * the edges hints that there is more), so it stays clean.
 * It sits on the native <dialog> element, so the browser still provides the focus trap, the
 * Escape key and screen-reader semantics; we only restyle it.
 * Children render only while open, so forms reset every time it is reopened.
 *   wide:       a wider card for two-column content (Settings)
 *   dismissible: false removes Escape / backdrop / close button (used for the recovery code,
 *                which must be acknowledged)
 */
export default function Modal({ open, onClose, title, subtitle, children, wide = false, dismissible = true }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const [closing, setClosing] = useState(false);
  const reduced = useReducedMotion();
  const { toasts, dismiss } = useToast();

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
    if (!dismissible || closing) return;
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
        <div className={`popup-card ${wide ? "w-[min(94vw,760px)]" : "w-[min(94vw,580px)]"}`}>
          <HexCard>
            <header className="bar-surface flex items-center justify-between gap-4 py-3 pl-12 pr-10">
              <div className="flex items-center gap-3">
                <span className="hexcell anim-pulse-soft h-3 w-3 bg-accent-soft" />
                <div>
                  <h2 id="popup-title" className="text-[13px] font-semibold uppercase tracking-[0.24em]">
                    {title}
                  </h2>
                  {subtitle && <p className="mt-0.5 text-[11px] tracking-wide opacity-65">{subtitle}</p>}
                </div>
              </div>
              {dismissible && (
                <button type="button" onClick={requestClose} aria-label="Close" className="grid h-8 w-8 place-items-center opacity-80 transition hover:rotate-90 hover:opacity-100">
                  <IconClose className="h-5 w-5" />
                </button>
              )}
            </header>
            <div className="no-scrollbar fade-edges max-h-[68vh] overflow-y-auto px-12 py-7">{children}</div>
          </HexCard>
        </div>
      )}
      {/* While a modal is open the rest of the page is inert, so toasts (Undo, errors) are drawn inside it too. */}
      {open && <ToastViewport toasts={toasts} onDismiss={dismiss} />}
    </dialog>
  );
}
