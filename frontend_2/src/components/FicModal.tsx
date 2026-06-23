"use client";

/**
 * FicModal — a small "quick view" button that pops the fic detail in a modal
 * overlay, without navigating away. Reuses FicDetail, so the popup and the full
 * /fic/[id] page render identical content.
 *
 * Built on the native <dialog> element via showModal(): accessible by default —
 * focus is trapped, Esc closes, the backdrop is inert. Skeleton styling only.
 */
import { useEffect, useRef } from "react";

import type { Fic } from "@/lib/contracts";
import { FicDetail } from "@/components/FicDetail";

export function FicModal({
  fic,
  open,
  onClose,
}: {
  fic: Fic;
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // Sync the dialog's open state with React. showModal() (not the `open`
  // attribute) is what gives us the backdrop + focus trap + Esc handling.
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
      // Close when the backdrop (the dialog element itself, outside the inner
      // content box) is clicked.
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      style={{
        maxWidth: "640px",
        width: "calc(100% - 2rem)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: 0,
      }}
    >
      <div style={{ padding: "1.25rem 1.5rem" }}>
        <div className="row" style={{ justifyContent: "flex-end", marginBottom: "0.5rem" }}>
          <button onClick={onClose} aria-label="Close">
            ✕ Close
          </button>
        </div>
        <FicDetail fic={fic} />
      </div>
    </dialog>
  );
}
