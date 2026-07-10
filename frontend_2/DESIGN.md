# Ficwell — Design System

The locked visual system for `frontend_2/`. Implemented in `src/app/globals.css`
(tokens + shared components) plus per-surface stylesheets that layer on top of
it: `src/components/results.css` (/results), `src/components/panels/register.css`
(Saved/History), `src/components/fic-detail.css` (fic page/modal),
`src/components/board/board.css` (board), `src/components/sidebar/sidebar.css`
(sidebar). Every color/space/radius/type decision in the app maps to a token
defined here. The old skeleton vars (`--bg`, `--fg`, `--border`, `--muted`)
remain as aliases so nothing un-migrated breaks.

## Theme

**"Ficwell Ink."** — black ink on white paper, one vermilion seal. A well-run print
shop for fanfiction cravings: warm-white paper surfaces, decisive sumi hairlines,
serif for fiction, sans for the tool, and vermilion spent almost exclusively on the
match-score seal and moments of commitment. Light theme ships; tokens are
dark-swappable by redefining `:root`.

Scene sentence: a reader at midnight with a very specific craving, triaging forty
fics in a table — the room is dim but the *page* is paper, because you read fic the
way you read a book.

**Second Impression pass (2026-07-07).** The first ship (2026-07-05) was
disciplined but timid — display type barely stood out from body text, the match
seal read smaller than its surrounding chrome, /results had no visible headline,
Saved/History were cards floating in a void, and the board canvas leaked
react-flow's stock slate-gray dots. This pass keeps every locked token and role
from the original system and adds the conviction: a display-only third typeface
for headlines, a governed rule hierarchy, eyebrow labels on a strict budget
(not "one per section"), and ledger/register layouts for lists. Print furniture
as *structure*, never ornament — see Component language and Layout below for
what changed concretely.

## Color (OKLCH; hex approximations for reference)

| Token | Value | ~Hex | Role |
|---|---|---|---|
| `--paper` | `oklch(0.985 0.003 85)` | `#fbfaf7` | page background |
| `--paper-2` | `oklch(0.958 0.006 85)` | `#f2efe8` | sidebar, panels, second neutral layer |
| `--paper-3` | `oklch(0.93 0.007 85)` | `#e8e4da` | hover fills on paper-2, table header |
| `--surface` | `#ffffff` | | cards, nodes, menus, modal, composer |
| `--ink` | `oklch(0.28 0.01 80)` | `#302c26` | body text |
| `--ink-strong` | `oklch(0.235 0.01 80)` | `#25211c` | headings, display type, primary button fill |
| `--ink-mute` | `oklch(0.455 0.012 80)` | `#5e574d` | secondary text (≥4.5:1 everywhere) |
| `--ink-faint` | `oklch(0.52 0.01 80)` | `#6f6960` | tertiary/disabled-adjacent text, eyebrow color |
| `--line` | `oklch(0.905 0.007 85)` | `#e1ddd2` | decorative separators, card borders |
| `--line-mid` | `oklch(0.845 0.008 85)` | `#cdc8bc` | table gridlines |
| `--line-strong` | `oklch(0.63 0.01 85)` | `#8f897e` | input/composer boundaries (≥3:1, F004) |
| `--accent` | `oklch(0.545 0.185 29)` | `#c03d2b` | vermilion seal: score-high, stamps, active marks, focus |
| `--accent-strong` | `oklch(0.47 0.17 29)` | `#9c2f1f` | accent hover/pressed |
| `--accent-wash` | `color-mix(accent 10%, white)` | | selection tints, highlight, seal backgrounds, avatar ring |
| `--ok` | `oklch(0.5 0.11 152)` | | success (complete, saved toasts) |
| `--warn` | `oklch(0.51 0.11 75)` | | warning (degraded states) |
| `--danger` | `oklch(0.49 0.175 28)` | | destructive actions/errors |
| `--danger-strong` | `color-mix(in oklab, var(--danger) 70%, black)` | | error-toast fill: deep enough that white text clears AA (replaces the old bespoke `oklch(0.35 0.13 28)`) |
| `--tone-ao3` | `oklch(0.43 0.13 18)` | `#8b2f33` | AO3 platform tone (deep maroon ≠ vermilion) |
| `--tone-ffn` | `oklch(0.47 0.09 262)` | `#4c5a90` | FFN platform tone |
| `--tone-wattpad` | `oklch(0.5 0.115 60)` | `#95591b` | Wattpad platform tone (AA as small text) |

