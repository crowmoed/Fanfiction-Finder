"use client";

/**
 * ResultsTable — the ONE canonical results table.
 *
 * The same object renders results everywhere: the full-page Table view AND every
 * slice inside the board view. `compact` is the only difference — it tightens the
 * column widths and turns the wrapper into a `nowheel`, height-capped scroll area
 * so the table lives happily inside a draggable board node without hijacking the
 * canvas's wheel-to-zoom. Behaviour (columns, sort, row → /fic/[id], quick view,
 * summary expand) is identical in both, so the two can never drift apart again.
 *
 * Columns come from COLUMNS (shared with the exporter, so screen ↔ file match).
 * Click a sortable header to sort; click again to flip. Defaults to Score desc,
 * unranked fics last. Summaries clamp to two lines with a per-row more/less.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import type { Fic } from "@/lib/contracts";
import { COLUMNS } from "@/lib/results/columns";
import { ficId } from "@/lib/results/ficId";
import { MatchScore } from "@/components/MatchScore";
import { QuickViewButton } from "@/components/QuickViewButton";
import { Highlight } from "@/components/Highlight";
import { PlatformLink } from "@/components/PlatformLink";
import { PlatformLogo } from "@/components/PlatformLogo";
import { Icon } from "@/components/Icon";

type SortDir = "asc" | "desc";

function fmt(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString();
}

// Two width maps for the two contexts. Full-page reads like a spreadsheet;
// compact is tuned to fit inside a board node (which then scrolls horizontally).
// Full-page widths are sized for the wide 1160px content column (.page-wide,
// F046/F120) — the seal column can be narrow now that it renders `compact`
// (no "/100" denominator, F121), freeing width for Title/Tags/Summary.
const COL_WIDTH_PAGE: Record<string, string> = {
  // Widened from 3.75rem so the seal chip never clips (REDESIGN-SPEC §3.4) —
  // "100" (high tier, vermilion fill) is the widest a compact seal ever gets.
  match_score: "4.25rem",
  title: "17rem",
  platform: "6rem",
  fandom: "8rem",
  word_count: "5rem",
  kudos: "5rem",
  hits: "5.5rem",
  tags: "13rem",
  summary: "18rem",
  url: "6rem",
};
// Compact drops the low-value columns (Fandom is usually constant within a
// search; Hits tracks Kudos; Platform is shown by the link favicon and usually
// by the slice header) so Title / Tags / Summary — the stuff you actually
// read — ALL fit at 100% zoom with no horizontal scrolling. The widths below
// sum to 60rem = 960px, leaving ~20px of the board node's 980px content width
// (board.css `.bnode`) for the scroll area's reserved scrollbar gutter
// (`.rt-scroll--compact`) — classic Windows scrollbars are ~17px and would
// otherwise force a 17px horizontal scroll on every tall slice.
const COMPACT_HIDDEN = new Set(["fandom", "hits", "platform"]);
const COL_WIDTH_COMPACT: Record<string, string> = {
  match_score: "4.75rem",
  title: "14rem",
  word_count: "5rem",
  kudos: "5rem",
  tags: "10rem",
  summary: "16.25rem",
  url: "5rem",
};

/** Summaries longer than this clamp to two lines with a more/less toggle; shorter
 *  ones render whole. A character threshold keeps rendering deterministic/SSR-safe. */
const SUMMARY_CLAMP_AT = 140;

function SummaryCell({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > SUMMARY_CLAMP_AT;
  return (
    <div className="rt-sum-wrap">
      <div className={`rt-sum${open || !long ? " is-open" : ""}`}>
        <Highlight text={text} />
      </div>
      {long && (
        <button
          type="button"
          className="rt-sum__more nodrag"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "less" : "more"}
        </button>
      )}
    </div>
  );
}

