/**
 * columns.ts — the single definition of the results table's columns.
 *
 * Both the on-screen table and the file exports (CSV / TSV) derive from this
 * list, so the rendered columns and the exported columns can never drift apart.
 * Each column knows how to pull its value from a Fic, how to render it in the
 * DOM, how to stringify it for a file, and (optionally) how to sort it.
 */
import type { Fic } from "@/lib/contracts";

export interface ColumnDef {
  /** Stable key, also used as the export header. */
  id: string;
  /** Header label shown in the UI. */
  label: string;
  /** Sort comparator; omit to make the column unsortable. */
  sortValue?: (fic: Fic) => string | number | null;
  /** Plain value for file export (already stringified, unquoted). */
  exportValue: (fic: Fic) => string;
  /** Whether the column is numeric (right-aligned in the UI). */
  numeric?: boolean;
}

const tagsJoined = (fic: Fic) => fic.tags.join(", ");

export const COLUMNS: ColumnDef[] = [
  {
    id: "match_score",
    label: "Score",
    numeric: true,
    // null (unranked) sorts to the bottom of a descending sort.
    sortValue: (f) => (f.match_score === null ? -1 : f.match_score),
    exportValue: (f) => (f.match_score === null ? "" : String(f.match_score)),
  },
  {
    id: "title",
    label: "Title",
    sortValue: (f) => f.title.toLowerCase(),
    exportValue: (f) => f.title,
  },
  {
    id: "platform",
    label: "Platform",
    sortValue: (f) => f.platform.toLowerCase(),
    exportValue: (f) => f.platform,
  },
  {
    id: "fandom",
    label: "Fandom",
    sortValue: (f) => (f.fandom ?? "").toLowerCase(),
    exportValue: (f) => f.fandom ?? "",
  },
  {
    id: "word_count",
    label: "Words",
    numeric: true,
    sortValue: (f) => f.word_count ?? -1,
    exportValue: (f) => (f.word_count == null ? "" : String(f.word_count)),
  },
  {
    id: "kudos",
    label: "Kudos",
    numeric: true,
    sortValue: (f) => f.kudos ?? -1,
    exportValue: (f) => (f.kudos == null ? "" : String(f.kudos)),
  },
  {
    id: "hits",
    label: "Hits",
    numeric: true,
    sortValue: (f) => f.hits ?? -1,
    exportValue: (f) => (f.hits == null ? "" : String(f.hits)),
  },
  {
    id: "tags",
    label: "Tags",
    exportValue: tagsJoined,
  },
  {
    id: "summary",
    label: "Summary",
    exportValue: (f) => f.summary ?? "",
  },
  {
    id: "match_reason",
    label: "Why",
    exportValue: (f) => f.match_reason ?? "",
  },
  {
    id: "url",
    label: "Link",
    exportValue: (f) => f.url,
  },
];
