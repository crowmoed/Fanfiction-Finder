"use client";

/**
 * Modal — a generic popup built on the native <dialog> element (same pattern as
 * FicModal). Accessible by default: focus trap, Esc to close, inert backdrop.
 * Used for the sidebar panels (Saved / History / Account) so the app feels like
 * a single surface with overlays — no full-page navigations.
 */
import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "560px",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="modal"
      style={{ width: `min(${width}, calc(100% - 2rem))` }}
    >
      <div className="modal-body stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "1.1rem" }}>{title}</strong>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
