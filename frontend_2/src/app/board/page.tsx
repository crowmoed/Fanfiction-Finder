import type { Metadata } from "next";

import { BoardApp } from "@/components/board/BoardApp";

export const metadata: Metadata = {
  title: "Board · FicFinder",
  description: "A spatial workspace of fanfic search-result tables.",
};

// Chrome-free, full-bleed route (root layout only — no AppShell sidebar). The
// board owns the whole viewport.
export default function BoardPage() {
  return <BoardApp />;
}
