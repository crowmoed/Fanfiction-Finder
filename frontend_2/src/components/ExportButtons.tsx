"use client";

import type { Fic } from "@/lib/contracts";
import { downloadResults } from "@/lib/results/export";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icon";

/** Buttons that export the current results to table files. */
export function ExportButtons({ fics }: { fics: Fic[] }) {
  const disabled = fics.length === 0;
  const toast = useToast();

  const download = (format: "csv" | "tsv") => {
    try {
      downloadResults(fics, format);
      toast(`Exported ${fics.length} result${fics.length === 1 ? "" : "s"} as ${format.toUpperCase()}.`);
    } catch {
      toast("Export failed. Your browser may have blocked the download.", "error");
    }
  };

  return (
    <div className="row" style={{ gap: "0.3rem" }}>
      <span className="muted toolbar-export-label">Export:</span>
      <button className="btn-sm btn-ghost" disabled={disabled} onClick={() => download("csv")}>
        <Icon name="download" size={13} />
        CSV
      </button>
      <button className="btn-sm btn-ghost" disabled={disabled} onClick={() => download("tsv")}>
        <Icon name="download" size={13} />
        TSV
      </button>
    </div>
  );
}
