"use client";

/**
 * FicModal — "quick view" of a fic's detail in a modal overlay, without
 * navigating away. Renders FicDetail through the shared Modal component, so the
 * popup and the full /fic/[id] page show identical content and the modal gets
 * focus-trap, Esc, backdrop scrim, enter/exit animation, and — importantly —
 * focus-restore-to-trigger for free (rather than re-implementing the <dialog>
 * wiring and dropping focus to <body> on close, as it used to).
 *
 * The header carries the fic's own title + seal (data-variant="fic" gives it
 * the heavier head rule and 1.5rem serif size, REDESIGN-SPEC §5.5) instead of
 * Modal's plain <strong>, and FicDetail's `hideTitle` skips its own masthead
 * title row so the two don't announce the title twice.
 */
import type { Fic } from "@/lib/contracts";
import { Modal } from "@/components/Modal";
import { FicDetail } from "@/components/FicDetail";
import { MatchScore } from "@/components/MatchScore";
import { Highlight } from "@/components/Highlight";
import "./fic-detail.css";

export function FicModal({
  fic,
  open,
  onClose,
}: {
  fic: Fic;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={fic.title}
      variant="fic"
      width="640px"
      titleContent={
        <div className="fic-modal-titlerow">
          <strong className="modal-title">
            <Highlight text={fic.title} />
          </strong>
          <MatchScore
            score={fic.match_score}
            size="lg"
            animate={(fic.match_score ?? 0) >= 60}
          />
        </div>
      }
    >
      <FicDetail fic={fic} hideTitle />
    </Modal>
  );
}
