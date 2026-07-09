import type { Metadata } from "next";

import { SavedPanel } from "@/components/panels/SavedPanel";

/**
 * /saved — the followed-searches register (renders in the app shell canvas).
 * A real route like /history, not a popup. A Server Component wrapper (no hooks
 * of its own) so it can set a per-route <title>; SavedPanel owns the page head
 * too (REDESIGN-SPEC §6.3) since the folio count needs the live store.
 */
export const metadata: Metadata = { title: "Followed searches" };

export default function SavedPage() {
  return <SavedPanel />;
}
