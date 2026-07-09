/**
 * relativeTime.ts — short relative-time strings ("2h ago", "3d ago") for
 * History/Saved rows (DESIGN.md · Voice: "dates are relative with absolute on
 * hover", F207). Dependency-free; pairs with a `title` attribute carrying the
 * full absolute datetime so the precise moment is never lost, just backgrounded.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** "just now" / "5m ago" / "3h ago" / "2d ago" / "3w ago" / absolute date beyond that. */
export function relativeTime(at: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - at);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`;
  if (diff < 5 * WEEK) return `${Math.floor(diff / WEEK)}w ago`;
  return new Date(at).toLocaleDateString();
}

/** Absolute datetime for a `title` attribute — full precision on hover. */
export function absoluteDateTime(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
