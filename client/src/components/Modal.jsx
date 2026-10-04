import { useEffect, useRef } from "react";

/**
 * Modal
 * -----
 * Built on the native <dialog> element: the browser provides the focus trap, the Escape
 * key, the backdrop and screen-reader semantics, so we write almost no code for them.
 * Children are only rendered while open, so forms reset every time it is reopened.
 */
export default function Modal({ open, onClose, title, subtitle, children }) {
  const ref = useRef(null);

  // Keep the dialog's real open state in sync with the `open` prop.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // A click on the dialog element itself (not its content) means the backdrop was clicked.
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className="m-auto max-h-[90vh] w-[min(94vw,540px)] overflow-hidden border border-ink bg-paper-light p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="flex max-h-[90vh] flex-col">
          <header className="flex items-start justify-between gap-4 bg-ink px-5 py-3 text-paper-light">
            <div>
              <h2 id="modal-title" className="text-sm font-semibold uppercase tracking-[0.2em]">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 text-xs text-paper-light/70">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 px-2 text-xl leading-none text-paper-light/80 hover:text-white"
            >
              &times;
            </button>
          </header>
          <div className="overflow-y-auto p-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
