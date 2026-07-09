# Product

## Register

product

## Users

Fanfiction readers — fandom-fluent, mostly on desktop at night, often coming from
AO3/FFN/Wattpad's own clunky tag search. They arrive with a *craving*, not a query:
"Drarry slow burn enemies to lovers, no MCD, complete only." Their job: describe the
fic they want in plain language and get a trustworthy, scannable ranked list they can
act on (read, save, follow). Power users live in the results table and the board
workspace; casual users type one sentence and click the top card.

## Product Purpose

Ficwell is semantic search over a pre-built index of fanfiction from AO3, FFN, and
Wattpad. It exists because platform-native search can't understand "vibes" — Ficwell
embeds the craving, retrieves across all three archives at once, and has a model
score every candidate 0–100 against the original ask. Success = the user trusts the
match score enough to click the first result, and comes back with the next craving.

## Brand Personality

**Inkwell, not neon.** Quiet, solid, literary. Three words: *inked, precise, warm*.
The product name is Ficwell ("fic" + "inkwell"); its signature is a vermilion hanko
stamp — the seal a match earns. The interface is a well-run print shop: black ink on
white paper, decisive hairlines, one red seal where it counts. Confidence comes from
craft and restraint, never from glow, gradients, or chrome. The one place the brand
raises its voice is the match score — the number the whole pipeline exists to produce
gets the seal treatment.

## Anti-references

- **Superseded internal concepts** — "Hearth Archive" (cozy pixel), "Ink & Ember":
  do not resurrect. No themes, metaphors, or idea buffets bolted onto controls.
- **AO3/Tumblr fandom-site vernacular** — maroon header bars, cramped serif walls,
  link-blue everywhere. Ficwell is the calm tool *above* the archives, not a fourth
  archive.
- **2024-era AI-SaaS gloss** — purple gradients, glassmorphism, glowing orbs, hero
  metrics, eyebrow labels on every section.
- **Neon/terminal dark-mode edginess** — the ink-vs-neon decision was made: ink won.

## Design Principles

1. **The obvious thing, executed quietly.** A search box is a search box; make it
   *solid* through CSS engineering (weight, seams, press travel), not novelty.
2. **The seal is the voice.** Vermilion is spent almost exclusively on the match
   score, selection, and moments of commitment (save/follow). Everything else is ink.
3. **Fiction reads in serif, the tool speaks in sans.** Fic titles, summaries, and
   prose get the reading voice; chrome, labels, and data stay in the working voice.
4. **Density is a feature.** Readers triage dozens of fics; tables, tight metadata,
   and tabular numerals are respected power-tools, not problems to soften.
5. **Every state is designed.** Empty, loading, error, disabled, unranked — each
   teaches or offers the next action; none is a gray sentence in a void.

## Accessibility & Inclusion

WCAG 2.1 AA floor: body text ≥ 4.5:1, large text and UI boundaries ≥ 3:1, visible
`:focus-visible` on everything interactive, full `prefers-reduced-motion` coverage
(crossfade or instant, never zero-feedback). Never color-only state (rating, error,
score tiers all carry a shape/text cue). Real SVG icons — no unicode-glyph tofu.
Touch targets ≥ 40px on mobile surfaces. Light theme is the shipped theme;
tokens are structured so a dark theme is a `:root` swap, not a rewrite.
