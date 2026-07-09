import type { Metadata } from "next";

import { HistoryPanel } from "@/components/panels/HistoryPanel";

/**
 * /history — the full search-history register (renders in the app shell
 * canvas). The sidebar's Recent list is a shortcut; this is the complete,
 * manageable log. A Server Component wrapper (no hooks) so it can set a
 * per-route <title>; HistoryPanel owns the page head too (REDESIGN-SPEC §6.3)
 * since the folio count needs the live store.
 */
export const metadata: Metadata = { title: "Search history" };

export default function HistoryPage() {
  return <HistoryPanel />;
}
