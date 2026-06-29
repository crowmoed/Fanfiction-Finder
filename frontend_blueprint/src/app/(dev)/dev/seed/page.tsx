"use client";

/**
 * /dev/seed — populate the real app with fake data so you can preview it fully
 * (sidebar History/Saved modals, cached result restores, the signed-in account
 * state) with no backend.
 *
 * Everything written here goes through the SAME stores the real app uses
 * (history, results cache, saved searches, fic store) plus a dev-only auth
 * injection — so the preview is faithful, not a mock of the UI.
 */
import { useState } from "react";
import Link from "next/link";

import { DEMO_SEARCHES, DEMO_USER } from "@/lib/demo/fixtures";
import { useAuth } from "@/lib/client/auth";
import { addHistory } from "@/lib/client/history";
import { cacheResults } from "@/lib/results/resultsCache";
import { saveFics } from "@/lib/results/ficStore";
import { saveSearch, unsaveSearch } from "@/lib/results/savedSearches";

function resultsHref(q: string, fandom: string, strict: boolean): string {
  return `/results?${new URLSearchParams({ q, fandom, strict: String(strict) }).toString()}`;
}

export default function SeedPage() {
  const { user, setDevUser } = useAuth();
  const [seeded, setSeeded] = useState(false);

  const seed = () => {
    for (const s of DEMO_SEARCHES) {
      // History entry, restorable cache, and per-fic detail cache.
      addHistory(s.params, s.fics.length);
      cacheResults(s.params, s.fics, s.fics.length, 2600);
      saveFics(s.fics);
      if (s.followed) saveSearch(s.params, s.fics);
    }
    setDevUser(DEMO_USER); // fake signed-in account
    setSeeded(true);
  };

  const clearAll = () => {
    for (const s of DEMO_SEARCHES) unsaveSearch(s.params);
    try {
      localStorage.removeItem("ficfinder.history");
      localStorage.removeItem("ficfinder.results");
      localStorage.removeItem("ficfinder.fics");
      localStorage.removeItem("ficfinder.saved");
    } catch {
      /* ignore */
    }
    setDevUser(null);
    setSeeded(false);
  };

  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <header className="stack" style={{ gap: "0.25rem" }}>
        <h1 style={{ margin: 0 }}>Seed demo data</h1>
        <p className="muted" style={{ margin: 0 }}>
          Populate the real app with {DEMO_SEARCHES.length} fake searches and a
          fake signed-in account, so you can preview the populated UI with no
          backend. Writes to the same local stores the app uses.
        </p>
      </header>

      <div className="row" style={{ gap: "0.75rem" }}>
        <button onClick={seed}>Seed fake searches + account</button>
        <button onClick={clearAll}>Clear all demo data</button>
      </div>

      {seeded && (
        <div className="card stack" style={{ gap: "0.5rem" }}>
          <strong>Seeded ✓</strong>
          <span className="muted">
            Signed in as <strong>{user?.email}</strong> ({user?.tier}). Open the
            app and check the sidebar (Saved / History / Account).
          </span>
          <ul className="stack" style={{ gap: "0.3rem", margin: 0, paddingLeft: "1.2rem" }}>
            {DEMO_SEARCHES.map((s) => (
              <li key={s.params.q}>
                <Link href={resultsHref(s.params.q, s.params.fandom, !!s.params.strict)}>
                  {s.params.q}
                </Link>{" "}
                <span className="muted">
                  · {s.params.fandom} · {s.fics.length} results
                  {s.followed ? " · followed" : ""}
                </span>
              </li>
            ))}
          </ul>
          <div>
            <Link href="/">→ Go to the app</Link>
          </div>
        </div>
      )}

      <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
        Note: the fake account is in-memory (no token) and resets on a full page
        reload; the searches persist in localStorage until you clear them.
      </p>
    </div>
  );
}