Rules: semantic states always pair color with a shape/icon/text cue (F005). Error
red is `--danger`/`--danger-strong`; AO3 tone is visibly deeper/browner — the
platform-vs-danger collision (F013) is resolved by hue distance and by badges vs.
fills. Match highlight `mark.hl` = `--accent-wash` background, ink text
(F017/F137). One sanctioned exception to "every color is a token": the external
platforms' own brand colors inside `PlatformLogo`'s lettermark-fallback SVG (AO3
`#990000`, FFN `#2b3a67`, Wattpad `#ff6122`). Those are another brand's identity
baked into an image, like a favicon — they must never swap with a Ficwell theme,
so they deliberately stay literal.

## Typography

Three voices now — the reading pair from the first pass, plus a display-only
third face added in the Second Impression:

| Voice | Family | Used for |
|---|---|---|
| Tool (sans) | **Source Sans 3** (`--font-sans`) | chrome, labels, buttons, tables, metadata, eyebrows |
| Fiction (serif) | **Source Serif 4** (`--font-serif`) | fic titles, summaries, prose, composer input |
| Display (serif, display-only) | **Fraunces** (`--font-display`), variable, axes `opsz`/`SOFT`/`WONK` | home headline, results query headline, fic/page titles, wordmark |

Loaded via `next/font/google` (variable, `display: swap`) in `src/app/layout.tsx`.
Fraunces loads with `axes: ["opsz", "SOFT", "WONK"]` so the utility classes below
can dial each headline's optical size, softness, and "wonk" (ink-trap flourish)
independently per surface.

**HARD RULE: never set numerals in Fraunces.** Its digits are non-uniform width
and carry no `tnum` feature — any number that sits next to or inside a display
headline stays Source Sans 3 tabular. This is why the match seal's number lives
in its own `.seal-num` span (sans, tabular) even when the seal is anchored beside
a `.t-display-title`, and why folio counts (`{n} fics · {t}s`) are plain
`.eyebrow`/sans text, never absorbed into the display headline itself.

### Display type recipes

| Class | Use | `font-variation-settings` | weight | size | line-height | letter-spacing |
|---|---|---|---|---|---|---|
| `.t-display-hero` | home headline ("Name your craving.") | `'opsz' 144, 'SOFT' 0, 'WONK' 1` | 560 | `clamp(2.75rem, 2.1rem + 5vw, 7.5rem)` | 1.05 | -0.015em |
| `.t-display-quote` | /results query headline | `'opsz' 144, 'SOFT' 0, 'WONK' 1` | 500 | `clamp(1.625rem, 1.3rem + 1.8vw, 2.75rem)` | 1.15 | -0.012em |
| `.t-display-title` | fic title h1, Saved/History page h1s, modal fic title | `'opsz' 90, 'SOFT' 0, 'WONK' 0` | 580 | `clamp(2rem, 1.6rem + 2.2vw, 3.5rem)`; `.t-display-title--page` variant: `clamp(1.75rem, 1.5rem + 1vw, 2.25rem)` | 1.2 | -0.01em |
| `.t-wordmark` | sidebar + board-loader wordmark | `'opsz' 40, 'SOFT' 15, 'WONK' 1` | 620 | 1 (size inherited from each wordmark slot) | -0.005em |

All four classes also set `font-family: var(--font-display); color: var(--ink-strong); text-wrap: balance;`.

### The eyebrow label system — the ONLY all-caps, on a strict budget

```css
.eyebrow {
  font-family: var(--font-sans);
  font-size: 0.6875rem;   /* 11px */
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-faint);
  line-height: 1.5;
}
```

PRODUCT.md's anti-references literally name "eyebrow labels on every section" as
a tell to reject, so the budget is enforced, not just declared:

**Eyebrow appears ONLY as:**
1. Page-head kicker + folio line (max ONE kicker per page): home, /results,
   /saved, /history.
2. Sidebar group labels (Today / This week / Earlier).
3. Ledger column headers: results-table `thead` and the fic-page stats ledger's
   label column — the same "ledger furniture" role in both places.

**Explicitly NOT eyebrows** (600-weight sans at `--text-sm` + hairline separation
instead): refine facet-group headers, board slice headers, the demo ribbon,
SettingsModal section labels, dev-bar labels, empty states, any button or chip.
Never on sentences or titles.

