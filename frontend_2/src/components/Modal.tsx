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
  // The element focused when the dialog opened, so focus returns there on close
  // (showModal moves focus into the dialog; the browser only restores focus
  // automatically for native invokers, not a React state-driven open).
  const triggerRef = useRef<HTMLElement | null>(null);

  // The dialog stays mounted; showModal()/close() (not the `open` attribute) is
  // what gives us the backdrop + focus trap + Esc handling. Mounting it
  // unconditionally is essential — an early `return null` would unmount it before
  // this effect could ever call showModal(), so it would never open.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      triggerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Fires for every close path (Esc, close(), backdrop). Notify the parent
      // to flip `open`, then return focus to whatever opened the dialog.
      onClose={() => {
        onClose();
        triggerRef.current?.focus();
        triggerRef.current = null;
      }}
      onClick={(e) => {
        // Backdrop click: close natively so the onClose path above runs once.
        if (e.target === ref.current) ref.current?.close();
      }}
      className="modal"
      style={{ width: `min(${width}, calc(100% - 2rem))` }}
      aria-label={title}
    >
      <div className="modal-body stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "1.1rem" }}>{title}</strong>
          <button onClick={() => ref.current?.close()} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
