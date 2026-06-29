"use client";

import { SavedPanel } from "@/components/panels/SavedPanel";

/**
 * /saved — the followed-searches page (renders in the app shell canvas).
 * A real route like /history, not a popup.
 */
export default function SavedPage() {
  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <h1 style={{ margin: 0 }}>Followed searches</h1>
      <SavedPanel />
    </div>
  );
}
