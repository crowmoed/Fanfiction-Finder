"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  unsaveSearch,
  useSavedSearches,
} from "@/lib/results/savedSearches";
import { resultsHref } from "@/lib/results/searchUrl";

/** Followed-searches panel (shown in the Saved modal). */
export function SavedPanel({ onNavigate }: { onNavigate?: () => void }) {
  const saved = useSavedSearches();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <p className="muted" style={{ margin: 0 }}>
        Open one to re-run it; new results since your last visit are flagged.
        Stored only in this browser.
      </p>

      {!mounted ? (
        <p className="muted">Loading…</p>
      ) : saved.length === 0 ? (
        <p className="muted">
          No followed searches yet. Run a search and choose “Follow search” to
          track it for new results.
        </p>
      ) : (
        <ul className="stack" style={{ gap: "0.5rem", margin: 0, padding: 0, listStyle: "none" }}>
          {saved.map((s) => (
            <li key={s.key} className="card row" style={{ justifyContent: "space-between" }}>
              <div className="stack" style={{ gap: "0.2rem" }}>
                <Link href={resultsHref(s.params)} onClick={onNavigate}>
                  <strong>{s.params.q}</strong>
                </Link>
                <span className="muted">
                  {s.params.fandom}
                  {s.params.strict ? " · strict" : ""}
                  {" · "}
                  {s.newIds.length > 0 ? (
                    <strong>{s.newIds.length} new since last check</strong>
                  ) : (
                    "no new results"
                  )}
                </span>
              </div>
              <button onClick={() => unsaveSearch(s.params)}>Unfollow</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
