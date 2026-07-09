"use client";

/**
 * /dev/seed — the full demo launcher. "Enter demo mode" flips the app onto fake
 * data end-to-end (search returns fixtures with no backend, a fake fandom list,
 * a fake signed-in account) AND pre-seeds the local stores so History / Saved /
 * cached results are already populated. From there the REAL app is fully usable
 * offline: run a brand-new search and watch fake results stream in, then browse
 * /results, /fic, /history, /saved, the board, and settings.
 *
 * Everything is written through the SAME stores the real app uses, so the
 * preview is faithful, not a mock. "Exit demo mode" clears it all and reloads.
 */
import { useSyncExternalStore } from "react";
import Link from "next/link";

import { DEMO_SEARCHES, DEMO_USER } from "@/lib/demo/fixtures";
import { exitDemoMode, isDemoMode, setDemoMode, subscribeDemoMode } from "@/lib/demo/demoMode";
import { useAuth } from "@/lib/client/auth";
import { addHistory } from "@/lib/client/history";
import { cacheResults } from "@/lib/results/resultsCache";
import { saveFics } from "@/lib/results/ficStore";
import { saveSearch } from "@/lib/results/savedSearches";
import { Icon } from "@/components/Icon";

// Precomputed so the post-seed panel can say exactly what it did, instead of
// leaving the page silent (F209).
const SEEDED_FIC_COUNT = DEMO_SEARCHES.reduce((n, s) => n + s.fics.length, 0);
const SEEDED_FOLLOWED_COUNT = DEMO_SEARCHES.filter((s) => s.followed).length;

function seedStores() {
  for (const s of DEMO_SEARCHES) {
    addHistory(s.params, s.fics.length);
    // Include the fixture's pre-fusion variants: without them every seeded
    // search restores variant-less and the board's "by rewritten prompt" view
    // can only show its unavailable-fallback.
    cacheResults(s.params, s.fics, s.fics.length, 2600, s.variants);
    saveFics(s.fics);
    if (s.followed) saveSearch(s.params, s.fics);
  }
}

export default function SeedPage() {
  const { setDevUser } = useAuth();
  const demoOn = useSyncExternalStore(
    subscribeDemoMode,
    () => isDemoMode(),
    () => false // server snapshot — flag is client-only
  );

  const enter = () => {
    seedStores();
    setDemoMode(true);
    setDevUser(DEMO_USER); // signs in immediately; refresh() keeps it across reloads
  };

  // Hard-reloads back to the launcher (see exitDemoMode) so no stale in-memory
  // store cache survives into the real app.
  const exit = () => exitDemoMode("/dev/seed");

  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <header className="page-head">
        <h1>Demo mode: the whole app on fake data</h1>
        <p className="muted" style={{ margin: 0 }}>
          Turn the real app onto fixtures with no backend: searches return fake
          results, the fandom list and account are fake, and History / Saved /
          cached results come pre-populated. Then just use the app.
        </p>
      </header>

      {demoOn ? (
        <div className="alert" data-tone="info" style={{ gridTemplateColumns: "auto 1fr" }}>
          <Icon name="check" className="icon" />
          <div className="stack" style={{ gap: "0.6rem" }}>
            <p className="alert-title" style={{ margin: 0 }}>
              Demo mode is on
            </p>
            <p style={{ margin: 0 }}>
              Signed in as <strong>{DEMO_USER.email}</strong> ({DEMO_USER.tier}
              ). Seeded {DEMO_SEARCHES.length} searches ({SEEDED_FOLLOWED_COUNT}{" "}
              saved), {SEEDED_FIC_COUNT} fics into the fic store, and the fake
              account above. Open the app and try a brand-new search; it
              streams fake results and populates every surface.
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              {DEMO_SEARCHES.map((s) => (
                <li key={s.params.q}>
                  {s.params.q}
                  <span className="muted"> · {s.fics.length} fics</span>
                  {s.followed && <span className="muted"> · saved</span>}
                </li>
              ))}
            </ul>
            <div className="row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href="/" className="button-link btn-primary">
                Open the app
                <Icon name="arrow-right" />
              </Link>
              <button className="btn btn-danger-ghost" onClick={exit}>
                <Icon name="trash" />
                Exit &amp; clear demo data
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="row" style={{ gap: "0.75rem" }}>
          <button className="btn btn-primary" onClick={enter}>
            Enter demo mode
          </button>
        </div>
      )}

      <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
        Demo mode only works in dev builds (or with{" "}
        <code>NEXT_PUBLIC_ENABLE_DEMOS=1</code>); it can never make a production
        deploy serve fake data. The flag lives in localStorage; the fake account
        is re-applied on every load while it&rsquo;s on.
      </p>
    </div>
  );
}