### Rule hierarchy

- `--line` (1px) — quiet separators inside components, unchanged from the first
  pass.
- `.rule-strong` — `border-top: 2px solid var(--ink-strong)`: the masthead rule.
  Used ONLY under the page-header block on /results, /saved, /history, and under
  the fic-detail masthead. Nowhere else.

### Scale, measure, numerals (unchanged from the first pass)

Scale (rem, ~1.2 ratio, fixed — product register): `--text-xs 0.75` ·
`--text-sm 0.8125` · `--text-md 0.875` (UI default) · `--text-body 1` ·
`--text-lg 1.1875` · `--text-xl 1.375` · `--text-2xl 1.625` (legacy h1/h2 scale,
still used outside the display system, e.g. `<h1>`/`<h2>` base elements).
Line-height: UI 1.45, prose 1.6, headings 1.25. `text-wrap: balance` on
h1–h3 and all display classes, `pretty` on prose (F029). Numbers in
stats/tables/scores/folios are always `font-variant-numeric: tabular-nums`
(F027) — this applies everywhere, including right beside Fraunces headlines.
Prose measure ≤ 70ch general (F025); the fic summary block tightens to a 65ch
floor specifically (`--maxw` surfaces stay 68ch). Links: no default underline;
underline on hover/focus; fic-title links are serif ink that underline on hover
(F024).

## Space, radius, elevation, z

- **Space** (4px grid): `--sp-1 0.25rem` … `--sp-2 0.5` `--sp-3 0.75` `--sp-4 1`
  `--sp-5 1.25` `--sp-6 1.5` `--sp-8 2` `--sp-10 2.5` `--sp-12 3` (F041).
- **Radius**: `--r-xs 4px` (marks/chips) · `--r-sm 6px` (buttons, inputs) ·
  `--r-md 10px` (cards, menus) · `--r-lg 14px` (composer, modal, refine sheet) ·
  `--r-pill 999px` (F042). Print-shop corners: crisp, never blobby.
- **Elevation** (warm ink shadows): `--shadow-1` contact · `--shadow-2` raised
  card · `--shadow-3` menu/popover/lifted board slice · `--shadow-4` modal/sheet.
  `--shadow-composer` (`--shadow-1` + a tight under-edge) is the composer's own
  grounded look. Border + shadow pair at every level.
- **Z scale**: `--z-sidebar 10` · `--z-workspace 20` · `--z-scrim 24` ·
  `--z-popover 25` · `--z-float 30` · `--z-skip 100` · `--z-toast 200`.

## Motion

Product register: 120–260ms, `--ease-out cubic-bezier(0.16,1,0.3,1)`,
`--ease-out-strong cubic-bezier(0.23,1,0.32,1)`, `--ease-drawer
cubic-bezier(0.32,0.72,0,1)` (sidebar/workspace, unchanged). Entrances rise ≤8px;
exits exist wherever entrances do (modal, menu, toast, refine sheet —
F058/F059). Press travel (`translateY(1px)` / `scale(0.94–0.97)`) on every
button. Full `prefers-reduced-motion` coverage, including press transforms
(F065).

**`.rise-in`** — the staggerable entrance added for the Second Impression pass:
`opacity 0→1` + `translateY(8px)→0`, 260ms `--ease-out-strong`, with a
`--rise-delay` custom property (set inline per element) for staggering a
sequence. Reduced-motion collapses to opacity-only.

**Home load choreography** (`(app)/page.tsx`, once per mount): kicker +
headline rise in at 0ms; the composer follows at `--rise-delay: 120ms`; the
"Try a craving" label and chip row stagger in from 200ms (chips at
`240ms + i*40ms` each). No stamp animation plays on page load — the seal's
motion is reserved for earned moments (see below).

