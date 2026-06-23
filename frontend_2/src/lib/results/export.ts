"use client";

/**
 * export.ts — turn search results into downloadable table files.
 *
 * Formats:
 *   - csv : RFC-4180 comma-separated, quotes/commas/newlines escaped. Opens in
 *           Excel, Sheets, Numbers.
 *   - tsv : tab-separated. Pastes cleanly into a spreadsheet cell grid.
 *
 * Columns come from COLUMNS so the file matches the on-screen table exactly.
 */
import type { Fic } from "@/lib/contracts";
import { COLUMNS } from "@/lib/results/columns";

export type ExportFormat = "csv" | "tsv";

/** RFC-4180 quoting for CSV: wrap in quotes if the field needs it, double inner quotes. */
function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** TSV cell: tabs/newlines can't appear raw, so collapse them to spaces. */
function tsvCell(value: string): string {
  return value.replace(/[\t\r\n]+/g, " ");
}

export function serializeResults(fics: Fic[], format: ExportFormat): string {
  const sep = format === "csv" ? "," : "\t";
  const cell = format === "csv" ? csvCell : tsvCell;
  const header = COLUMNS.map((c) => cell(c.label)).join(sep);
  const rows = fics.map((fic) =>
    COLUMNS.map((c) => cell(c.exportValue(fic))).join(sep)
  );
  return [header, ...rows].join("\r\n");
}

const MIME: Record<ExportFormat, string> = {
  csv: "text/csv;charset=utf-8",
  tsv: "text/tab-separated-values;charset=utf-8",
};

/** Build a timestamped filename like ficfinder-results-2026-06-21.csv. */
export function exportFilename(format: ExportFormat): string {
  const date = new Date().toISOString().slice(0, 10);
  return `ficfinder-results-${date}.${format}`;
}

/** Serialize + trigger a browser download. Prepends a UTF-8 BOM so Excel reads accents. */
export function downloadResults(fics: Fic[], format: ExportFormat): void {
  const body = serializeResults(fics, format);
  const blob = new Blob(["﻿" + body], { type: MIME[format] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportFilename(format);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
