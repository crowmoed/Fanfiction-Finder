/**
 * timeGroups.ts — bucket recent searches into relative-time sections
 * (Today / This week / Earlier), the claude.ai "recent chats" grouping. Pure and
 * dependency-free; `now` is passed in so it's testable and has no hidden clock
 * dependency. Entries are assumed newest-first (history is), and that order is
 * preserved within each group.
 *
 * Three buckets, not five (REDESIGN-SPEC §6.1) — the ledger left-rule already
 * carries the register's continuity, so the ledger only needs coarse recency,
 * not a five-way calendar breakdown.
 */
import type { HistoryEntry } from "@/lib/client/history";

export interface TimeGroup {
  label: string;
  entries: HistoryEntry[];
}

const DAY_MS = 86_400_000;

export function groupByTime(entries: HistoryEntry[], now: number): TimeGroup[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();

  // Ordered high→low threshold: an entry lands in the first bucket it clears.
  const buckets = [
    { label: "Today", min: t0 },
    { label: "This week", min: t0 - 7 * DAY_MS },
    { label: "Earlier", min: -Infinity },
  ];

  const groups: TimeGroup[] = buckets.map((b) => ({ label: b.label, entries: [] }));
  for (const e of entries) {
    const i = buckets.findIndex((b) => e.at >= b.min);
    groups[i === -1 ? groups.length - 1 : i].entries.push(e);
  }
  return groups.filter((g) => g.entries.length > 0);
}
