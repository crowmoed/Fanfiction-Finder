/**
 * Icon — the app's single icon system (DESIGN.md · Iconography).
 *
 * One stroke-based SVG set: 24×24 viewBox, 1.75 stroke, round caps/joins,
 * `currentColor`. Replaces every unicode glyph (★ ☆ ↺ ⌃ ⋯ ⧉ ⤢ ▲ ▼ ⇅ ✓ ✕ …) so
 * weight/optical size are consistent and there is zero cross-platform tofu risk.
 *
 * Decorative by default (aria-hidden): pair with visible text or put the
 * accessible name on the parent control. Pass `label` only when the icon stands
 * completely alone.
 *
 * Sizing: 16px default; pass `size` for other slots. `.icon-spin` (globals.css)
 * animates the `spinner` icon.
 */

export type IconName =
  | "search"
  | "arrow-right"
  | "arrow-up"
  | "arrow-up-right"
  | "plus"
  | "pen-nib"
  | "star"
  | "star-fill"
  | "pin"
  | "clock"
  | "board"
  | "code"
  | "chevron-down"
  | "chevron-up"
  | "chevron-left"
  | "chevron-right"
  | "check"
  | "x"
  | "copy"
  | "trash"
  | "dots"
  | "sort"
  | "sort-asc"
  | "sort-desc"
  | "expand"
  | "download"
  | "user"
  | "sliders"
  | "book"
  | "book-open"
  | "alert"
  | "info"
  | "spinner"
  | "filter"
  | "table"
  | "cards"
  | "refresh"
  | "grip"
  | "sign-out"
  | "sparkle"
  | "inbox"
  | "menu";

const PATHS: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.6 16.6 21 21" />
    </>
  ),
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  "arrow-up": <path d="M12 19V5M5 12l7-7 7 7" />,
  "arrow-up-right": <path d="M7 17 17 7M8 7h9v9" />,
  plus: <path d="M12 5v14M5 12h14" />,
  // Pen nib: flat top + angled shoulders tapering to the writing point, vent
  // hole above a slit that runs toward the tip. The flat top is load-bearing:
  // a round-domed teardrop reads as a map pin, not a nib.
  "pen-nib": (
    <>
      <path d="M8.75 3.75h6.5l1.05 6.9L12 20.75l-4.3-10.1 1.05-6.9z" />
      <path d="M12 12.75V16.5" />
      <circle cx="12" cy="10.75" r="1.3" />
    </>
  ),
  star: (
    <path d="M12 3.5l2.7 5.5 6 .9-4.35 4.25 1 6.05L12 17.35l-5.35 2.85 1-6.05L3.3 9.9l6-.9L12 3.5z" />
  ),
  "star-fill": (
    <path
      d="M12 3.5l2.7 5.5 6 .9-4.35 4.25 1 6.05L12 17.35l-5.35 2.85 1-6.05L3.3 9.9l6-.9L12 3.5z"
      fill="currentColor"
      stroke="none"
    />
  ),
  pin: (
    <>
      <path d="M9 4h6l-.8 6.2 2.8 2.8H7l2.8-2.8L9 4z" />
      <path d="M12 13v7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2.5" />
    </>
  ),
  board: (
    <>
      <rect x="3" y="4" width="8" height="7" rx="1.5" />
      <rect x="13" y="13" width="8" height="7" rx="1.5" />
      <path d="M11 7.5h5.5v5.5" />
    </>
  ),
  code: <path d="M8 8l-4 4 4 4M16 8l4 4-4 4" />,
  "chevron-down": <path d="M6 9.5l6 6 6-6" />,
  "chevron-up": <path d="M6 14.5l6-6 6 6" />,
  "chevron-left": <path d="M14.5 6l-6 6 6 6" />,
  "chevron-right": <path d="M9.5 6l6 6-6 6" />,
  check: <path d="M5 13l4.2 4.2L19 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9.5 7V4.5h5V7" />
      <path d="M6.5 7l1 13h9l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  dots: (
    <g fill="currentColor" stroke="none">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </g>
  ),
  sort: <path d="M8 9.5 12 5l4 4.5M8 14.5l4 4.5 4-4.5" />,
  "sort-asc": <path d="M12 19V5M6 11l6-6 6 6" />,
  "sort-desc": <path d="M12 5v14M6 13l6 6 6-6" />,
  expand: <path d="M9 21H3v-6M3 21l7.5-7.5M15 3h6v6M21 3l-7.5 7.5" />,
  download: <path d="M12 3.5v11M7 10l5 5 5-5M5 20.5h14" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17.5H7.5A2.5 2.5 0 0 0 5 22V4.5z" />
      <path d="M19 19.5H7.5A2.5 2.5 0 0 0 5 22" />
    </>
  ),
  "book-open": (
    <>
      <path d="M2.5 5.5H9a3 3 0 0 1 3 3V20a3 3 0 0 0-3-3H2.5V5.5z" />
      <path d="M21.5 5.5H15a3 3 0 0 0-3 3V20a3 3 0 0 1 3-3h6.5V5.5z" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 2.5 20h19L12 3.5z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.8" r="0.5" fill="currentColor" />
    </>
  ),
  spinner: <path d="M12 3a9 9 0 0 1 9 9" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  table: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
      <path d="M3 9.5h18M9 9.5V19.5M15 9.5V19.5" />
    </>
  ),
  cards: (
    <>
      <rect x="3" y="3.5" width="18" height="7.5" rx="1.5" />
      <rect x="3" y="13" width="18" height="7.5" rx="1.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v5h-5" />
    </>
  ),
  grip: (
    <g fill="currentColor" stroke="none">
      <circle cx="9" cy="6" r="1.4" />
      <circle cx="15" cy="6" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="18" r="1.4" />
      <circle cx="15" cy="18" r="1.4" />
    </g>
  ),
  "sign-out": (
    <>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  sparkle: (
    <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3zM18.5 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
  ),
  inbox: (
    <>
      <path d="M3.5 13.5 6 5.5h12l2.5 8v5h-17v-5z" />
      <path d="M3.5 13.5H9l1.5 2.5h3l1.5-2.5h5.5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
};

export function Icon({
  name,
  size = 16,
  className,
  label,
}: {
  name: IconName;
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={["icon", name === "spinner" ? "icon-spin" : "", className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
