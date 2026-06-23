"use client";

/**
 * ResultsTable — results as a sortable, spreadsheet-style ("Excel") data table.
 *
 * Columns come from COLUMNS (shared with the exporter, so screen ↔ file match).
 * Click a sortable header to sort; click again to flip direction. Defaults to
 * Score descending (best matches first), with unranked fics falling to the
 * bottom. Long text columns (Tags, Summary, Why) are clamped to one line — the
 * full text is in the quick-view popup (⤢) and the cell's hover tooltip.
 */
import { useMemo, useState } from "react";
import Link from "next/link";

import type { Fic } from "@/lib/contracts";
import { COLUMNS } from "@/lib/results/columns";
import { ficId } from "@/lib/results/ficId";
import { MatchScore } from "@/components/MatchScore";
import { QuickViewButton } from "@/components/QuickViewButton";
import { Highlight } from "@/components/Highlight";
import { PlatformLink } from "@/components/PlatformLink";

type SortDir = "asc" | "desc";

function fmt(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString();
}

// Fixed column widths so the table reads like a spreadsheet and long-text
// columns truncate predictably. Keyed by COLUMNS id.
const COL_WIDTH: Record<string, string> = {
  match_score: "4.5rem",
  title: "16rem",
  platform: "5rem",
  fandom: "8rem",
  word_count: "5rem",
  kudos: "5rem",
  hits: "5.5rem",
  tags: "12rem",
  summary: "14rem",
  why: "12rem",
  url: "5.5rem",
};

export function ResultsTable({ fics }: { fics: Fic[] }) {
  const [sortId, setSortId] = useState<string>("match_score");
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
      if (av === null) return 1; // nulls last regardless of direction
      if (bv === null) return -1;
      return av < bv ? -1 * factor : 1 * factor;
    });
  }, [fics, sortId, dir]);

  const toggleSort = (id: string) => {
    if (id === sortId) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortId(id);
      setDir("desc");
    }
  };

  const tags = (fic: Fic) => (fic.tags.length ? fic.tags.join(", ") : "—");

  return (
    <div style={{ overflowX: "auto" }}>
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
              return (
                <th
                  key={col.id}
                  scope="col"
                  className={`${sortable ? "sortable" : ""} ${col.numeric ? "xl-num" : ""}`}
                  aria-sort={
                    active ? (dir === "asc" ? "ascending" : "descending") : "none"
                  }
                  onClick={sortable ? () => toggleSort(col.id) : undefined}
                >
                  {col.label}
                  {active ? (dir === "asc" ? " ▲" : " ▼") : sortable ? " ⇅" : ""}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((fic, i) => (
            <tr
              key={`${fic.url}-${i}`}
              className="xl-row-enter"
              // Stagger: ~35ms between rows, capped so big result sets don't drag.
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
            >
              <td className="xl-num">
                <MatchScore score={fic.match_score} />
              </td>
              <td className="xl-truncate" title={fic.title}>
                <Link href={`/fic/${ficId(fic)}`}>
                  <Highlight text={fic.title} />
                </Link>
              </td>
              <td>{fic.platform}</td>
              <td className="xl-truncate" title={fic.fandom ?? undefined}>
                {fic.fandom ?? "—"}
              </td>
              <td className="xl-num">{fmt(fic.word_count)}</td>
              <td className="xl-num">{fmt(fic.kudos)}</td>
              <td className="xl-num">{fmt(fic.hits)}</td>
              <td className="xl-truncate" title={tags(fic)}>
                {fic.tags.length ? <Highlight text={tags(fic)} /> : "—"}
              </td>
              <td className="xl-truncate" title={fic.summary ?? undefined}>
                {fic.summary ? <Highlight text={fic.summary} /> : "—"}
              </td>
              <td className="xl-truncate" title={fic.match_reason ?? undefined}>
                {fic.match_reason ?? "—"}
              </td>
              <td>
                <span className="row" style={{ gap: "0.4rem", flexWrap: "nowrap" }}>
                  <QuickViewButton fic={fic} />
                  <PlatformLink url={fic.url} platform={fic.platform} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