**The ONE-stamp rule.** The stamp (`.stamp-in`: scale 1.25→0.96→1 settle,
260ms) is the single expressive motion in the product, and it stays singular:
- Saving/following a search pops the seal-adjacent UI in with the stamp.
- On the fic detail page and the fic quick-view modal, the match seal plays
  `.stamp-in` on mount whenever `score >= 60` (`MatchScore`'s `animate` prop).
- On /results, only the **first** high-tier seal of a fresh (non-cached) result
  set animates — never a dozen synchronized pops. A cached/repeat view doesn't
  replay it.
- The board loader reuses the same motif: the hanko stamps in once above the
  status line.

Reduced-motion drops the transform on all of the above; the state still
communicates (opacity/instant).

**Bottom sheet** (refine panel at ≤720px): enters with `translateY(100%)→0`
over `--t-slow` (`--ease-drawer`); the scrim fades in over `--t-fast`. Closing
plays the mirrored exit (`sheet-out`: slides down + fades) before unmount.
Reduced-motion drops both to instant show/hide.

Everything else is unchanged from the first pass: **one busy motif per view**
(the working indicator is always an ink/vermilion line — baseline rule sweep,
pipeline bar, board loader fill track — never a generic rotating ring, and
never two busy indicators side by side); menus exit the way they enter
(`@starting-style` where supported, instant fallback elsewhere).

## Iconography & brand

- `src/components/Icon.tsx` — single stroke-based SVG set (16/18px, 1.75 stroke,
  round caps) replacing every unicode glyph (F075/F080/F086…). No tofu. The
  Second Impression pass added `pen-nib` for the sidebar's New search CTA.
- **Hanko mark** (`src/components/HankoMark.tsx`): a CARVED seal, not a colored
  square — hand-irregular vermilion squircle with a knife-cut chip on its left
  edge, a carved paper keyline frame, and a drawn slab-serif "F" (vector paths,
  no `<text>`, so it renders identically everywhere). In-app the `.hanko`
  wrapper applies the -4° stamp tilt; the favicon (`src/app/icon.svg`) sits
  straight — crispness beats gesture at 16px.
- **The hanko is ceremonial, not ambient.** It appears ONLY at three fixed
  locations — the sidebar wordmark lockup, the board loader, and the favicon —
  plus the stamp *motion* on save/follow and the one seal mount described
  above. There is deliberately no hanko in empty states, the demo ribbon, or
  the home hero: a mark that only shows up at earned moments reads as
  ceremony; scattering it anywhere else would turn it into wallpaper. (The
  home hero's brand presence comes entirely from the sidebar lockup — the
  headline itself carries no stamp.)
- Wordmark "Ficwell" now renders in `.t-wordmark` (Fraunces, `opsz 40 / SOFT 15
  / WONK 1`, weight 620) wherever it appears standalone — sidebar and board
  loader.
- Platform badges keep real favicons inside neutral pills; lettermark
  fallback.

## Component language (the shared vocabulary)

- **Buttons**: `.btn` secondary (surface + line border), `.btn-primary` (ink
  fill, white text), `.btn-danger` (vermilion fill), `.btn-ghost` (borderless),
  `.btn-danger-ghost`. All have hover fill/darken, `:active` travel, explicit
  disabled colors (no 0.5-opacity wash — one convention, F062), and focus ring.
  Control height floor: every unclassed `<button>` and `.btn` variant is
  `min-height: 2rem` (~32px) so toolbar controls clear a real hit-target size;
  `.btn-sm` matches that floor explicitly. `.btn-lg` (`min-height: 2.75rem`,
  `padding: 0.65rem 1.25rem`, `font-size: 1rem`) is a heavier variant reserved
  for the fic-page and modal Read CTA only — nowhere else. On coarse pointers
  (`@media (pointer: coarse)`), `.chip`, `.seg-btn`, and `.btn-sm` all raise to
  `min-height: 2.5rem`, and `.icon-btn` grows to 2.5rem square.
- **Hero composer ("Slip")**: the home search bar keeps the Baseline structure
  (serif input, rising controls, breathing rule) but sits on a white
  `--surface` card — hairline `--line` border, `--r-md` top corners only,
  `--shadow-composer` — whose **bottom edge is the baseline rule itself**
  (full-bleed, no border-bottom). The rule keeps both of its jobs: the ink
  focus sweep on `:focus-within` and the vermilion working sweep while busy
  now run the card's full bottom edge. Focus/busy also nudges the card
  (border `--line` → `--line-mid`, shadow → `--shadow-2`); control hover
  pills tint `--paper-2` against the white fill. Chosen from the
  `public/dev/baseline-backgrounds.html` exploration (08 "Slip"); the boxed
  composer on /results is unchanged.
- **Seal (MatchScore)** — three real scale steps, not one shape reused
  everywhere:
  - `size="sm"` (table cells, via the `compact` back-compat alias): compact
    chip, tabular number, no "/100".
  - `size="md"` (cards, the default): number at 1rem/650, keeps a small "/100"
    denominator.
  - `size="lg"` (fic page + modal): 1.5rem/700 tabular number with a
    small-caps "match" caption inside the chip, minimum 44px tall so it never
    renders smaller than its surrounding chrome.
  Tiers: ≥85 = vermilion filled stamp ("high"); 60–84 = ink-bordered outline
  ("mid"); <60 = plain faint number ("low"). Shape + weight + color carry the
  tier, never color alone (F001/F071/F121/F141). **Unranked on detail
  surfaces** (`size="lg"`) is a bordered chip reading "Unranked" in
  `--ink-mute`, at the same 44px footprint as a ranked seal — never a lonely
  dash. In tables/cards the unranked state stays the plain faint "—". The
  seal's number always lives in `.seal-num` (sans, tabular) so it's honest
  about being data even beside a Fraunces headline. The score is the ONLY
  match signal the product shows: the ranker returns no reasoning, so there is
  no "why this matched" panel anywhere — highlighting is honest client-side
  term overlap only.
- **Toast**: `useToast()` returns `toast(message, tone?, action?)`. Tone is
  `success | error | info`, each with a leading icon (never color alone). A
  toast may carry one inline `action: { label, onClick }` — e.g. Saved's
  Unfollow surfaces an Undo action that calls a restore primitive rather than
  a plain re-save (so seen/new state and the follow date survive the round
  trip). The auto-dismiss countdown (3.2s) pauses while the toast is hovered
  or focused, so the user isn't racing the timer to click Undo. Exit mirrors
  entrance (`.is-leaving` plays `toast-out` before unmount; reduced-motion
  removes immediately).
- **Registers/ledgers** (Saved & History): a shared layout pattern — page
  head is kicker + `.t-display-title` h1 + folio count line + `.rule-strong`,
  then rows are a `.ledger` of hairline-divided `.ledger-row`s (grid columns:
  query / fandom / results-count / when / actions), never per-row
  cards/shadows. Row hover tints `--paper-2`. This replaces the old
  card-in-a-void list treatment entirely.
- **Query-as-headline** (/results): when a query exists, the page reads as a
  masthead — kicker `RESULTS` + folio (`{n} fics · {t}s · cached {rel} ·
  Refresh · Edit search`, tabular numbers) + the query text itself set in
  `.t-display-quote` (this IS the page's h1) + `.rule-strong`. Editing state
  (via Edit search, or no query yet) swaps this block for the boxed composer;
  the two are never rendered together. In board mode the masthead collapses
  to one compact strip (serif body-size query + inline folio, no rule) so the
  fixed-height workspace only loses a small strip, not a full page head.
- **Refine** (facets): an inline popover in board mode, styled off `--paper-2`
  (distinct from `--surface` content cards); facet-group headers are
  600-weight sans at `--text-sm`, NOT eyebrows, with hairline rules between
  groups. At ≤720px in Table/Cards, the inline panel is replaced by a
  bottom sheet (slide up + scrim + Close button; Escape works; pan-to-dismiss
  is implemented, so the drag handle is a real affordance, not decoration).
- **Chips**: decorative `.tag` = flat hairline pill (non-interactive);
  interactive filter chips (`.chip`) = clear rest border, selected =
  ink fill (`aria-pressed="true"`), so the two roles read differently
  (F057/F126).
- **Badges**: rating (G/T/M/E tinted, letter itself is the cue), status
  (Complete dot-green / In-progress amber, dot + word), "N new" (vermilion
  pill on Saved — the page's whole point gets the seal treatment, F188),
  platform (favicon pill).
- **Empty states**: a bare stroke icon (~2rem, `--ink-faint`, no circle
  backdrop, no hanko) + heading + one sentence + action. Two distinct
  /results cases are kept separate: `results.length === 0` (backend zero) →
  `No fics matched "{query}".` + Edit search action, which echoes the user's
  own query back at them; `visible.length === 0` after facet filtering →
  "No results match the current filters" + Reset filters.
- **Skeletons**: match real content shapes, including the new layouts — the
  results-header skeleton includes the headline bar, the fic skeleton
  includes the masthead + sidecar at ≥1200px. Shimmer sweeps a warm highlight
  stop (`color-mix(in oklab, var(--accent) 4%, #fdfcf9)`) over 1.6s, linear,
  so loading reads warm rather than fluorescent.
- **Focus**: `outline: 2px solid var(--accent); outline-offset: 2px` global,
  following each element's own border-radius in engines that support it.
- **Selection**: `::selection` is `--accent-wash` background with
  `--ink-strong` text — the whisper of the seal, not the browser's stock
  blue.

## Layout

Sidebar 256px (`--paper-2`) over paper canvas — one warm temperature family
everywhere (F002/F015/F172). The sidebar brand lockup now sits above a
hairline rule (a mini masthead), and the recent-searches list runs as a
ledger: a continuous 1px rule down the list with each row hanging off it
(group labels stay `.eyebrow`: "Today / This week / Earlier"). The account
avatar carries a 2px `--accent-wash` ring.

Content column `--maxw 880px` for prose surfaces; results/table/register
surfaces use `--maxw-wide 1160px` (`.page-wide`) (F046). Breakpoints: 1200px
(fic detail's two-column split engages — see below), 1024px (tablet: narrower
sidebar padding), 720px (sidebar becomes a top bar; the Board segment is
hidden from the results view/table toggle, leaving Table/Cards only — the
980px board slices are unreadable at phone width, and an already-persisted
"board" choice still renders since an explicit toggle always wins), 600px
(settings stack). `100dvh` not `100vh` (F044). Toasts bottom-center +
safe-area on mobile (F045).

**Fic detail two-column layout** engages at **≥1200px**, not 1024px: the page
gains `.page-wide` (1160px) and a `grid-template-columns: minmax(0,1fr) 280px`
split. The 1200px floor (rather than a rounder 1024px) is deliberate — at
1024px the content area is only ~720px, and a sidecar would squeeze the
reading column under the ~55ch measure floor. Left column: summary (≤65ch
measure, serif, line-height 1.6) + tags. Right sidecar (sticky): a stats
ledger (`.eyebrow` label column + tabular value column, hairline rules
between rows; the kudos row is one size larger and `--ink-strong` — it's the
one number the product exists to make trustworthy) + the `.btn-lg` Read CTA.
Below 1200px everything stacks (stats ledger after the summary, CTA
content-sized rather than stretched).

**Board** (the imposition-table view of one search's results, embedded in
/results): a warm Cross-pattern (registration marks) canvas —
`--xy-background-pattern-color: var(--line-mid)` set on the `.board-root`
ancestor, read by react-flow's background-pattern layer, not a bare `color:`
declaration (that was the original slate-gray-dots bug). Slices are
980px-wide tables (`.bnode`) stacked vertically; `fitTo()` computes
`zoom = min(1, (clientWidth - 32) / 980)` so the camera fits-to-width on
narrow viewports rather than letting the fixed-width node clip — the node
itself never resizes. When there is exactly one slice, the pan/zoom canvas
is skipped entirely and the table renders in normal page flow (special case:
if that lone slice is the zero-results placeholder, the standard empty state
renders instead of an empty table shell). A "N more slices below" strip
pins to the canvas's bottom edge in page flow when slices overflow the
viewport; clicking smooth-pans to the next one. Selecting a slice draws a
full 2px outline in the slice's own platform tone (`--accent-tone`:
AO3/FFN/Wattpad/variant) — one signal for "which table I picked up" and
"which platform it is". (A vermilion-tick + shadow-lift variant shipped
briefly in the Second Impression pass and was rolled back by owner
preference.) maxZoom is 1.2; controls get a translucent paper backdrop with blur. The
Board segment of the view toggle hides at ≤720px (see breakpoints above).

## Voice

Calm, fandom-fluent, second person. Empty states teach ("Searches you run show up
here"), errors own the failure and offer the next step ("Couldn't load the fandom
list. Retry"). Never blame, never exclaim. "Unranked" not "n/a". Dates are
relative ("2h ago") with absolute on hover (F207).

**No em-dashes in UI copy.** Sentences use a period, comma, colon, or
parentheses instead — every visible string, including toasts, errors, captions,
and dev-chrome headings. The ONE sanctioned "—" is the null marker in data
cells (table cells, stat values, the low/none-tier seal), which is table
typography, not prose. One page-level subtitle per page: never stack a second
explainer paragraph under it. Interfaces never restate the user's query back at
them as insight — the one deliberate exception is the backend-zero empty state,
which echoes the literal query text as an orientation cue ("No fics matched
'{query}'."), not as manufactured insight.