export function ResultsTable({
  fics,
  compact = false,
  stampFicId = null,
}: {
  fics: Fic[];
  compact?: boolean;
  /** The one fic (by ficId) whose seal should stamp-in on mount — the FIRST
   *  high-tier seal of a fresh result set, computed once by ResultsView
   *  (REDESIGN-SPEC §1.5/§3.4). null everywhere else, including every board
   *  slice (compact) — board renders this table via components/board/*, which
   *  doesn't thread the id through, so board tables never stamp. */
  stampFicId?: string | null;
}) {
  const [sortId, setSortId] = useState<string>("match_score");
  const [dir, setDir] = useState<SortDir>("desc");

  const columns = useMemo(() => {
    let cols = COLUMNS;
    if (compact) cols = cols.filter((c) => !COMPACT_HIDDEN.has(c.id));
    return cols;
  }, [compact]);
  // Body cells must match the header/colgroup set exactly.
  const has = (id: string) => columns.some((c) => c.id === id);

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

  // Which fics have already played their entrance. React physically reinserts a
  // <tr> when its row moves on re-sort, which restarts the row's CSS
  // enter-animation AND re-pops its match seal (verified in the motion audit) —
  // both would break the ONE-STAMP RULE (the seal is a single, earned moment,
  // not something re-earned by sorting a column). Gate the entrance + stamp on
  // "not yet seen"; the set starts empty on mount and ResultsView re-keys this
  // whole table per search, so a genuinely fresh result set gets a fresh set.
  const entered = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const fic of sorted) entered.current.add(ficId(fic));
  });

  const tags = (fic: Fic) => (fic.tags.length ? fic.tags.join(", ") : "—");
  const widths = compact ? COL_WIDTH_COMPACT : COL_WIDTH_PAGE;

  if (!fics.length) {
    return <div className="rt-empty">No results here.</div>;
  }

  return (
    <div className={compact ? "rt-scroll rt-scroll--compact nowheel" : "rt-scroll"}>
      <table className="xl-table">
        <colgroup>
          {columns.map((col) => (
            <col key={col.id} style={{ width: widths[col.id] }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col) => {
              const sortable = Boolean(col.sortValue);
              const active = col.id === sortId;
              const iconName = active
                ? dir === "asc"
                  ? "sort-asc"
                  : "sort-desc"
                : "sort";
              return (
                <th
                  key={col.id}
                  scope="col"
                  className={`${sortable ? "sortable" : ""} ${col.numeric ? "xl-num" : ""}`}
                  aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  {sortable ? (
                    // A real <button> so the column is sortable by keyboard, not
                    // just mouse. `nodrag` keeps a header click from starting a
                    // board-node drag. aria-sort stays on the <th>.
                    <button
                      type="button"
                      className="xl-sort nodrag"
                      onClick={() => toggleSort(col.id)}
                    >
                      {col.label}
                      <Icon name={iconName} size={12} />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((fic, i) => {
            const id = ficId(fic);
            // First paint of this row in this result set? Only then does it get
            // the staggered rise and (if it's the chosen one) the seal stamp.
            // Re-sorts/filters keep .xl-row-enter for its content-visibility
            // perf hint but add .xl-row-entered to null the animation, so no
            // replay. (Reduced-motion already zeroes the animation globally.)
            const fresh = !entered.current.has(id);
            return (
            <tr
              // Stable per-fic key (NOT the post-sort index): re-sorting must not
              // remount rows, or per-row state (the summary more/less toggle)
              // would reset on every sort.
              key={id}
              className={`xl-row-enter${fresh ? "" : " xl-row-entered"}`}
              // Stagger: ~35ms between rows, capped so big result sets don't drag.
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
            >
              <td className="xl-num">
                <MatchScore score={fic.match_score} compact animate={fresh && id === stampFicId} />
              </td>
              <td className="xl-truncate" title={fic.title}>
                {/* Quick-view (expand) leads the Title cell so it's immediately
                    visible — it used to sit in the right-most Link column, which
                    scrolls off-screen on the wide full-page table. */}
                <span className="rt-title">
                  <QuickViewButton fic={fic} />
                  <Link href={`/fic/${ficId(fic)}`} className="title-link">
                    <Highlight text={fic.title} />
                  </Link>
                </span>
              </td>
              {has("platform") && (
                <td>
                  <span className="row" style={{ gap: "0.35rem", flexWrap: "nowrap" }}>
                    <PlatformLogo platform={fic.platform} size={14} decorative />
                    {fic.platform}
                  </span>
                </td>
              )}
              {has("fandom") && (
                <td className="xl-truncate" title={fic.fandom ?? undefined}>
                  {fic.fandom ?? <span className="null-dash">—</span>}
                </td>
              )}
              {has("word_count") && (
                <td className="xl-num">
                  {fic.word_count == null ? (
                    <span className="null-dash">—</span>
                  ) : (
                    fmt(fic.word_count)
                  )}
                </td>
              )}
              {has("kudos") && (
                <td className="xl-num">
                  {fic.kudos == null ? <span className="null-dash">—</span> : fmt(fic.kudos)}
                </td>
              )}
              {has("hits") && (
                <td className="xl-num">
                  {fic.hits == null ? <span className="null-dash">—</span> : fmt(fic.hits)}
                </td>
              )}
              <td className="xl-truncate" title={tags(fic)}>
                {fic.tags.length ? (
                  <Highlight text={tags(fic)} />
                ) : (
                  <span className="null-dash">—</span>
                )}
              </td>
              <td className="rt-sum-cell">
                {fic.summary ? (
                  <SummaryCell text={fic.summary} />
                ) : (
                  <span className="null-dash">—</span>
                )}
              </td>
              <td>
                <PlatformLink url={fic.url} platform={fic.platform} />
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
