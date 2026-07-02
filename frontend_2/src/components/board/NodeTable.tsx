"use client";

/**
 * NodeTable — a search result table, rendered to live *inside* a board node.
 *
 * It's the same spreadsheet the /results page uses (same COLUMNS, same `.xl-*`
 * styling, same sort behavior), trimmed for the canvas: no navigate-away Link,
 * no quick-view modal, and a `nowheel` scroll area so scrolling the table
 * doesn't zoom the canvas. The title links out to the source site instead of the
 * in-app fic page, so you never leave the board.
 */
import { useMemo, useState } from "react";

import type { Fic } from "@/lib/contracts";
import { COLUMNS } from "@/lib/results/columns";
import { MatchScore } from "@/components/MatchScore";
import { PlatformLink } from "@/components/PlatformLink";

type SortDir = "asc" | "desc";

// Compact widths tuned for a node (narrower than the full-page table).
const COL_WIDTH: Record<string, string> = {
  match_score: "4.75rem",
  title: "14rem",
  platform: "5rem",
  fandom: "8rem",
  word_count: "5rem",
  kudos: "5rem",
  hits: "5.5rem",
  tags: "12rem",
  summary: "14rem",
  match_reason: "12rem",
  url: "3.75rem",
};

const fmt = (n: number | null | undefined): string => (n == null ? "—" : n.toLocaleString());

export function NodeTable({ fics }: { fics: Fic[] }) {
  const [sortId, setSortId] = useState("match_score");
  const [dir, setDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.id === sortId);
    if (!col?.sortValue) return fics;
    const getter = col.sortValue;
    const factor = dir === "asc" ? 1 : -1;
    return [...fics].sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      if (av === bv) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return av < bv ? -1 * factor : 1 * factor;
    });
  }, [fics, sortId, dir]);

  const toggleSort = (id: string) => {
    if (id === sortId) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortId(id);
      setDir("desc");
    }
  };

  const tagsOf = (fic: Fic) => (fic.tags.length ? fic.tags.join(", ") : "—");

  if (!fics.length) {
    return <div className="bnode__empty">No results in this table.</div>;
  }

  return (
    <div className="bnode__scroll nowheel">
      <table className="xl-table">
        <colgroup>
          {COLUMNS.map((col) => (
            <col key={col.id} style={{ width: COL_WIDTH[col.id] }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {COLUMNS.map((col) => {
              const sortable = Boolean(col.sortValue);
              const active = col.id === sortId;
              const indicator = active ? (dir === "asc" ? " ▲" : " ▼") : sortable ? " ⇅" : "";
              return (
                <th
                  key={col.id}
                  scope="col"
                  className={`${sortable ? "sortable" : ""} ${col.numeric ? "xl-num" : ""}`}
                  aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  {sortable ? (
                    <button
                      type="button"
                      className="xl-sort nodrag"
                      onClick={() => toggleSort(col.id)}
                    >
                      {col.label}
                      {indicator}
                    </button>
                  ) : (
                    <>
                      {col.label}
                      {indicator}
                    </>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((fic, i) => (
            <tr key={`${fic.url}-${i}`}>
              <td className="xl-num">
                <MatchScore score={fic.match_score} />
              </td>
              <td className="xl-truncate" title={fic.title}>
                {fic.title}
              </td>
              <td>{fic.platform}</td>
              <td className="xl-truncate" title={fic.fandom ?? undefined}>
                {fic.fandom ?? "—"}
              </td>
              <td className="xl-num">{fmt(fic.word_count)}</td>
              <td className="xl-num">{fmt(fic.kudos)}</td>
              <td className="xl-num">{fmt(fic.hits)}</td>
              <td className="xl-truncate" title={tagsOf(fic)}>
                {tagsOf(fic)}
              </td>
              <td className="xl-truncate" title={fic.summary ?? undefined}>
                {fic.summary ?? "—"}
              </td>
              <td className="xl-truncate" title={fic.match_reason ?? undefined}>
                {fic.match_reason ?? "—"}
              </td>
              <td>
                <PlatformLink url={fic.url} platform={fic.platform} size={16} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
