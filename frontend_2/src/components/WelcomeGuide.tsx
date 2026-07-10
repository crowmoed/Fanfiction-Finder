"use client";

/**
 * WelcomeGuide — the how-it-works popup. A user manual page: standard modal
 * head, a 2px grey frame (the composer's --line-strong, via guide.css), and
 * one label/description table with gridlines. No marketing intro.
 *
 * Open state lives in AppShell so the About popup can reopen it on demand.
 * First run: this component asks AppShell to open it (~600ms after mount, so
 * the home choreography lands first) unless `ficfinder.guide` says it was
 * already seen. ANY close path (button, ✕, Esc, backdrop) marks it seen —
 * a dismissal is an answer, never re-ask automatically.
 */
import { useEffect, useRef } from "react";

import { MatchScore } from "@/components/MatchScore";
import { Modal } from "@/components/Modal";
import { readJSON, writeJSON } from "@/lib/client/localStore";
import "./guide.css";

const GUIDE_KEY = "ficfinder.guide";
const GUIDE_VERSION = 1;

function isSeen(value: unknown): value is number {
  return typeof value === "number";
}

export function WelcomeGuide({
  open,
  onOpen,
  onClose,
}: {
  open: boolean;
  /** Called once on first run (never again after any dismissal). */
  onOpen: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (readJSON(GUIDE_KEY, isSeen, 0) >= GUIDE_VERSION) return;
    const t = window.setTimeout(onOpen, 600);
    return () => window.clearTimeout(t);
  }, [onOpen]);

  // Every close path funnels through Modal's onClose, so marking seen here
  // covers the button, ✕, Esc, and backdrop alike.
  const handleClose = () => {
    writeJSON(GUIDE_KEY, GUIDE_VERSION);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="How Ficwell works"
      variant="guide"
      width="500px"
      closeRef={closeRef}
    >
      <table className="guide-table">
        <tbody>
          <tr>
            <th scope="row">Search</th>
            <td>
              Describe the fic you want in the search box. Plain English works:
              &ldquo;enemies to lovers slow burn, complete, no major character
              death.&rdquo;
            </td>
          </tr>
          <tr>
            <th scope="row">Results</th>
            <td>
              Fics come from AO3, FFN, and Wattpad, ranked together in one
              list.
            </td>
          </tr>
          <tr>
            <th scope="row">Match score</th>
            <td>
              <div className="guide-score-cell">
                <span>
                  Each fic is scored 0 to 100 against what you typed. 85 and up
                  gets the red seal.
                </span>
                {/* The actual mark from the results page, as a legend. Static —
                    the stamp motion stays reserved for earned moments. */}
                <span className="guide-seal" aria-hidden>
                  <MatchScore score={92} size="sm" />
                </span>
              </div>
            </td>
          </tr>
          <tr>
            <th scope="row">Saved</th>
            <td>
              Save a search from the results page to follow it. New matches
              show up under Saved.
            </td>
          </tr>
        </tbody>
      </table>

      <button
        type="button"
        className="btn-primary guide-cta"
        // showModal() gives initial focus to the first element carrying the
        // native `autofocus` content attribute — which React's autoFocus prop
        // never renders (it calls .focus() at mount, long before the dialog
        // opens). Without this, focus lands on the ✕.
        ref={(el) => el?.setAttribute("autofocus", "")}
        onClick={() => closeRef.current?.()}
      >
        Got it
      </button>
    </Modal>
  );
}
