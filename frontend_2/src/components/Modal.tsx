"use client";

/**
 * Modal — a generic popup built on the native <dialog> element (same pattern as
 * FicModal). Accessible by default: focus trap, Esc to close, inert backdrop.
 * Used for the sidebar panels (Saved / History / Account) so the app feels like
 * a single surface with overlays — no full-page navigations.
 *
 * Exit choreography (F058): every close path (Esc, backdrop click, the ✕
 * button) sets `data-closing` so `.modal[data-closing]` plays its exit keyframe,
 * then `close()` fires after the animation — instead of the native `<dialog>`
 * vanishing instantly. Skipped under prefers-reduced-motion, where close() runs
 * immediately.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/Icon";

const CLOSE_MS = 150; // matches .modal[data-closing] / exit-pop in globals.css

export function Modal({
  open,
  onClose,
  title,
  titleContent,
  variant,
  children,
  width = "560px",
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name (aria-label) always. Rendered as the visible header text
   *  too, unless `titleContent` overrides the visible markup. */
  title: string;
  /** Richer header content (e.g. the fic title + seal) in place of the plain
   *  <strong>{title}</strong>. Optional — most callers just pass `title`. */
  titleContent?: ReactNode;
  /** Surface-specific header treatment. `"fic"` gets a heavier head rule and
   *  a bigger serif title (REDESIGN-SPEC §5.5, styled in fic-detail.css). */
  variant?: "fic";
  children: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // The element focused when the dialog opened, so focus returns there on close
  // (showModal moves focus into the dialog; the browser only restores focus
  // automatically for native invokers, not a React state-driven open).
  const triggerRef = useRef<HTMLElement | null>(null);
  const closingRef = useRef(false);

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
    } else if (!open && dialog.open && !closingRef.current) {
      // Programmatic close (parent flipped `open` without going through our
      // own requestClose, e.g. a route change) — no animation to wait for.
      dialog.close();
    }
  }, [open]);

  // Plays the exit animation (unless reduced motion), then actually closes the
  // native <dialog>. Guarded so rapid double-triggers (Esc + backdrop) only run
  // once.
  const requestClose = () => {
    const dialog = ref.current;
    if (!dialog || !dialog.open || closingRef.current) return;
    closingRef.current = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      dialog.close();
      return;
    }
    dialog.setAttribute("data-closing", "");
    window.setTimeout(() => {
      dialog.close();
    }, CLOSE_MS);
  };

  return (
    <dialog
      ref={ref}
      // Esc fires the native `cancel` event before `close` — intercept it so
      // Esc also gets the exit animation instead of closing instantly.
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      // Fires for every close path once the dialog actually closes. Notify the
      // parent to flip `open`, reset the closing guard, then return focus to
      // whatever opened the dialog.
      onClose={() => {
        ref.current?.removeAttribute("data-closing");
        closingRef.current = false;
        onClose();
        triggerRef.current?.focus();
        triggerRef.current = null;
      }}
      onClick={(e) => {
        // Backdrop click: same animated path as every other close trigger.
        if (e.target === ref.current) requestClose();
      }}
      className="modal"
      data-variant={variant}
      style={{ width: `min(${width}, calc(100% - 2rem))` }}
      aria-label={title}
    >
      <div className="modal-body stack">
        <div className="modal-head">
          {titleContent ?? <strong className="modal-title">{title}</strong>}
          <button className="icon-btn" onClick={requestClose} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
