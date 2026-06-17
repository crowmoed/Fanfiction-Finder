# DESIGN.md — FicFinder design system

The committed system. New components reference this. All color pairs below are
WCAG-verified (≥4.5:1 body, ≥3:1 large) in both modes — see the contrast table at
the bottom. Use **mapped Tailwind classes**, not inline `style={{ var() }}`.

## 1. Color

Escapes the cream/parchment AI-default band. Light base is a true warm off-white
at near-zero chroma nudged toward jade (not "warm by default"). Warmth in the
brand is carried by the **jade accent** and the **serif**, not the body bg.
Dark mode is a warm off-black (never pure #000).

### Semantic tokens (light → dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FBFAF4` | `#15170F` | page background |
| `--surface` | `#F4F2E7` | `#1E2116` | cards, panels, header |
| `--surface-2` | `#ECEAD9` | `#272B1D` | secondary surface, hover |
| `--ink` | `#1C2718` | `#EDEBDC` | primary text |
| `--ink-2` | `#3A4631` | `#C2C2A8` | secondary text |
| `--ink-3` | `#5A6450` | `#969A7C` | tertiary text (meta) |
| `--border` | `#C7CBA8` | `#3A402C` | default borders |
| `--border-strong` | `#1C2718` | `#5A6450` | the "ink" outline (signature) |
| `--accent` | `#4C7A2E` | `#8FC25E` | brand jade — buttons, active |
| `--accent-ink` | `#FBFAF4` | `#15170F` | text ON accent (button label) |
| `--accent-text` | `#3C6322` | `#A4D272` | accent used AS text on bg |
| `--accent-soft` | `#DDEAC6` | `#2A3A1C` | accent tint surface |

### Domain tokens (platform / rating / score) — verified both modes
Platform AO3 / FFN / Wattpad, rating G/T/M/E, score heat — see globals.css.
Meanings are preserved from the old system; only the values are tuned for contrast.

### Strategy
**Restrained → committed.** Tinted neutrals + one accent (jade) carrying ~10% of
the surface on tool screens; the hero may go warmer/bolder (the one brand moment).

## 2. Typography

Retire "Instrument Serif italic everywhere." Pair on a real contrast axis:
**a clean grotesque sans for UI/body + a literary serif used ONLY for fic titles
and the hero.** Mono for data/meta.

- **Sans (UI + body):** `Inter` kept for body — defensible for a dense tool — but
  set as the default everywhere that is not a title. (Could swap to Geist later;
  Inter stays to limit risk.)
- **Serif (titles + hero only):** `Fraunces`? **No** — banned. `Instrument Serif`?
  **No** — banned. Use **`Source Serif 4`** (a warm, readable literary serif that
  is none of the AI-default display serifs) for fic titles, the hero wordmark, and
  fic-detail headings. Roman by default; italic only as deliberate accent, never
  for body text or table titles that must be scanned.
- **Mono (data/meta):** `JetBrains Mono` kept — counts, ranks, tags, timestamps.

Rules: body line-length 65–75ch; hero clamp max ≤ 6rem; display letter-spacing
≥ -0.04em; `text-wrap: balance` on h1–h3.

## 3. Motion

Calm and intentional. **Remove the global `steps(2,end)` choppy transitions** —
they fight the polished component motion and make everything feel broken.

- Standard ease-out curve: `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`.
- Durations: press 120–160ms · tooltips/popovers 150–200ms · dropdowns 180–220ms ·
  modals/drawers 220–320ms. Nothing over ~320ms for UI.
- **No always-on infinite animations** (kill the match-badge shine, decorative
  aurora/shimmer loops). Loaders that must spin are allowed.
- Buttons get `:active { transform: scale(0.97) }`. Popovers scale from origin.
- Reduced-motion: every animation has a crossfade/instant fallback (block exists).

## 4. Shape & elevation

- **Radius scale (pick one system):** `--r-sm: 6px` (inputs, chips) · `--r-md: 10px`
  (cards, panels) · `--r-full` (pills, avatars, badges). No mixed ad-hoc radii.
- **Elevation:** one soft shadow `--shadow-soft` for floating UI (dropdowns, modals)
  + the **one signature move**: a restrained offset "sticker" shadow
  `--shadow-offset: 2px 2px 0 …` used *sparingly* (hero card, primary CTA) — NOT on
  every surface like the old design did.
- Borders: 1px `--border` default; the `--border-strong` ink outline is reserved
  for the few elements that earn the "stamped" look.

## 5. Layout

- Container: results `max-w-[1200px]`, reading/content `max-w-[960px]`, prose 65ch.
- `min-h-[100dvh]` everywhere (never `100vh`).
- z-scale (semantic, named): base 0 · raised 10 · sticky 30 · header 40 · dropdown
  50 · modal-backdrop 60 · modal 70 · toast 80 · tooltip 90.
- Flex for 1D, Grid for 2D; responsive grids `repeat(auto-fit, minmax(280px,1fr))`.

## 6. The one signature, kept

Keep a *single* restrained teahouse flourish on the empty-state hero (a tasteful
vine or the offset-sticker card), not vines + chalkboard + canopy + shine all at
once. Identity through restraint.

## Contrast verification (computed, WCAG)
All primary/secondary/tertiary text pairs pass ≥4.5:1 on both `--bg` and
`--surface` in light and dark. White-on-accent button passes (4.86:1 light,
8.65:1 dark). All platform + rating badge pairs pass in both modes (lowest 5.13:1).
The old `--text-tertiary #6B7355` on cream (≈3.0:1) is replaced by `--ink-3`
(5.95:1 light / 6.21:1 dark).
