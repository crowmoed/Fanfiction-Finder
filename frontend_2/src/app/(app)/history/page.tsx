"use client";

import { HistoryPanel } from "@/components/panels/HistoryPanel";

/**
 * /history — the full search-history page (renders in the app shell canvas).
 * The sidebar's Recent list is a shortcut; this is the complete, manageable log.
 */
export default function HistoryPage() {
  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <h1 style={{ margin: 0 }}>Search history</h1>
      <HistoryPanel />
    </div>
  );
}
