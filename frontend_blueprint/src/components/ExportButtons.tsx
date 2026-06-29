"use client";

import type { Fic } from "@/lib/contracts";
import { downloadResults } from "@/lib/results/export";

/** Buttons that export the current results to table files. */
export function ExportButtons({ fics }: { fics: Fic[] }) {
  const disabled = fics.length === 0;
  return (
    <div className="row" style={{ gap: "0.5rem" }}>
      <span className="muted">Export:</span>
      <button disabled={disabled} onClick={() => downloadResults(fics, "csv")}>
        CSV
      </button>
      <button disabled={disabled} onClick={() => downloadResults(fics, "tsv")}>
        TSV
      </button>
    </div>
  );
}
