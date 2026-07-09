"use client";

/**
 * QuickViewButton — small button that pops the fic detail in a modal. Self-
 * contained: owns its open state and renders the FicModal. Drop one next to any
 * result (table row or card). The full page is still reachable via the title
 * link → /fic/[id]; this is the in-place quick look.
 */
import { useState } from "react";

import type { Fic } from "@/lib/contracts";
import { FicModal } from "@/components/FicModal";
import { Icon } from "@/components/Icon";

export function QuickViewButton({ fic }: { fic: Fic }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="icon-btn qv-btn"
        onClick={() => setOpen(true)}
        title="Quick view"
        aria-label={`Quick view: ${fic.title}`}
      >
        <Icon name="expand" size={14} />
      </button>
      {open && <FicModal fic={fic} open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
