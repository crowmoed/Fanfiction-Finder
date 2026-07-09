# frontend_2 — Visual & Aesthetic Audit (marked improvements)

**Date:** 2026-07-02 · **Findings:** 216 (P1: 19 · P2: 88 · P3: 109)

Every visual/aesthetic improvement that should be made, down to the smallest and most
obvious items. Produced by a 12-auditor pass (7 surface auditors + 5 cross-cutting design
dimensions) over the source **and** full-page screenshots of the running app (desktop
1440px + mobile 390px, all app routes and /dev demo states), followed by dedup and a
per-finding evidence-verification pass. This build is a deliberate skeleton, so many
items are "the design pass must decide X" — they are marked anyway so nothing is lost
when that pass runs.

**Severity:** **P1** renders broken / overlapping / clipped / fails WCAG AA · **P2** a
designer would flag it immediately · **P3** small polish.

Checkboxes are for marking items as addressed (or consciously rejected) during the
design pass.

---

## Executive summary — the ten themes

1. **Token poverty.** Four CSS variables carry the whole app while ~40 hex values are
   hardcoded around them, producing five unrelated palettes on screen at once: warm
   sidebar (`#f5f4ef`), pure-white canvas, cool "Excel"-blue table greys, the board's
   ivory system, and the dev bar's navy. The design pass must start with a full token
   system (color roles, radius scale, spacing scale) or every other fix lands on sand.
2. **No typographic system.** System-ui only, 12+ ad-hoc font sizes with no scale,
   UA-default heading sizes, ~880px (100+ ch) prose measure, and no link style
   strategy (default underlines everywhere a title appears).
3. **Unicode glyphs standing in for an icon system.** ★ ☆ ↺ ⌃ ⋯ ⧉ ⤢ ▲ ▼ ⇅ ✓ … · ✕ and a
   literal "?" avatar. Cross-platform tofu risk, inconsistent optical sizes, no shared
   weight. One icon library should replace all of them in a single sweep.
4. **The product's hero number looks like body text.** Match score ("97/100") gets no
   color, no bar, no tiering — the one number the whole pipeline exists to produce.
5. **Nineteen P1 defects render today** — mobile sidebar collision with clipped copy,
   the composer's error note fused to its border, the results table overflowing its
   column ~46% on desktop and showing ~2.5 of 11 columns on mobile, "unranked"
   clipped mid-word, the board's empty white minimap box, active view-toggle abusing
   `disabled`, buttons with zero hover feedback, no favicon at all, and several
   straight WCAG contrast failures.
6. **Empty states don't teach or act.** Every empty state in the app is one muted gray
   sentence in a void (History, Saved, /results no-query, board, sidebar recents), and
   the home page is dead below the composer — no example queries, no recents, nothing.
7. **State/motion gaps.** Entrances exist but nothing exits (modal, toast vanish),
   Search gives no in-flight affordance beyond a text swap, disabled styling follows
   two different systems, and there's no scroll affordance or row→detail transition.
8. **No responsive system.** Two breakpoints for the whole app, the board has none at
   all, `100vh` instead of `100dvh`, toasts pinned to a desktop corner.
9. **No brand surface.** No favicon/OG/app icon, wordmark is bold system text, and the
   sidebar "FicFinder" and home-page "FicFinder" are two unrelated renderings.
10. **No dark-mode strategy** — no `color-scheme`, no `prefers-color-scheme`, and the
    hardcoded-hex sprawl (theme 1) makes retrofitting one expensive the longer it waits.

---

## Color, contrast & theming (cross-cutting)

*20 findings — P1: 7 · P2: 9 · P3: 4*

- [ ] **P1** · **F001 — No color-coding on the single most important number on the page: the match score**
  `frontend_2/src/components/MatchScore.tsx:16`
  MatchScore.tsx (frontend_2/src/components/MatchScore.tsx:16-21) renders every score — 97, 71, 12 — in identical black/bold text with no color distinction whatsoever; visible in dev-components.png where '97/100', '71/100', and '12/100' are typographically indistinguishable except for the digits themselves. The component's own doc comment even says this number is what 'the design's glowing lantern seal relies on' — i.e. the design intent already assumes score-tiered color, but zero color role exists yet (no --score-high/--score-mid/--score-low tokens anywhere in globals.css). A user scanning a results table has to read every digit; there's no at-a-glance signal for 'this is a great match' vs 'this barely qualified.'

- [ ] **P1** · **F002 — Three competing background temperatures with no relationship to each other**
  `frontend_2/src/app/globals.css:582`
  The app runs three unrelated whites simultaneously: pure white canvas (--bg: #fff, globals.css:16), a warm cream sidebar (--sidebar-bg: #f5f4ef, globals.css:582) and warm board canvas (#f4f3ee, board.css:10), and cool-grey table surfaces (#eef0f3 header, #f7f8fa zebra, #eef4fb hover — globals.css:338,370,373). Every real-app screenshot (home.png, history.png, saved.png, m-home.png) shows the warm sidebar butting directly against the stark white main content with a visible, uncomfortable temperature seam at the boundary — worse on mobile (m-home.png) where the sidebar becomes a full-width warm band stacked directly above white. This isn't three deliberate zones; it's three components independently choosing 'roughly white' and none of them agreeing. A locked design needs one neutral temperature (or a deliberate, documented reason for zoning) before this ships.

- [ ] **P1** · **F003 — ~40 hardcoded hex colors outside the 4-variable token system — no way to reskin**
  `frontend_2/src/app/globals.css:11`
  globals.css defines only 4 root tokens (--border #ccc, --muted #666, --bg #fff, --fg #111) yet the same file alone hardcodes at minimum: #ccc #666 #fff #111 #f5f5f5 #4a78d6 #a00 #fafafa #f0f0f0 #ececec #b0b4ba #d4d7dc #eef0f3 #e4e7eb #f7f8fa #eef4fb #b4b4b4 #9a9a9a #6b6b6b #525252 #595959 #ececec #3d3d3d #fafafa #d2d2d2 #a8a8a8 #1c1c1c #3a3a3a #767676 #f0f0f0 #f4f4f4 #fff2a8 #b8b8b8 #f5f4ef #eceae2 #2b2b29 #e7e5dd #1f2430 #cdd5e0 #e2e0d7 #b3261e #fbe9e7 #1c1c1a #7a1c17 — roughly 40 distinct one-off values, most used exactly once. board.css adds another ~25 (#f4f3ee #b3261e #2b5fb3 #c25e12 #6b4bb0 #5a5a54 #1c1c1a #6b6a63 #d9d7cc #ffffff #faf9f5 #dad8cd #ececE3 #b9b7ad #eceae1 #cfccbf #e7e4d9 #d0cec5 #f5f4ef #2b2b29 #f1efe8 #55544e #a3a299 #3b7d3b #b9b7ad). This means the upcoming design pass cannot reskin the app by changing a handful of CSS variables — every one of these ~65 literals has to be hunted down and replaced by hand, and any missed one silently keeps the skeleton grey/cream palette. Before design work starts, this needs a real token layer (surface/border/text/accent scale) that every one of these values maps into.

- [ ] **P1** · **F004 — Structural borders fail WCAG's 3:1 non-text contrast requirement**
  `frontend_2/src/app/globals.css:14`
  --border: #ccc (globals.css:14) against the white --bg produces a measured contrast ratio of 1.61:1 — far short of the 3:1 WCAG 1.4.11 requires for borders that convey UI structure (input fields, cards, buttons, the composer, the modal). This variable is used dozens of times as the sole visual boundary of interactive elements (input[type=text]/select at globals.css:94, button at :52, .card at :158, .menu-inner at :1110). On a low-contrast monitor or for low-vision users, card and input edges are nearly invisible — the app currently reads as 'boxes barely there' rather than clearly bounded. Confirmed visually in home.png/results-empty.png where the composer's outer edge is faint even at full screenshot fidelity.

- [ ] **P1** · **F005 — Error state uses color as the only differentiator between two structurally identical cards**
  `frontend_2/src/app/globals.css:209`
  dev-components.png shows 'No matches found' and 'Search failed' rendered as visually near-identical bordered cards — same padding, same corner radius, same layout — where the entire signal that one is an error is the heading/body text switching from black/muted-grey to #a00 red (globals.css:209, .error class). There's no icon, no colored left-border/accent bar, no tinted background, nothing but a change in one CSS color property. A user with red-green color vision deficiency (the most common form, ~8% of men) may not reliably distinguish these two states at a glance, which is a WCAG 1.4.1 'use of color' violation — color is the only means of conveying error vs. empty. Needs a shape/icon differentiator (e.g. a warning glyph, red-tinted background panel with border, or left accent bar) independent of hue.

- [ ] **P1** · **F006 — Pipeline stage-label color fails AA contrast for real body text**
  `frontend_2/src/components/board/board.css:509`
  board.css:509 sets .bdock__stage (the inactive pipeline step labels — 'Understanding', 'Reading the shelves', etc. before they activate) to #a3a299 on the white board dock background. Measured contrast: 2.57:1, well under the 4.5:1 AA minimum for text and even under the 3:1 minimum for large/UI text. This is real, readable status copy (not decorative), and at the small font-size used (0.72rem, board.css:506) it's exactly the kind of small+low-contrast combination WCAG flags hardest. The equivalent 'active' state style (color: var(--tone-ffn), a saturated blue) reads far more clearly by comparison, which makes the inactive-state illegibility more noticeable, not less.

- [ ] **P1** · **F007 — Wattpad's brand orange fails AA text contrast if ever used as label text, not just an icon fill**
  `frontend_2/src/components/board/board.css:14`
  --tone-wattpad: #c25e12 (board.css:14) measures 4.28:1 on white — below the 4.5:1 AA threshold for normal-size text. Today it's only used as a badge border/icon-fill color (bnode__badge border: 1px solid currentColor, board.css:120, where the badge's actual content is bold small text colored via var(--accent) i.e. this same orange) meaning the small badge label text itself IS rendered in this failing color, at 0.68rem (board.css:114) — smaller than the 'large text' 3:1 exemption threshold (which requires 18.66px/14pt bold). This is a real, currently-live AA failure on the smallest, hardest-to-read text on the board, not just a theoretical landmine.

- [ ] **P2** · **F008 — No dark mode strategy — no color-scheme meta, no prefers-color-scheme query, no dark tokens**
  `frontend_2/src/app/layout.tsx`
  Grepped the entire frontend_2/src tree: zero matches for color-scheme, zero matches for prefers-color-scheme, zero <meta name="theme-color">/themeColor export in layout.tsx. The app is hardcoded to light mode with pure #fff backgrounds and #111 text baked directly into --bg/--fg, so a user with system dark mode enabled gets a jarring white flash with no adaptation, and the browser UI chrome (scrollbars, form controls) won't match either since color-scheme isn't declared. This is easy to defer for a true skeleton, but since --bg/--fg already exist as variables, the design pass should decide now whether dark mode is in scope so the token architecture (finding above) accounts for it from the start rather than retrofitting a second palette later.

- [ ] **P2** · **F009 — Checkboxes render as unstyled native browser controls with no accent-color**
  `frontend_2/src/app/globals.css:462`
  Both real checkboxes in the app — the composer's 'Strict filters' (frontend_2/src/components/SearchForm.tsx:121) and FacetFilter's filter checkboxes (frontend_2/src/components/FacetFilter.tsx:215) — get zero styling beyond the global 'width: auto' override at globals.css:462-464. No accent-color CSS property is set anywhere in the codebase (confirmed via grep). Visible in home.png and m-home.png: the 'Strict filters' checkbox renders as a plain OS-default grey/blue square that doesn't match any app color, sitting oddly next to a fully custom-styled composer with rounded corners, custom borders, and a branded send button. It's the one native-chrome control in an otherwise custom-styled composer bar, and it visually reads as unfinished/forgotten.

- [ ] **P2** · **F010 — No semantic color roles for success/warning/info — only ad-hoc error red exists**
  `frontend_2/src/app/globals.css:1197`
  The only semantic color token is .error { color: #a00 } (globals.css:209). There is no success, warning, or info role, yet the app already has content that needs them: board.css:516 hardcodes a one-off green (#3b7d3b) for '.bdock__stage.is-done' (pipeline stage completed) with no corresponding token, and nothing marks a positive/success confirmation (e.g. 'saved', 'copied') anywhere in the app — Toast.tsx only has a default dark tone and an 'error' tone (data-tone="error", globals.css:1197), no 'success' tone despite save/follow/export actions in the app that are the kind of thing that typically gets positive toast confirmation. When the design pass adds a token system, it needs the full success/warning/info/error quartet from day one, not just error bolted on.

- [ ] **P2** · **F011 — Disabled 'Search' button reads as a normal, prominent CTA — not obviously inert**
  `frontend_2/src/app/globals.css:484`
  In home.png and m-home.png the disabled composer-send button (globals.css:484-489: background #ececec, color #767676) is the single largest, most saturated-looking rectangle on the page — flat grey but with full opacity (the rule explicitly overrides the global 0.5 disabled-opacity wash at line 488 with 'opacity: 1'). At default state (no query typed) it's the most visually weighted element in the composer, drawing the eye to a button the user can't yet click, while the actually-actionable text input has a much fainter #ccc border. The measured contrast of its label (#767676 on #ececec) is 3.84:1, which is fine for a disabled control by WCAG's own exemption, but the visual-weight problem is separate from contrast: a disabled primary action shouldn't out-compete the empty input it's gated on.

- [ ] **P2** · **F012 — Board canvas introduces a fourth, unrelated color system with its own naming and palette**
  `frontend_2/src/components/board/board.css:10`
  board.css defines a fully separate token set (--tone-ao3/ffn/wattpad/variant/all, --board-ink/muted/line/surface/surface-2) that doesn't reference or reuse anything from globals.css's --bg/--fg/--border/--muted, despite representing the same conceptual roles (ink=fg, board-surface=bg, board-line=border, board-muted=muted). board.png confirms visually: the board's off-white canvas (#f4f3ee), pure-white node cards, and warm-grey toolbar chrome form a fourth distinct palette island that shares no hex values with the sidebar's cream (#f5f4ef vs #f4f3ee — one pixel-value apart, clearly not intentionally shared) or the main canvas's pure white. Two nearly-identical-but-not-equal creams (#f5f4ef sidebar vs #f4f3ee board) in the same app is worse than either one alone — it signals two people picked 'roughly cream' independently rather than sharing a token.

- [ ] **P2** · **F013 — AO3 platform brand-tile red and the app's error/danger red are two different, unrelated reds**
  `frontend_2/src/components/PlatformLogo.tsx:35`
  PlatformLogo.tsx:35 hardcodes AO3's brand red as #990000 for its lettermark fallback tile, while the app's own error/danger color is #a00 (globals.css:209) — visually almost the same red but numerically distinct (#990000 vs #aa0000) with no shared variable. Separately, board.css:12 defines yet a third red for the AO3 platform tone (--tone-ao3: #b3261e), which is also reused for the app's own danger/delete affordance (.menu-item-danger, globals.css:1159, and .btoolbar__save-warning, board.css:414). So 'AO3 red,' 'error red,' and 'board AO3-tone red' are three different hex values that happen to all look approximately like brand-maroon, with the board's AO3 tone doing double duty as both a platform identity color AND a warning/danger color — conflating 'this is AO3 content' with 'something is wrong' is a semantic collision waiting to confuse a future reader of the board when an AO3-tagged element and a warning both render in the identical red.

- [ ] **P2** · **F014 — Drag-grip dots icon is nearly invisible against white — fails even non-text 3:1 contrast**
  `frontend_2/src/components/board/board.css:80`
  .bnode__dots { color: #b9b7ad } (board.css:80) against white --board-surface measures 2.01:1 — under even the lenient 3:1 threshold for graphical/UI objects. This is the drag-handle affordance on every result-frame node header; at that contrast it's borderline undiscoverable, especially for low-vision users trying to find where they can grab to drag the node. It's a small icon so the stakes are lower than a body-text failure, but it directly undermines the drag-to-rearrange interaction the board is built around if users can't visually locate the grip.

- [ ] **P2** · **F015 — Zebra-stripe and hover blues in the results table clash with the warm app palette**
  `frontend_2/src/app/globals.css:370`
  the .xl-table's even-row zebra (#f7f8fa, globals.css:370) and hover state (#eef4fb, globals.css:373) both lean distinctly cool/blue-grey, while the sidebar immediately to the table's left is warm cream (#f5f4ef). This is the same three-temperature problem (finding above) but concretely visible in any results view: a cool-toned data grid sitting directly beside a warm-toned nav rail, with pure white as a third value between them for the page background. None of the three grays/whites share a common base hue, so scanning left-to-right across the app the eye crosses two unrelated color temperature shifts before reaching any content.

- [ ] **P2** · **F016 — "Couldn't load fandom list" error note renders as plain muted grey text, not distinguishable from ordinary help copy**
  `frontend_2/src/app/globals.css:1207`
  home.png/m-home.png/results-empty.png all show the composer-note under the search bar ('Couldn't load the fandom list — showing All Fandoms only...') in the same .muted grey (#666) as every other secondary caption in the app, despite it being a genuine backend-failure notice, not routine guidance. It doesn't use .error's #a00, doesn't get an icon, and sits directly below the composer with the same visual weight as a normal hint. A user skimming the page has no visual cue that something actually failed versus just reading ambient help text — this is a milder version of the 'error state = only color' problem (see the P1 finding above) but here color isn't even applied, so there's truly zero differentiation from benign copy.

- [ ] **P3** · **F017 — Match-highlight yellow mark has no relationship to any other 'attention' color in the app**
  `frontend_2/src/app/globals.css:539`
  mark.hl { background: #fff2a8 } (globals.css:539) is the only saturated yellow anywhere in the codebase — a one-off, not tied to a --highlight or --accent token. Visible in dev-results.png's 'Match highlighting' section: 'Enemies', 'lovers', 'Slow Burn' etc. get a bright yellow background block that is by far the most saturated color on the entire results page (everything else is black/grey/white). It reads well in isolation (16.65:1 contrast, easily AA) but as a design-system matter it's an orphaned color: when the real design adds an accent color (for CTAs, active states, score-tiers, etc.), this yellow will likely clash with whatever hue gets chosen, since nothing here anticipates a shared accent system.

- [ ] **P3** · **F018 — Focus ring blue is a one-off value shared by nothing else in the app**
  `frontend_2/src/app/globals.css:104`
  The global :focus-visible outline (globals.css:104, #4a78d6) and the board's focus rings (board.css uses --tone-ffn #2b5fb3 instead, e.g. board.css:62,188,216,463) use two different blues for the same semantic purpose (keyboard-focus indication) in the same app. Neither blue appears anywhere else as a link, button, or accent color — so 'focus blue' currently means nothing except 'focus,' and the app has two different values for it depending on whether you're in the main app or on the board. When an accent/brand color is chosen, both of these need to either become that accent or be deliberately kept as a distinct focus-only hue — right now it looks like two people picked 'a blue' independently.

- [ ] **P3** · **F019 — Sidebar CTA and account-avatar white fills are yet another 'almost white' distinct from --bg**
  `frontend_2/src/app/globals.css:685`
  Both .sidebar-cta (globals.css:685, background: #fff) and .sidebar-avatar (globals.css:1080, background: #fff) use literal #fff instead of var(--bg), sitting inside a --sidebar-bg: #f5f4ef panel. Visible in home.png: the 'New search' button and the avatar circle in the sidebar are bright white cutouts floating in the cream sidebar — which is a reasonable design move (call out the primary action) but it's implemented as a hardcoded literal rather than a token, and it's the same 'pure white island in a warm field' pattern that recurs throughout (also see .platform-link background:#fff at globals.css:555, .bempty__seed's white-ish surface in board.css). Should consolidate to a --surface-raised token so the 'card that pops off the warm background' treatment is consistent and swappable everywhere it's used.

- [ ] **P3** · **F020 — Dev bar's dark navy (#1f2430) is a one-off fifth palette with no relationship to app or board colors**
  `frontend_2/src/app/globals.css:925`
  .dev-bar (globals.css:925, background: #1f2430, visible atop every dev-* screenshot as the black 'DEV / DEMOS' strip) introduces the only genuinely dark surface in the entire codebase, with its own link color #cdd5e0 (globals.css:932) — neither value shares any relationship with --fg (#111), --board-ink (#1c1c1a), .toast background (#1c1c1a), or .composer-send background (#1c1c1c). Four near-black values (#111, #1c1c1a, #1c1c1c, #1f2430) exist across the codebase for what is conceptually 'the app's near-black ink color' used in different contexts — none of them share a variable. Low severity since the dev bar is explicitly out-of-band chrome, but worth consolidating before the real dark-surface/ink token is locked.


## Typography & hierarchy (cross-cutting)

*17 findings — P1: 0 · P2: 6 · P3: 11*

- [ ] **P2** · **F021 — No type scale exists — 12+ ad-hoc font-sizes with no ratio relationship**
  `frontend_2/src/app/globals.css:155`
  globals.css alone uses 0.72rem, 0.75rem, 0.8em, 0.8rem, 0.82rem, 0.85em, 0.85rem, 0.88rem, 0.9em, 0.92rem, 0.95rem, 1.05rem as distinct, unrelated sizes (lines 155,167,181,222,325,423,448,571,638,679,710,720,734,754,889,988,1038,1050,1063,1082,1088,1147,1192,1209), plus board.css adds 0.6rem, 0.66rem, 0.68rem, 0.72rem, 0.78rem, 0.8rem, 0.85rem, 0.9rem, 0.95rem more. None follow a modular scale (1.125/1.25/1.333 ratio, etc.) — each was picked in isolation per component. The design pass needs a locked scale (e.g. 6-8 steps) that every one of these maps onto, or the sprawl just gets re-encoded in the new palette.

- [ ] **P2** · **F022 — No brand typeface — pure system-ui stack for a reading-heavy product**
  `frontend_2/src/app/globals.css:18`
  `:root { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }` (globals.css:18) is the only typeface declared anywhere in the app — no serif/display pairing, no distinct heading face. For a product whose core UI surface is dense paragraphs of fic summaries (FicCard, FicDetail — see dev-fic.png), system-ui is a defensible skeleton default but a real typeface decision is needed before the design pass: candidates should weigh reading comfort at length (a humanist sans like Inter/Source Sans, or a serif body like Source Serif for the summary prose specifically) against a distinct display face for h1/product-identity moments (home.png's "FicFinder" wordmark currently has zero personality — it's Segoe UI Bold at browser-default size).

- [ ] **P2** · **F023 — h1 left entirely to browser UA defaults — no product-identity vs utility-header distinction**
  `frontend_2/src/app/globals.css:36`
  h1/h2/h3 only get `line-height: 1.2` (globals.css:36-40); font-size is never set, so every h1 renders at the browser default (~32px/700, confirmed live). The home page wordmark "FicFinder" (page.tsx:23, home.png), the dev-doc heading "On-demand story page" (dev-fic.png), and the empty-state heading "Search history" (history.png) are visually IDENTICAL in weight and size despite serving completely different roles — one is product identity, one is documentation, one is a page title. A locked h1/h2/h3 scale with distinct treatment for the home hero vs. in-app page titles is needed.

- [ ] **P2** · **F024 — Card/detail title links have zero styling beyond inherited default underline — no link strategy**
  `frontend_2/src/components/FicCard.tsx:38`
  `a { color: inherit }` is the only global anchor rule (globals.css:33); FicCard.tsx:38-40 wraps the h3 title in a bare `<Link>` with no className. In dev-results.png, "The Slow Burn at the End of the World" renders as a plain underlined black h3 — visually indistinguishable from a non-interactive heading except for the underline running under every word including descenders, which looks like a typo/artifact at this weight rather than an intentional link treatment. Decide the link strategy now: underline-on-hover-only, a distinct link color, or an accent underline offset — the current "just inherit whatever the browser does" reads as unfinished even for a skeleton, because it's the single most-repeated interactive text element in the whole app.

- [ ] **P2** · **F025 — Summary/prose text runs to ~880px (100+ characters per line) — far past comfortable reading measure**
  `frontend_2/src/app/globals.css:12`
  `--maxw: 880px` (globals.css:12) is applied uniformly to `.app-main > *` (globals.css:828) with no separate, narrower measure for prose blocks. FicCard.tsx:67-69 and FicDetail.tsx:77-83 render the fic summary at full container width. In dev-fic.png, "Enemies to lovers, set across seven winters. Draco keeps a list of every reason he hates Harry Potter. The list keeps getting shorter." runs edge-to-edge of an 828px-wide card at ~16px body size — roughly 100-110 characters per line, well past the 65-75ch range that's standard for reading comfort. Since this product's primary content IS prose (fic summaries), a narrower measure specifically for `<p>` summary/description text (e.g. `max-width: 68ch` on the summary paragraph, independent of the card's outer width) should be part of the design pass, not just a wider container cap.

- [ ] **P2** · **F026 — FicCard's inline metadata row (platform/fandom/rating/stats) has no visual grouping or separators**
  `frontend_2/src/components/FicCard.tsx:54`
  FicCard.tsx:54-64 renders platform, fandom, rating, completion, chapters, and three stats (words/kudos/hits) all as sibling `<span>`s in one `.row` with only `gap: 1rem` between them — no visual separator (dot, pipe, or differentiated color per field type). In dev-results.png the line "AO3  Harry Potter  rated M  Complete  32/32  words: 184,320  kudos: 21,500  hits: 480,200  updated 2025-11-02" reads as one undifferentiated run of gray text; a reader has to parse label:value pairs by eye with no typographic cue for where one fact ends and the next begins (contrast with the FicDetail page, dev-fic.png, which visually separates stats into labeled columns — the card and detail page use two different metadata-density strategies for the same data).

- [ ] **P3** · **F027 — Numeric stats have zero tabular-nums treatment outside the results table**
  `frontend_2/src/components/MatchScore.tsx:18`
  `.xl-num { font-variant-numeric: tabular-nums }` (globals.css:377) is scoped ONLY to ResultsTable.tsx cells. MatchScore.tsx:18 (`<strong>{score}</strong>`), FicCard.tsx:60-62 (words/kudos/hits), and FicDetail.tsx:89-107 (Words/Kudos/Hits/Bookmarks/Comments/native-stats blocks) all render `n.toLocaleString()` in default proportional-width digits. Confirmed in dev-fic.png: the five-stat row "184,320 / 21,500 / 480,200 / 8,900 / 4,200" and the six-stat FFN row below it sit in proportional digits with no columnar alignment discipline, and the two match scores "97/100" vs "71/100" on dev-results.png render at different visual widths per digit. Any surface presenting stats in a grid/row (card stat rows, detail stat blocks, MatchScore badge) should get tabular-nums, not just the spreadsheet table.

- [ ] **P3** · **F028 — RECENT label is the only letter-spaced text in the app — inconsistent small-caps treatment**
  `frontend_2/src/app/globals.css:734`
  `.sidebar-section-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; }` (globals.css:733-739) is the single occurrence of letter-spacing tracking in the entire codebase (confirmed via grep — no other match). It's applied only to the sidebar's "RECENT" label (visible in home.png, history.png). Other small-caps-adjacent or label-role text — the "Tags"/"Summary"/"Why this matched" section headers in FicDetail.tsx:70,76,113 (rendered as plain `<strong>`, see dev-fic.png), the composer's "Fandom:" control label, column headers in the results table — get no equivalent tracking treatment despite serving a similar micro-label role. Either extend letter-spacing to all label-weight text consistently, or drop it from RECENT so the app doesn't have one orphaned special case.

- [ ] **P3** · **F029 — No text-wrap: balance/pretty anywhere — headings and short paragraphs can break raggedly**
  `frontend_2/src/app/globals.css:36`
  Zero occurrences of `text-wrap: balance` or `text-wrap: pretty` in globals.css, board.css, or any component (confirmed via full-codebase grep). This is a near-zero-cost, high-value CSS addition for a skeleton meant to carry into the design pass: `text-wrap: balance` on h1-h3 prevents a heading like "Cartography of Small Disasters" or "The Slow Burn at the End of the World" (dev-fic.png) from wrapping to an orphaned single word on a narrow card, and `text-wrap: pretty` on body paragraphs avoids single-word last lines in the summary blocks. Cheap to add now, and removes a class of "why does this heading wrap weird" bugs the design layer would otherwise inherit.

- [ ] **P3** · **F030 — Three incompatible truncation strategies coexist with no unifying rule**
  `frontend_2/src/components/TagList.tsx:23`
  The app uses (1) CSS ellipsis via `.truncate`/`.xl-truncate` (globals.css:379-382, 811-815) for table cells, (2) a native `<details>` "+N more" disclosure for overflow tags (TagList.tsx:22-33, `.tag-more`), and (3) `-webkit-line-clamp: 2` for the board node's rewritten-prompt line (board.css:107-109) — three different interaction models (silent truncation, click-to-expand, hard 2-line clamp) for the same underlying problem of "there's more text than fits." A designer picking up this skeleton needs one documented truncation pattern per content type (single-line label → ellipsis+title-tooltip; list of discrete items → disclosure; multi-line prose → line-clamp+full-text-elsewhere), not three ad-hoc solutions that happened to get built for three different components.

- [ ] **P3** · **F031 — Composer placeholder and label text sit one size below the input but with no systematic step**
  `frontend_2/src/app/globals.css:423`
  `.composer-input` is 1.05rem (globals.css:423), `.composer-control` labels are 0.92rem (globals.css:448), and the submit button inherits 1.05rem via the global `button { font: inherit }` rule (globals.css:46) but visually reads smaller due to its tighter padding (0.45rem 1.15rem vs the textarea's 0.85rem 1rem 0.4rem). None of these three sizes relate to each other by a defined ratio — they're each a value that "looked right" in isolation. Once a type scale exists (see the broader type-scale finding), the composer's input/control/button sizes should be re-derived from it rather than kept as bespoke values.

- [ ] **P3** · **F032 — "Why this matched" / "Summary" / "Tags" section labels use plain <strong> with no distinct heading treatment**
  `frontend_2/src/components/FicDetail.tsx:70`
  FicDetail.tsx:70,76,113 render section labels as bare `<strong>Why this matched</strong>` etc. — same font-size as surrounding body text, bold only. In dev-fic.png these labels are barely distinguishable from the summary/tag content directly below them at a glance (both are near-16px black text; only weight differs). These function as h2-equivalent section headers within the fic detail page and should get real heading semantics + a step up in size/tracking from body text, not just inherited bold.

- [ ] **P3** · **F033 — Sidebar "FicFinder" brand wordmark and the home page's h1 "FicFinder" have no relationship — two unrelated renderings of the same word**
  `frontend_2/src/app/globals.css:656`
  `.sidebar-brand` is `font-weight: 700; font-size: 1.05rem` (globals.css:651-660) while the home page's `<h1>FicFinder</h1>` (page.tsx:23) is an unstyled browser-default h1 (~32px/700). Both are literally the string "FicFinder" rendered as the product's name, visible simultaneously in home.png (sidebar top-left "‹ FicFinder" at small size, main content "FicFinder" at large size) — but they share no typographic DNA (not even the same weight ratio to their context) because they were styled independently with no wordmark treatment. When a real typeface/brand mark is chosen, both instances need to derive from one wordmark definition.

- [ ] **P3** · **F034 — Board node title/detail hierarchy uses a near-invisible 0.72rem/line-clamp-2 secondary line under a 0.95rem/650-weight title**
  `frontend_2/src/components/board/board.css:104`
  board.css:247-248 sets `.bnode__title { font-weight: 650; font-size: 0.95rem }` while the immediately-following `.bnode__detail` (the full rewritten search prompt) drops to `font-size: 0.72rem; line-height: 1.4` (board.css:104-105) with a 2-line clamp. That's a ~24% size drop for what is often the more information-dense content (the actual query text vs. a short label like "By platform"). Confirmed in board.png's group-frame header pattern ("Results board" title with tab labels below) — the secondary text is legible but noticeably strains at 0.72rem (≈11.5px) against the board's light `--board-muted` gray, worth flagging as a likely AA-contrast-at-size risk once real colors replace the current near-black-on-off-white.

- [ ] **P3** · **F035 — "—" em-dash used as null/unranked placeholder has no distinct typographic treatment from real content**
  `frontend_2/src/components/FicDetail.tsx:89`
  `fmt()` helpers in FicCard.tsx:22-25 and FicDetail.tsx:24-26 return a bare `"—"` for null word_count/kudos/hits, rendered inside the same `<strong>` as real numbers (FicDetail.tsx:89,93,97,106) — e.g. dev-fic.png's "Untitled Draft (work in progress)" card shows "Words — Kudos — Hits 1,200" where the dashes sit at full bold weight, same size as "1,200", making them read as equally-weighted content rather than an absence-of-data marker. A muted/lighter treatment for the placeholder dash (vs. the bold numeric value) would make scanning for "which fields actually have data" faster.

- [ ] **P3** · **F036 — Composer error note and empty-state microcopy shift tone from conversational to clinical without a stated rule**
  `frontend_2/src/components/SearchForm.tsx:134`
  Most microcopy is warm/conversational: "Describe the fic you're looking for…" (SearchForm.tsx:87), "Searches you run show up here for quick access." (RecentsList.tsx:86), "An empty board. Run a search below…" (board.png). But the composer's fandom-load failure note reads as a terse status line — "Couldn't load the fandom list — showing All Fandoms only. You can still search across everything." (SearchForm.tsx:134-136, visible in home.png) — and FicDetail's "No summary indexed." (FicDetail.tsx:81, dev-fic.png) is similarly clinical. Neither is wrong on its own, but there's no documented voice rule distinguishing when copy should be reassuring/conversational vs. terse/technical, so the two registers will keep drifting apart as more surfaces get built. Worth a one-line voice guideline before the design pass adds more copy.

- [ ] **P3** · **F037 — "Not ranked" / unranked score state uses the same muted-gray as all other secondary text — no distinct "absent data" signal**
  `frontend_2/src/components/MatchScore.tsx:11`
  MatchScore.tsx:9-14 renders `<span className="muted" title="Not ranked by the model">— unranked</span>` using the identical `.muted` class (globals.css:153-156, `color: #666; font-size: 0.9em`) applied to author bylines, platform metadata, and dozens of other secondary strings throughout the app. In dev-results.png's "Untitled Draft (work in progress)" card, "— unranked" sits at the same visual weight as "by saltandstarlight" elsewhere — a reader has no typographic cue that this specific instance means "the model chose not to score this," a meaningfully different and more important signal than routine secondary metadata. This is the kind of state that benefits from its own token once the design pass starts (distinct from generic muted secondary text).


## Spacing, layout & responsive (cross-cutting)

*17 findings — P1: 1 · P2: 10 · P3: 6*

- [ ] **P1** · **F038 — Results board dock and toolbar have zero responsive breakpoints -- board.css never adapts below desktop width**
  `frontend_2/src/components/board/board.css:441`
  `board.css` contains exactly one media query in the entire file (`prefers-reduced-motion` at line 340) -- no width-based breakpoints at all. The bottom search dock (`.bdock`, board.css:442-449) is `width: min(760px, 92vw)` with `.bdock__row` as an unwrapped `display: flex` containing a flexible query input, a fixed `150px` fandom input (`.bdock__fandom`, line 470-473), a Search button, and a Seed-demo button, all `white-space: nowrap`. On a 390px phone this row cannot fit (150px fandom field + go/seed buttons alone exceed the available width after the 92vw dock minus padding), so it will either overflow the dock or crush the query input to near-zero width. The floating toolbar (top-left, `.btoolbar`) and minimap (bottom-right) are absolutely positioned with fixed offsets and no mobile repositioning either -- on a narrow board this likely stacks over the dock or off the canvas edge. This whole surface needs a mobile pass (stack the dock vertically, hide or relocate the minimap) before it's usable on a phone.

- [ ] **P2** · **F039 — Mobile sidebar top-strip: RECENT list collides with Board nav row, account row text is clipped off-screen**
  `frontend_2/src/app/globals.css:942`
  At <=720px, `.sidebar` switches to `flex-direction: row; flex-wrap: wrap` (globals.css:942-963) with no width constraint on children. In m-home.png, `.sidebar-scroll` (holding the 'RECENT' label + 'Searches you run show up here...' placeholder text) wraps onto the same row as the Board nav item and visually overlaps/crowds it -- the empty-state copy runs directly beside 'Board' with no separating margin or line break. Below that, `.sidebar-foot` also goes `flex-direction: row` (line 957) so `.sidebar-account` (avatar + 'Account' + caret, all `white-space: nowrap`) sits beside the dev `SidebarItem`, and the dev link's label is clipped to 'ev / demos' at the viewport edge -- the row simply overflows past 390px with no wrap or truncation. Fix: this breakpoint needs its own layout (e.g. account row above dev link, recents as a proper section below nav, not a flat wrapped row), not a `flex-wrap` fallback of the desktop rail's row-based footer.

- [ ] **P2** · **F040 — Home page: content ends at ~20% of viewport height, rest is dead white space**
  `frontend_2/src/app/globals.css:816`
  home.png and history.png and saved.png and results-empty.png all show the entire page's content (header + composer, or header + one line of empty-state copy) confined to the top ~200px of a 1440x900+ viewport, with everything below being blank `--bg` white. `.app-main` (globals.css:816-826) has no vertical centering, no max-content-width treatment, and no fallback illustration/secondary content for the empty state -- it's just `padding: 1.5rem 1.5rem 4rem` around whatever children render, so short content leaves a cavernous void. This isn't a 'skeleton is unstyled' issue, it's a layout issue: the composer/empty-state block should be vertically positioned intentionally (e.g. mid-viewport for the home hero, or the page container should not stretch to `min-height: 100vh` when content is this short).

- [ ] **P2** · **F041 — No spacing scale -- 35+ distinct rem values used ad hoc across globals.css and inline styles**
  `frontend_2/src/app/globals.css:13`
  globals.css alone uses 0.05rem, 0.1rem, 0.15rem, 0.2rem, 0.25rem, 0.3rem, 0.35rem, 0.4rem, 0.45rem, 0.5rem, 0.55rem, 0.6rem, 0.65rem, 0.75rem, 0.85rem, 0.9rem, 1rem, 1.25rem, and 1.5rem as one-off `gap`/`padding` literals (no 4px/8px grid, no shared token beyond the single `--gap: 1rem`). On top of that, components layer their own inline overrides: FicCard.tsx:35 `style={{ gap: '0.5rem' }}`, FicCard.tsx:42 `style={{ gap: '0.5rem' }}` again on a nested row, ResultsView.tsx:145/150/173 three different inline gaps (`1rem`, `0.4rem`, implicit), Modal.tsx:63/67 inline widths and row gaps. There is no `--space-1/2/3/4` scale to reach for, so every new spacing decision is invented from scratch -- this is the single highest-leverage fix for the design pass (a 6-8 step scale would collapse nearly all of this).

- [ ] **P2** · **F042 — Radius scale has 9 distinct non-pill values with no system**
  `frontend_2/src/app/globals.css:54`
  border-radius appears at 2px (focus ring, mark.hl), 4px (button, input, skeleton), 5px (recent-skel), 6px (.card, .platform-link, skeleton-banner), 7px (.menu-item), 8px (composer-rail select, composer-send, sidebar rows, settings-tab, sidebar-toggle), 10px (.menu-inner), 12px (.composer, .bdock in board.css), and 16px (.modal) -- plus 999px pills (.tag, .tag-more, .sidebar-avatar). That's 9 different corner radii with no visible logic tying radius to element size or hierarchy (e.g. a button and a modal both use values that don't share a ratio). Flag for a locked 3-4 step radius system (e.g. sm/md/lg/pill) before the design pass, or every future component will keep inventing a new radius.

- [ ] **P2** · **F043 — Only two breakpoints (720px, 600px) for the entire app -- no tablet-range handling**
  `frontend_2/src/app/globals.css:942`
  globals.css defines exactly two media queries: `max-width: 720px` (sidebar collapse to top strip, globals.css:942) and `max-width: 600px` (settings tabs to horizontal, globals.css:903). Nothing addresses the 721px-1024px tablet range, so a device like an iPad in portrait (768px) gets the full desktop fixed-sidebar layout (`--sidebar-w: 256px`) squeezed against a `--maxw: 880px` content column -- on a 768px-wide tablet the sidebar alone eats a third of the screen before content even starts, and `.app-main`'s `padding-left: calc(var(--current-sidebar-w) + 1.5rem)` (line 824) leaves almost no room for the 880px max-width column to breathe. The results table (`ResultsTable.tsx`, fixed column widths totaling well over 880px) would be especially cramped here. Needs at least one intermediate breakpoint.

- [ ] **P2** · **F044 — min-height: 100vh on .app-shell and .app-main instead of 100dvh -- iOS Safari address-bar jump**
  `frontend_2/src/app/globals.css:594`
  `.app-shell` (globals.css:594) and `.app-main` (globals.css:821) both use `min-height: 100vh`. On iOS Safari, `100vh` is calculated against the maximum viewport (address bar hidden), so on page load the shell overshoots the visible viewport, and dismissing/showing the URL bar during scroll causes visible layout jump/resize. The codebase already knows the fix -- `.modal` at line 842 correctly uses `max-height: calc(100dvh - 4rem)` -- it just wasn't applied to the two most load-bearing full-height containers. Swap both to `100dvh` (with a `100vh` fallback for older browsers if needed).

- [ ] **P2** · **F045 — Toast region pinned at fixed 1.25rem from viewport corner with no mobile treatment or safe-area inset**
  `frontend_2/src/app/globals.css:1177`
  `.toast-region` (globals.css:1177-1186) is `position: fixed; bottom: 1.25rem; right: 1.25rem` with `max-width: 320px` on the toast itself, unconditionally at every viewport size. On a 390px-wide phone, a 320px toast anchored to the right corner sits almost edge-to-edge with only ~1.25rem clearance on the right and none reserved on the left, and there's no `env(safe-area-inset-bottom)` accommodation for devices with a home-indicator bar. It should either go full-width-minus-margin on narrow viewports or move to a bottom-centered position below ~480px, and add safe-area padding.

- [ ] **P2** · **F046 — --maxw: 880px is a single content-column width used for both tables and prose, wrong for at least one**
  `frontend_2/src/app/globals.css:12`
  `--maxw: 880px` (globals.css:12) is applied uniformly via `.app-main > * { max-width: var(--maxw) }` (globals.css:827-831) and directly on `.nav-inner`/`.dev-main`. The ResultsTable, though, defines columns that sum to well over 880px (title 16rem=256px + fandom 8rem=128px + tags 12rem=192px + summary 14rem=224px + why 12rem=192px + word/kudos/hits/score/platform/url columns on top -- comfortably 1400px+), so on every results page the table is guaranteed to horizontal-scroll inside its `overflowX: 'auto'` wrapper (ResultsTable.tsx:85) regardless of how wide the actual viewport is, because the outer column caps at 880px first. Meanwhile 880px is comfortable for the home page's single-paragraph prose but cramped for a data-dense table. These two content types need different max-widths, not one shared token.

- [ ] **P2** · **F047 — Results-page header row (count, view toggle, export, board/save buttons) has five separate inline gap values crammed into one line, will wrap badly on mobile**
  `frontend_2/src/components/ResultsView.tsx:134`
  ResultsView.tsx:134-170 builds the results header as a `.row` with `justifyContent: 'space-between'` containing a result-count paragraph and a nested `.row` at `gap: '1rem'` (line 145) holding: OpenOnBoardButton, SavedSearchButton, a further-nested `.row` at `gap: '0.4rem'` (line 150) for the View: Table/Cards toggle, and ExportButtons -- three levels of flex row with three different gap values (implicit default 0.75rem row gap, 1rem, 0.4rem) trying to fit in one horizontal line. On mobile widths this cluster of 4-6 interactive controls plus a count label has no `flexWrap` set on the outer row (only `.row` utility class default, which does have `flex-wrap: wrap` per globals.css:151, so it will wrap, but unpredictably given the mismatched internal gaps) -- worth a dedicated mobile toolbar layout (e.g. a two-row split: count+cache-status on one line, actions in a scrollable or stacked cluster below) rather than relying on wrap-as-needed.

- [ ] **P2** · **F048 — PlatformLink pill and QuickViewButton have no consistent hit-target size floor for touch**
  `frontend_2/src/components/ResultsTable.tsx:170`
  `.platform-link` (globals.css:548-561) uses `padding: 0.15rem 0.4rem` around a small favicon + arrow glyph, and appears beside `QuickViewButton` in the table's Link column (ResultsTable.tsx:170-174, `gap: '0.4rem'`) -- both controls render well under the 44x44px touch-target minimum recommended for mobile (WCAG 2.5.5 / Apple & Android HIG), and they sit immediately adjacent with only 0.4rem (6.4px) between them, in a table cell (`.xl-truncate` column, `5.5rem` = 88px wide). On a touch device this pairing is a mis-tap hazard. Needs a minimum padding/tap-area treatment, not just visual padding, once the table gets a mobile-specific layout.

- [ ] **P3** · **F049 — Card-family padding is inconsistent across .card, .modal-body, .composer, and .bdock**
  `frontend_2/src/app/globals.css:160`
  Four different 'card' containers use four different padding values with no shared relationship: `.card` = `0.9rem 1rem` (globals.css:160), `.modal-body` = `1.25rem 1.5rem 1.5rem` (globals.css:864), `.composer-input` = `0.85rem 1rem 0.4rem` (globals.css:426) with `.composer-rail` adding its own `0.5rem 0.6rem 0.6rem 1rem` (globals.css:441), and the board's `.bdock` = `0.55rem` (board.css:447). None of these derive from a shared inset token, so the visual density of a result card, a modal, the search composer, and the board dock all differ slightly for no articulated reason -- e.g. `.card`'s 1rem horizontal inset vs `.modal-body`'s 1.5rem is a 50% jump with no in-between step to justify it. Lock one padding scale (e.g. tight/regular/loose insets) and map every container to it.

- [ ] **P3** · **F050 — FicCard and ResultsView litter inline `style={{ margin: 0 }}` on nearly every paragraph instead of a CSS rule**
  `frontend_2/src/components/FicCard.tsx:37`
  FicCard.tsx has `style={{ margin: 0 }}` repeated on lines 37, 49, 67, 73 (h3, two <p>, another <p>) and ResultsView.tsx repeats the identical pattern at lines 85, 103, 107, 121, 135, 173. This is the classic symptom of missing base typography resets -- a single `.card p, .card h3 { margin: 0 }` rule (or better, a proper vertical-rhythm system with intentional margins) would eliminate ~10 duplicated inline overrides and make future paragraph spacing a one-line CSS change instead of a per-component hunt-and-replace.

- [ ] **P3** · **F051 — Settings modal's fixed 150px tab rail vs. 560px modal width leaves little room on the smallest supported viewports**
  `frontend_2/src/app/globals.css:878`
  `.settings-tabs` is a fixed `width: 150px` (globals.css:878) beside `.settings-pane { flex: 1 }`, inside a `Modal` opened with the default `width="560px"` (Modal.tsx:16) which itself is clamped to `min(560px, calc(100% - 2rem))` (Modal.tsx:63). Below 600px the layout does switch to stacked tabs (globals.css:903-916), but between roughly 600px-680px the modal is exactly at its clamp boundary (100% - 2rem) while still trying to render the 150px rail + pane side by side -- worth confirming this range doesn't produce an uncomfortably narrow pane (560 - 150 - 1.25rem gap - modal padding leaves under 350px for the actual settings content, which is tight for form fields).

- [ ] **P3** · **F052 — Sidebar collapse-to-icon-rail has no equivalent affordance below 720px -- the collapse toggle is orphaned**
  `frontend_2/src/components/sidebar/Sidebar.tsx:32`
  The desktop sidebar's whole interaction model (Sidebar.tsx:32-42, `.sidebar-toggle` button, Ctrl/Cmd+B) is to collapse the 256px rail to a 60px icon-only strip. At <=720px the sidebar restructures into a horizontal top strip instead (globals.css:942-963) but the same toggle button and `is-collapsed` class are still present and wired -- clicking it at mobile width does... something (the CSS rules for `.is-collapsed .sidebar-*` still apply) but there's no visual indication of what a 'collapsed top strip' should look like, and it's untested in the screenshots provided. Either hide the toggle below 720px (mobile has no room for two sidebar states) or explicitly design the collapsed-mobile state.

- [ ] **P3** · **F053 — Dev-bar and dev-main use their own maxw/padding scale disconnected from the app shell's**
  `frontend_2/src/app/globals.css:934`
  `.dev-main` (globals.css:934-938) reimplements a content column with `max-width: var(--maxw); margin: 0 auto; padding: 1.5rem 1rem 4rem` -- nearly identical to but not sharing the exact rule set as `.app-main`'s content children (`.app-main > *` at line 827). Two parallel 'centered content column' definitions that happen to agree today will drift the moment either is tuned during the design pass. Should be one shared class/mixin.

- [ ] **P3** · **F054 — Skeleton loader block heights don't match the real content they precede, causing layout shift on hydration**
  `frontend_2/src/components/Skeleton.tsx`
  dev-skeletons.png shows the `.skeleton` primitive used for the results-table skeleton with row heights that look shorter/tighter than the real `.xl-table td` cells (which have `padding: 0.3rem 0.5rem` plus line-height 1.5 content, globals.css:329-336) -- and the card skeleton's internal block spacing doesn't obviously reserve the same vertical space as a populated FicCard (which has 6+ stacked elements: title row, byline, stat row, summary, why-reason, tags -- vs. the skeleton's 4 fixed bars). Without matching heights, swapping skeleton-to-content on data arrival will visibly reflow the page. Worth an explicit height audit pass once real content shapes are finalized.


## Motion & interaction states (cross-cutting)

*17 findings — P1: 2 · P2: 8 · P3: 7*

- [ ] **P1** · **F055 — View Table/Cards toggle abuses `disabled` to mean "currently selected", so the active view reads as broken/unclickable**
  `frontend_2/src/components/ResultsView.tsx:152`
  In frontend_2/src/components/ResultsView.tsx:150-165, the active layout button gets `disabled={layout === "table"}` / `disabled={layout === "cards"}` instead of a pressed/active visual state. Because `button:disabled { opacity: 0.5 }` (globals.css:57-60) is the only disabled treatment in the app, the CURRENTLY SELECTED view renders faded and inert while the unselected one looks fully solid and clickable — inverted from what users expect (selected = emphasized). This also throws away keyboard/AT semantics: a disabled button isn't focusable, so a screen-reader user tabbing through loses the "which view am I in" toggle entirely. Fix: use `aria-pressed` (already present) purely for state, drop `disabled`, and give the pressed state a real visual treatment (filled bg/bold border), not a `disabled` fade.

- [ ] **P1** · **F056 — Plain `<button>` elements have zero hover or active feedback anywhere in the app**
  `frontend_2/src/app/globals.css:49`
  globals.css only styles `button`, `button:disabled` (lines 42-60) — there is no `button:hover` or `button:active` rule at all for the base element. Every un-classed `<button>` in the app inherits nothing beyond the static grey `#f5f5f5` box: the Refine panel's Platform/Rating/Status/Tag filter pills (FacetFilter.tsx:100-177, only `font-weight` changes on press), the Reset button, Cancel button, Try again button, Modal's ✕ close (Modal.tsx:69), and QuickViewButton's ⤢ (QuickViewButton.tsx:18-25) are all completely static under mouse hover and mouse-down. Compare this to the bespoke classes (`.composer-send`, `.sidebar-*`, `.menu-item`, `.platform-link`) which all correctly darken/press. This is the single biggest hover-coverage gap in the app — roughly a dozen distinct interactive controls give no "this is clickable" feedback beyond the cursor. Add a baseline `button:hover:not(:disabled) { background: #ececec }` / `button:active:not(:disabled) { transform: translateY(1px) }` to the plain button rule so every unstyled control inherits real feedback for free.

- [ ] **P2** · **F057 — FicCard and Refine facet chips have the same pill shape but opposite affordance — no visual language distinguishes decorative tags from clickable filter pills**
  `frontend_2/src/app/globals.css:162`
  `.tag` (globals.css:162-169, used by TagList.tsx:18) renders a rounded-border pill with NO cursor, hover, or active styling — it's purely decorative text-in-a-shape. The Refine panel's filter buttons (FacetFilter.tsx, e.g. platform/rating/tag toggles) render as the SAME rounded/bordered pill shape (visible in dev-fic.png and results screenshots) but ARE clickable filters. A user scanning the results page has no visual cue which pills do something and which don't — both look identical at rest, and (per the finding above) both look identical on hover too since neither changes. Give the two roles distinct treatment: keep `.tag` static/flat, but give filter-pill buttons a filled/bordered hover state plus `cursor: pointer` so "this pill acts" reads visually, not just behaviorally.

- [ ] **P2** · **F058 — Modal has an entrance animation but no exit animation — it vanishes instantly on close**
  `frontend_2/src/components/Modal.tsx:44`
  `.modal` gets `animation: enter-pop 200ms …` and `.modal::backdrop` gets `enter-fade 200ms …` (globals.css:848,853), but Modal.tsx:44 calls `dialog.close()` directly, which removes the native `<dialog>` from the top layer synchronously — there is no CSS mechanism here for a close-triggered animation (native `<dialog>` needs a JS-driven "play exit animation, then call close()" pattern, e.g. an `is-closing` class with a delayed `close()`, or the newer `@starting-style`/`transition-behavior: allow-discrete` approach). Every open (search result quick-view, Settings, Saved/History panels) pops in smoothly and then hard-cuts on Esc/backdrop-click/✕ — a jarring asymmetry that will read as unfinished once other motion is polished. Same issue applies to the Menu popover (`menu-in` keyframe with no exit) and Toast (enter-rise with no exit — see next finding).

- [ ] **P2** · **F059 — Toasts have an enter animation but disappear by instant unmount, not an exit animation**
  `frontend_2/src/components/Toast.tsx:46`
  Toast.tsx:46-48 auto-dismisses by removing the item from `items` state after `DISMISS_MS` (3200ms) via `setState` filter — React unmounts the `.toast` div immediately, so the `enter-rise 200ms` keyframe (globals.css:1195) only ever plays forward. A toast that took 200ms to rise in just disappears with a hard cut, which is more noticeable on a dark rounded chip like this than on plain text. Needs a `data-leaving` class + a second timer (or an exit-capable list library) so the departure mirrors the arrival — even a plain 150ms fade-out would remove the pop.

- [ ] **P2** · **F060 — No sticky header / scroll-shadow anywhere — the app has zero scroll-position affordance**
  `frontend_2/src/components/AppShell.tsx:43`
  AppShell.tsx renders only a fixed left sidebar and a plain scrolling `<main className="app-main">` (AppShell.tsx:43-45) — there is no top header at all, sticky or otherwise, in the real app shell (only the throwaway `.dev-bar` in the /dev route tree gets `position: sticky` + `z-index: 30`, globals.css:919-930). On a long results table or a heavily-tagged fic detail page, once the user scrolls, there's no persistent context (search summary, back-to-top, view toggle) and no visual cue (shadow/border) marking that content has scrolled under anything, because nothing is fixed above it to begin with. This is an IA gap as much as a motion one, but flagging it here because the natural fix (a slim sticky results-summary bar with a scroll-triggered shadow) is a motion/interaction-state feature that's currently entirely absent.

- [ ] **P2** · **F061 — Empty board state (`.bempty`) has no entrance animation, inconsistent with every other board surface**
  `frontend_2/src/components/board/board.css:296`
  board.css defines `bnode-in` and applies it to `.bnode` (line 44) and `.bframe` (line 226), but `.bempty` (lines 296-315, the "An empty board" card shown in board.png on first visit) has no `animation` property at all — it just appears instantly while search-result nodes and frames on the same canvas fade+rise in. Since this is the very first thing a new user sees on `/board`, it's the highest-visibility surface to be inconsistent. Add `animation: bnode-in 240ms …` to `.bempty` to match its siblings (and it's already covered by the existing reduced-motion block's `.bnode, .bframe` selector needing `.bempty` added too, board.css:340-345).

- [ ] **P2** · **F062 — Disabled-state styling is inconsistent: global 0.5 opacity wash vs. the composer's explicit override colors**
  `frontend_2/src/app/globals.css:57`
  Two incompatible disabled patterns coexist. Generic `button:disabled { opacity: 0.5 }` (globals.css:57-60) is the default — used by Cancel/Try-again/Reset/the (misused) view toggle. But `.composer-send:disabled` (globals.css:484-489) explicitly sets `background:#ececec; color:#767676; opacity:1` specifically to avoid the 0.5 wash — the CSS comment even says "explicit disabled colors instead of the global 0.5 wash." `.bdock__go:disabled` and `.bdock__seed:disabled` (board.css:484-487, 497-499) go back to plain `opacity:0.5/0.55`. So three different disabled treatments exist for what should be one state language: fully custom color-swap, generic opacity-halving, and a third opacity value. Once the design layer picks colors, this needs a single disabled-state convention applied everywhere (either "explicit muted colors" everywhere, matching the composer's more considered approach, or a documented single opacity constant) rather than three ad hoc treatments.

- [ ] **P2** · **F063 — Search button gives no in-flight loading affordance beyond a text swap**
  `frontend_2/src/components/SearchForm.tsx:128`
  `.composer-send` shows `{busy ? "Searching…" : "Search"}` (SearchForm.tsx:128) with no spinner, pulse, or disabled visual change tied to `busy` — the button keeps its solid black `#1c1c1c` idle look throughout the multi-second search (per PipelineStatus.tsx's own stage-estimate constants, a real search can run 6+ seconds). A user who glances at the button after clicking sees the exact same button, just with different words — easy to miss, especially since the button doesn't even get `disabled` styling while busy (the `disabled` attribute is presumably applied but there's no dedicated `.composer-send[disabled]` treatment differentiated from the empty-query disabled look, so "working" and "can't submit, nothing typed" render identically). Add a minimal spinner/pulse or at least a distinct "busy" background so the button visibly acknowledges the click.

- [ ] **P2** · **F064 — No card/row → detail view-transition; quick-view modal and full /fic/[id] page are two disconnected pop-ins**
  `frontend_2/src/components/ResultsTable.tsx:139`
  Clicking a result title navigates to `/fic/[id]` (a fresh page load with its own entrance treatment) while QuickViewButton opens the exact same content in a modal that scale-pops from the page center (`transform-origin: center`, globals.css:847) — neither transition originates from the row/card that was clicked. On a spreadsheet-dense results table (ResultsTable.tsx) or a card grid, a shared-element transition (row/card morphs into the modal or detail header) would make the relationship between "the thing I clicked" and "the thing that opened" legible; right now both the modal and the full page just materialize independent of click origin. Worth flagging as a concrete opportunity for the design pass (View Transitions API or a manual FLIP) rather than leaving both as center-anchored pop-ins.

- [ ] **P3** · **F065 — Sidebar collapse/expand press-scale transitions are not covered by the reduced-motion block**
  `frontend_2/src/app/globals.css:296`
  The `prefers-reduced-motion` block at globals.css:296-315 only neutralizes `.sidebar/.sidebar-label/.sidebar-scroll/.app-main` width/opacity transitions and the entrance-animation classes — it does NOT include `.sidebar-toggle`, `.sidebar-cta`, `.sidebar-link`, `.sidebar-account`, `.sidebar-dev` (globals.css:640,681), all of which have `:active { transform: scale(0.9) / scale(0.97) }` press-transitions (globals.css:648-650, 695-700), nor `.platform-link:active { transform: scale(0.96) }` (globals.css:559-569). `.skip-link`'s `transition: top 160ms ease` (globals.css:135) is also uncovered. These are all small (100-160ms) but per Emil-style motion discipline every transform/opacity animation should have a reduced-motion path, and right now roughly six selectors' transitions silently keep animating for users who've opted out. Fold them into the existing reduced-motion rule.

- [ ] **P3** · **F066 — Focus-visible ring uses a fixed hardcoded blue that will clash once brand color is set, and offset isn't verified against dark surfaces**
  `frontend_2/src/app/globals.css:104`
  `:focus-visible { outline: 2px solid #4a78d6; outline-offset: 2px; }` (globals.css:103-107) is a single hardcoded hex, not a CSS variable — every future design pass has to grep-and-replace this literal color rather than repoint one token. It's also used as-is on dark surfaces: the sidebar toggle/rows sit on `--sidebar-bg:#f5f4ef` (fine), but the toast region (`.toast` background `#1c1c1a`, globals.css:1188) and the dev-bar (`#1f2430`, globals.css:925) have no focus-visible target elements today, so this hasn't been visually verified against a dark chip background — a hardcoded mid-blue ring on a near-black toast may read fine, but should be checked once toasts gain any interactive element (e.g. an "Undo" action), since 2px offset outlines can look thin/lost against saturated dark backgrounds. Convert to `outline-color: var(--focus-ring, #4a78d6)` now so the eventual reskin is a one-line token change instead of a find-and-replace.

- [ ] **P3** · **F067 — Skeleton shimmer direction doesn't match the app's implied reading order for RTL-agnostic content, and the shimmer sweep is generic**
  `frontend_2/src/app/globals.css:234`
  `skeleton-shimmer` (globals.css:244-251) always sweeps left-to-right (`background-position: 200% 0` → `-200% 0`) regardless of any future RTL support, and more immediately: the shimmer gradient stops are very low-contrast (`#ececec` → `#f5f5f5` → `#ececec`, a ~2% lightness delta), so at 1440px on a large skeleton block (e.g. the Story-detail skeleton spans in dev-skeletons.png) the moving highlight is barely perceptible — it reads more like a static grey block than an active loading cue. Worth widening the gradient contrast slightly (e.g. `#eee` → `#fafafa`) so the shimmer is legibly "in motion" rather than a subtle flicker, since right now the primary visual signal that content is loading (vs. an empty grey placeholder) is weak.

- [ ] **P3** · **F068 — Sortable table headers only signal sortability via a unicode ⇅ glyph plus a hover background — no consistent affordance with the rest of the app's controls**
  `frontend_2/src/components/ResultsTable.tsx:97`
  `.xl-table th.sortable:hover { background: #e4e7eb }` (globals.css:349-351) is one of the few places a hover DOES exist, but the sort-direction indicator is a raw unicode character (` ⇅`/` ▲`/` ▼`, ResultsTable.tsx:97-103) rendered inline in the button label — it will render with whatever glyph shapes/weights the OS font provides (thin, faint arrows on Windows Segoe UI), inconsistent stroke weight vs. the rest of the UI's text, and no `aria-hidden` wrapper separating it from the readable column label for screen readers beyond relying on `aria-sort` on the `<th>`. Swap for a small inline SVG/icon-font arrow with consistent stroke width, and wrap the glyph in `aria-hidden="true"` explicitly.

- [ ] **P3** · **F069 — Row/card stagger delay is capped but not reduced for prefers-reduced-motion, only removed at the animation level — inline styles still compute unnecessarily**
  `frontend_2/src/components/ResultsTable.tsx:142`
  Both ResultsTable.tsx:142 and ResultsView.tsx:218 set `style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}` unconditionally, then rely on the CSS `.xl-row-enter { animation: none }` reduced-motion override to neutralize it. This works correctly (no visible stagger when reduced-motion is on, since `animation:none` also cancels delay), but it's worth noting the whole `animationDelay` computation and inline style attriboute still gets set on every row regardless of the user's motion preference — a very minor inefficiency, and more importantly: if a future dev swaps `.xl-row-enter`'s reduced-motion rule for `animation-duration:0` instead of `animation:none` (an easy mistake when "fixing" something else), the per-row delay would suddenly reappear as a staggered instant-cut sequence. Low risk today, but worth a code comment flagging the coupling.

- [ ] **P3** · **F070 — Composer suggestion tray items have hover but no visible press/active state**
  `frontend_2/src/app/globals.css:522`
  `.composer-tray-item:hover { background: #f4f4f4 }` (globals.css:522-524) exists, but there's no `:active` treatment — clicking a recent-search suggestion in the tray (SearchForm.tsx:145-161) gives no press feedback beyond the browser's default (none, since it's a custom-styled button with `background:transparent` overridden). Every other clickable list-row pattern in the app (`.sidebar-cta/-link`, `.menu-item`) gets at minimum a hover fill; the tray only gets hover, no press state, so clicking feels slightly less "solid" than the composer's own submit button, which explicitly calls out press-travel as a design principle in its CSS comment (globals.css:392).

- [ ] **P3** · **F071 — MatchScore atoms (97/100 vs 71/100 vs 12/100 vs unranked) render with identical visual weight in dev-components.png — no color/motion cue distinguishes score tiers**
  `frontend_2/src/components/MatchScore.tsx:1`
  Visible in dev-components.png's "MatchScore" atoms row: `97/100`, `71/100`, `12/100`, and `— unranked` all render in the same black bold-number + grey-`/100` styling with zero differentiation by score tier. This is primarily a color-system concern (out of this dimension's core scope), but it intersects motion/interaction because a natural companion treatment — e.g. a subtle fill/pulse on a genuinely new high-scoring result, or a distinct entrance emphasis for top matches — has no hook to attach to today since there's no visual score-tier distinction at all to key off of. Flagging so the eventual score-tier color pass and any "highlight new top match" motion work are planned together rather than bolted on separately later.


## Iconography, imagery & brand assets (cross-cutting)

*15 findings — P1: 2 · P2: 9 · P3: 4*

- [ ] **P1** · **F072 — No favicon, app icon, or OG image anywhere in the app**
  `frontend_2/src/app/layout.tsx:6`
  src/app/ has no favicon.ico, icon.png/svg, apple-icon.png, or opengraph-image — Next.js App Router auto-picks these up by filename and none exist (confirmed: no public/ directory at all, and layout.tsx's metadata export at line 6-11 sets only title/description, no icons/openGraph field). The browser tab and any shared link currently render Next's generic default icon. This is a P1 because it's not a missing polish detail — it's the single most visible, unavoidable brand touchpoint (every tab, every bookmark, every social share) rendering as a placeholder.

- [ ] **P1** · **F073 — Signed-out account avatar renders a literal "?" that reads as a broken/error icon, not a default-avatar state**
  `frontend_2/src/components/sidebar/AccountButton.tsx:22`
  AccountButton.tsx line 22 computes `initial = authed ? user.email[0].toUpperCase() : "?"` — for the unauthenticated state (the default state every new visitor sees) this renders a bare question mark inside the 1.45rem avatar circle (globals.css line 1072-1082). Visible in home.png, saved.png, history.png, m-home.png — it looks exactly like a "missing glyph" placeholder or an error state, not an intentional "not signed in" avatar. A generic user-outline icon (or simply no circle at all, replaced by a plain "Sign in" label) would avoid the accidental error-icon read.

- [ ] **P2** · **F074 — Wordmark is unstyled bold text with no mark, symbol, or distinguishing treatment**
  `frontend_2/src/components/sidebar/Sidebar.tsx:43`
  "FicFinder" renders as plain <strong>-weight text in the sidebar brand slot (className="sidebar-label", no logotype styling) and as a plain <h1> on the homepage. There is no icon, monogram, or custom typographic treatment — it's indistinguishable from any other bold heading in the app. Visible in home.png and m-home.png top-left. A real product needs at least a simple mark (even a geometric monogram) paired with the wordmark so it reads as a brand, not a page title.

- [ ] **P2** · **F075 — Sidebar uses eight different unicode glyphs as icons with no shared icon system**
  `frontend_2/src/components/sidebar/Sidebar.tsx:41`
  Sidebar.tsx alone uses ☰ (expand), ‹ (collapse), ＋ (new search), ★ (saved), ↺ (history), ▦ (board), ⌗ (dev). Each is sized independently in CSS with no shared scale: .sidebar-ic is font-size 0.95rem/width 1.2rem (line 706-711), .sidebar-toggle is font-size 1rem (line 638), .sidebar-account-caret is 0.75rem (line 1088), .sidebar-row-pin is 0.72rem (line 1063). Weight and optical size vary per-glyph since they're arbitrary characters from different Unicode blocks (Miscellaneous Symbols, Arrows, Box Drawing, General Punctuation), not a matched icon family — visible in home.png/saved.png/history.png as a visually noisy nav column where every icon has a different stroke weight and visual center. Should be replaced with a real icon set (Lucide/Phosphor/Heroicons) at one consistent size/stroke-width token.

- [ ] **P2** · **F076 — Platform favicons via Google's favicon service render inconsistent, off-brand artwork inside the app's own icon-pill chrome**
  `frontend_2/src/components/PlatformLogo.tsx:124`
  PlatformLogo.tsx line 124 fetches `https://www.google.com/s2/favicons?domain=...&sz=64` for AO3/FFN/Wattpad. Confirmed in dev-fic.png: the AO3 favicon renders as a small reddish glyph that doesn't match FFN's blue "F" square or Wattpad's orange "W" in style, weight, or shape — each site's real favicon has wildly different art direction (flat icon vs. wordmark-derived vs. logomark), so the trio never reads as a matched row of platform badges even though they sit in identical .platform-link pills. There's also no dark-mode variant (Google's service returns one fixed rendition regardless of the app's theme) and the offline/blocked-request fallback (LetterTile, line 68-103) uses a totally different visual language (flat colored square + system-font letter) than the favicons it replaces, so a flaky network turns three consistent lettermark tiles into a jarring mix of real favicons + fallback tiles mid-list.

- [ ] **P2** · **F077 — The <select> dropdown (Fandom picker) is unstyled and shows the OS-native chevron**
  `frontend_2/src/app/globals.css:92`
  globals.css line 92 gives `<select>` only padding/border/radius/width — no `appearance: none` + custom chevron, so it renders the raw OS dropdown arrow (visible in home.png next to "All Fandoms", clearly a plain double-chevron glyph in a different visual language from the rest of the composer). The composer-rail select variant (line 451-461) restyles border/background but still leaves the native arrow. This is the most-used control on the homepage (fandom selection is core to every search) and it's the one piece of default OS chrome breaking an otherwise custom composer.

- [ ] **P2** · **F078 — No empty-state illustration slot exists anywhere — every empty state is a plain text sentence**
  `frontend_2/src/components/sidebar/RecentsList.tsx:84`
  Confirmed across saved.png ("No followed searches yet…"), history.png ("No searches yet…"), board.png ("An empty board…" card), and RecentsList.tsx line 84-89 (sidebar's own empty state, "Searches you run show up here for quick access."). None have an icon, illustration, or visual anchor — just left-aligned body copy at the same weight as everything else, so an empty state and a loading/error state are visually indistinguishable at a glance. Even a single small line-icon (search glyph, empty-folder glyph) above the copy would give these states a recognizable silhouette before the user reads the words.

- [ ] **P2** · **F079 — Toast notifications have no icon to distinguish success/info from error at a glance**
  `frontend_2/src/components/Toast.tsx:56`
  Toast.tsx renders a plain text message; the only visual differentiator between tones is background color (globals.css line 1187-1199: default #1c1c1a vs. error #7a1c17 — both dark, similar luminance, distinguished only by hue). A user with any color-vision deficiency, or anyone glancing at a toast in peripheral vision, gets no non-color signal for "this succeeded" vs. "this failed." A checkmark/warning icon prefix would fix both the accessibility gap and the visual flatness.

- [ ] **P2** · **F080 — Sort indicators and quick-view glyph use obscure Unicode arrow-block characters with real cross-platform tofu risk**
  `frontend_2/src/components/board/NodeTable.tsx:125`
  ResultsTable.tsx/NodeTable.tsx use ▲ ▼ ⇅ (sort direction, lines 99-103) and ⤢ (quick view, line 24 of QuickViewButton.tsx / line 189 of NodeTable.tsx — U+2922 NORTH EAST AND SOUTH WEST ARROW, a rare Miscellaneous Symbols and Arrows character). ⇅ and ⤢ specifically are outside the common emoji/arrows range most system fonts guarantee — on Android Chrome and some Linux font stacks these commonly render as a missing-glyph "tofu" box rather than an arrow, silently turning a functional sort/quick-view affordance into an unlabeled empty square. Should be swapped for an SVG icon set so rendering doesn't depend on font glyph coverage.

- [ ] **P2** · **F081 — PipelineStatus loading-stage markers are tiny, low-contrast punctuation instead of real status icons**
  `frontend_2/src/components/PipelineStatus.tsx:107`
  PipelineStatus.tsx line 107 uses `✓` (done), `…` (active), `·` (pending) as the marker for each search stage, rendered at inherited body text size in a fixed 1.2em box (line 115). The pending marker `·` is a single small dot at 0.5 opacity (line 113) against --muted #666 on --bg #fff — functionally near-invisible as a status affordance, and none of the three glyphs read clearly as "done/in-progress/waiting" without reading the adjacent label text. This is the loading scene's primary visual feedback loop (the CLAUDE.md doc even calls it "the loading scene's data anchor") and currently has no real iconography — a checkmark icon + spinner + empty-circle icon triad (like a typical stepper component) would communicate state at a glance.

- [ ] **P2** · **F082 — No PlatformLogo appears anywhere in the results table or card — the platform is shown as plain text ("AO3", "FFN", "Wattpad") except in the Link column**
  `frontend_2/src/components/ResultsTable.tsx:152`
  ResultsTable.tsx line 152 (`<td>{fic.platform}</td>`) and FicCard.tsx line 55 (`<span>{fic.platform}</span>`) render the platform as a bare text string in the metadata row, while PlatformLogo only appears inside PlatformLink (the outbound link button) and FicDetail's CTA. This means the fastest visual scan point for "which site is this from" — a column any real reader would want at a glance — has no icon at all in the two most common result-browsing views (table + card), forcing users to read three-to-eight-character abbreviations instead of recognizing a colored badge. Since PlatformLogo already exists and is decorative-mode-ready (`decorative` prop), it's a straightforward drop-in that's simply missing from these two surfaces.

- [ ] **P3** · **F083 — External-link arrow glyph is inconsistent between two CTAs for the same action**
  `frontend_2/src/components/FicDetail.tsx:129`
  PlatformLink.tsx (used in table/board rows) renders `↗` (NORTH EAST ARROW, line 30) next to the platform favicon. FicDetail.tsx's "Read on {platform} →" button (line 129, used on the fic detail page/modal) renders a plain `→` (RIGHTWARDS ARROW) as inline text with no visual pairing to the favicon icon. Both mean "this leaves the app," but they use different glyphs at different visual treatments (icon-pill vs. inline text suffix) for what is functionally the same CTA. Pick one external-link icon and use it everywhere this action appears.

- [ ] **P3** · **F084 — Checkboxes render as fully unstyled native browser controls in two places**
  `frontend_2/src/app/globals.css:462`
  Both the homepage composer's "Strict filters" checkbox (globals.css line 462, `.composer-rail input[type="checkbox"] { width: auto; }` — the only rule, no appearance/accent-color/size override) and FacetFilter.tsx's "Ranked only" checkbox (line 215, inline `style={{ width: "auto" }}` only) render as the bare OS checkbox — visibly a small blue-square Chrome default in home.png. It's the only fully browser-chrome control on an otherwise custom-styled composer (custom border, shadow, radius, focus ring). Needs at minimum `accent-color` matching the design tokens, ideally a custom checkbox treatment consistent with the button/input system.

- [ ] **P3** · **F085 — Follow/unfollow search button uses ★/☆ glyphs at default browser text weight — no distinct pressed-state visual beyond a font-weight bump**
  `frontend_2/src/components/SavedSearchButton.tsx:31`
  SavedSearchButton.tsx line 31 renders "★ Following" vs "☆ Follow search" as the entire button label, with the only additional differentiation being `fontWeight: isSaved ? 700 : 400` (line 29). The two states rely on a filled vs. outline star glyph rendered inline with text at the same size/color as the label — easy to miss the state change since it's a subtle glyph swap inside a text string rather than a dedicated icon+label layout. Also duplicates the ★ glyph already used for "Saved" in the sidebar nav (Sidebar.tsx line 52) and for pinned-row markers (SidebarRow.tsx line 66) — three different meanings (nav destination, pin marker, follow-toggle) sharing one glyph.

- [ ] **P3** · **F086 — Sidebar recent-search kebab menu (⋯) and board duplicate button (⧉) are rare/decorative Unicode glyphs with no consistent icon-button treatment**
  `frontend_2/src/components/sidebar/SidebarRow.tsx:75`
  SidebarRow.tsx line 75 uses `⋯` (HORIZONTAL ELLIPSIS, U+22EF, distinct from the three-dot "…" used elsewhere) for the kebab/overflow menu trigger, and GroupFrame.tsx line 58 uses `⧉` (SQUARED SQUARE, U+29C9 — an obscure Miscellaneous Mathematical Symbols-A character with no intuitive "duplicate" association) for "duplicate this search." Neither glyph is a recognizable UI convention (a real kebab is normally three filled dots ⋮, and "duplicate" is normally two overlapping rectangles/a copy icon) — a first-time user has no visual affordance for what these buttons do beyond the title tooltip, and ⧉ specifically risks tofu rendering on the same grounds as the ⇅/⤢ finding above.


## App shell & sidebar

*13 findings — P1: 1 · P2: 4 · P3: 8*

- [ ] **P1** · **F087 — Mobile empty-state copy is clipped mid-word, leaving a stray glyph**
  `frontend_2/src/components/sidebar/RecentsList.tsx:86`
  In m-home.png the RecentsList empty string "Searches you run show up here for quick access." (RecentsList.tsx:86) renders as "Searches you run show up here †" — cut off inside the word "for", leaving a floating fragment that reads as a rendering artifact/typo, not a truncation ellipsis. This is a direct symptom of the row/column collision above: the empty-state `<p>` is being squeezed into a narrow flex column it wasn't designed for. Once the top-strip layout is fixed (previous finding) this should resolve, but the empty-state text itself should also get `overflow-wrap: normal` / no `white-space: nowrap` ancestor so it never depends on infinite width.

- [ ] **P2** · **F088 — Kebab menu trigger (⋯) has no visible affordance and a tiny hit target**
  `frontend_2/src/components/sidebar/SidebarRow.tsx:75`
  SidebarRow.tsx:75 renders the kebab as bare `⋯` text inside `.sidebar-row-kebab` (globals.css:981-992), which is `opacity: 0` until hover/focus and has only `padding: 0.15rem 0.35rem` — well under the ~24-28px comfortable/44px WCAG-recommended touch target, and per the `@media (hover: none)` rule (line 1004-1008) it's permanently visible-but-tiny on touch devices with nothing to indicate its boundary (no border/background at rest). On a touchscreen this is a hard-to-hit, hard-to-notice control. Give it a minimum ~32x32px hit area and a faint persistent background/circle so it reads as a button, not stray punctuation.

- [ ] **P2** · **F089 — "New search" CTA visually reads as a plain input field, not a primary action button**
  `frontend_2/src/app/globals.css:683`
  `.sidebar-cta` (globals.css:683-688) is `background: #fff; border: 1px solid #e2e0d7` with the same border-radius/padding as every other row — in home.png it renders as a white pill that, sitting directly under the sidebar's off-white background, looks identical to a disabled search box or a card, not the primary call-to-action it functionally is (the one item users are meant to reach for constantly). There's no color, weight, or icon treatment that says "primary" versus the plain nav rows below it beyond a 1px border. Consider a filled/accent treatment once the design pass has a palette — flagging now so it isn't skipped as "already styled".

- [ ] **P2** · **F090 — Active-route highlighting is a flat background fill indistinguishable from :hover — no persistent "you are here" marker**
  `frontend_2/src/app/globals.css:759`
  `.sidebar-search-item[aria-current="page"]` (globals.css:759-762) and the equivalent for nav items both just apply `background: var(--sidebar-hover)` plus `font-weight: 600` — the exact same background color used for the transient `:hover` state (line 756-757, 689-693). A user can't tell, from a static glance, whether a row is highlighted because their mouse happens to be over it or because it's the active page; the only differentiator is font-weight, which is subtle at this size (0.88-0.92rem). Add a distinct treatment for the active state (e.g. a left accent bar, different fill, or icon color change) that's visually distinct from hover.

- [ ] **P2** · **F091 — History page heading area has no supporting visual weight — H1 + one gray sentence floating alone at the top of a large empty canvas**
  `frontend_2/src/components/panels/HistoryPanel.tsx:51`
  history.png shows "Search history" as a bare H1 followed by a single muted sentence ("No searches yet. Your search history lives only in this browser.") with nothing else on the page — no illustration, icon, or bordered empty-state container, just left-aligned text at the top of an otherwise completely blank ~800px-tall white canvas. Compared to the home page (which at least has the search composer card), this reads as an unfinished/broken page rather than an intentional minimal empty state. Even for the skeleton phase, wrap the empty message in a `.card`-style container or add an icon slot so it doesn't look like content failed to load.

- [ ] **P3** · **F092 — Account row caret (⌃) is upside-down relative to its own disclosure convention and easy to misread as decoration**
  `frontend_2/src/components/sidebar/AccountButton.tsx:36`
  AccountButton.tsx:36-37 uses `⌃` (a chevron pointing up) as the menu-open indicator, styled tiny and muted (`.sidebar-account-caret`, globals.css:1085-1089, `font-size: 0.75rem`, `color: var(--muted)`). An up-caret at rest conventionally signals "this expands upward" (correct here, since the Menu opens with `placement="top-start"） -- but visually, sitting flush right of the label at 0.75rem in muted gray, it reads more like a stray typographic mark than an actionable disclosure indicator (compare to how faint/small it is in the home.png crop next to the bold "Account" label). Increase its size/contrast slightly and treat it as a first-class icon (rotates or otherwise animates on open) rather than inline muted text.

- [ ] **P3** · **F093 — Sidebar brand wordmark has no logomark, just bold text — no distinct visual identity at the rail's most prominent position**
  `frontend_2/src/components/sidebar/Sidebar.tsx:43`
  `.sidebar-brand` (Sidebar.tsx:43-45, globals.css:651-660) is literally `font-weight: 700; font-size: 1.05rem` on the text "FicFinder" with no icon/mark slot at all. It's the single most prominent, top-left element of the entire app (per claude.ai/ChatGPT-style conventions this slot usually carries a small logomark beside the wordmark) and currently it's indistinguishable from a bolded nav label. Even for a skeleton pass, reserve a square icon slot (e.g. 20x20px) to the left of the text so the design pass has a natural mark placement, and so the brand row doesn't visually blend into the nav rows below it.

- [ ] **P3** · **F094 — Collapsed rail (60px) has never been screenshotted/verified in the provided captures — the audit set only shows expanded state**
  `frontend_2/src/app/globals.css:619`
  `--sidebar-w-collapsed: 60px` (globals.css:581) with all `.sidebar-label` faded via `opacity/max-width` (lines 765-778) is real, tested code, but none of home.png/m-home.png/history.png show it collapsed. Given `.sidebar-ic` is only `width: 1.2rem` (19px) centered and `.sidebar-avatar` is `1.45rem` (23px), at 60px rail width with ~10px horizontal padding on each side there's very little margin for error before icons feel cramped or off-center against the toggle button above them (which itself only centers via `.is-collapsed .sidebar-top { justify-content: center }`, line 804-806, without matching the icon column's exact horizontal center). This should get a dedicated screenshot pass to confirm icon alignment in the collapsed rail lines up visually with the toggle above it — right now it's unverified.

- [ ] **P3** · **F095 — RECENT / "Recent" section label casing is inconsistent between the live app and RecentsList source**
  `frontend_2/src/components/sidebar/RecentsList.tsx:22`
  home.png/m-home.png/history.png all show "RECENT" in small-caps styling, but RecentsList.tsx:71,84 literally renders the string `"Recent"` — the uppercase rendering must be coming from `text-transform: uppercase` on `.sidebar-section-label` (globals.css:735). That's fine for the empty-state label, but note `Section()` (RecentsList.tsx:22-35) reuses the same class for *populated* group labels like "Pinned" and time-group labels ("Today"/"Yesterday") — worth confirming those also read well in all-caps at 0.72rem/uppercase before the design pass, since "Yesterday" in tiny uppercase letterspaced text is markedly harder to scan than sentence case. Flagging as a polish check, not a bug.

- [ ] **P3** · **F096 — Sidebar palette (warm off-white #f5f4ef) vs content canvas (pure white #fff) creates a visible but unexplained seam**
  `frontend_2/src/app/globals.css:582`
  `--sidebar-bg: #f5f4ef` (globals.css:582) against `--bg: #fff` (line 16) plus a 1px `#e7e5dd` border (line 610) produces a clearly visible two-tone split down the page in every screenshot — which is fine as a structural cue, but the warm cream vs stark white pairing currently reads as arbitrary/unfinished rather than intentional, especially since nothing else in the app picks up the warm cream tone (the content canvas, cards, and modals are all pure white/`--bg`). Either tie the sidebar tone into a broader warm-neutral palette used elsewhere, or flag explicitly for the design pass that this contrast is a placeholder, not a decision.

- [ ] **P3** · **F097 — Recents skeleton rows use generic gray bars with no shimmer/pulse — reads as static gray blocks, not "loading"**
  `frontend_2/src/components/sidebar/RecentsList.tsx:75`
  `.sidebar-recent-skel` (globals.css:1018-1034) sets height/width per nth-child but I don't see a shimmer/pulse animation defined for `.skeleton` in the reviewed sections — worth confirming the shared `.skeleton` base class (referenced in RecentsList.tsx:75) actually animates; if it's a flat static gray bar with no motion, users have no visual cue that the sidebar is loading versus permanently showing empty gray rectangles. (Flagging for verification since the base `.skeleton` class wasn't in the audited CSS ranges — if it does animate elsewhere in globals.css this can be downgraded/dropped.)

- [ ] **P3** · **F098 — Pin marker (★) on pinned recent rows visually duplicates the Saved nav icon, creating ambiguous iconography**
  `frontend_2/src/components/sidebar/SidebarRow.tsx:65`
  SidebarRow.tsx:64-68 prefixes a pinned recent-search row with `★` (`.sidebar-row-pin`, globals.css:1060-1066), while the "Saved" nav item (Sidebar.tsx:52) uses the *same* `★` glyph for a functionally different concept (saved fics vs. pinned searches). Reusing the identical icon for two different actions/objects (saving a fic vs. pinning a search) will teach users the wrong mental model once real content exists — a pin icon (📌 or a proper pin-glyph) should be used for "pinned search" so it's visually distinct from "Saved" in the nav.

- [ ] **P3** · **F099 — Menu popover shadow/border treatment doesn't match the app's otherwise near-flat visual language, will look inconsistent once other surfaces are styled**
  `frontend_2/src/app/globals.css:1112`
  `.menu-inner` (globals.css:1106-1116) uses a fairly heavy `box-shadow: 0 12px 34px rgba(0,0,0,0.18)` combined with a full 1px border — noticeably more "elevated" than anything else in the audited surface (sidebar rows, CTA, brand all use flat fills/thin borders with no shadow). Not wrong in isolation, but worth flagging that the menu's elevation language hasn't been reconciled with the rest of the shell's flatter aesthetic — likely fine to leave as a placeholder, but call it out so the design pass treats elevation as a system decision rather than per-component.


## Home & search composer

*20 findings — P1: 1 · P2: 7 · P3: 12*

- [ ] **P1** · **F100 — Composer note is flush against the composer's own bottom border with zero clearance**
  `frontend_2/src/app/globals.css:1207`
  Live-measured bounding boxes confirm the .composer-note paragraph's bottom edge lands at the exact same y-coordinate as the parent .composer div's bottom edge — the note text has no bottom padding/margin before the 1px border. In home.png this reads as the error text crowding/touching the composer's ground edge rather than resting inside it with breathing room. SearchForm.tsx renders <p className="composer-note muted"> as the last child of .composer (line 132-137), and .composer-note (globals.css:1207-1210) only sets margin-top: 0.5rem with no margin-bottom or padding-bottom. Add padding-bottom: 0.6rem (or a bottom margin) to .composer-note, or give .composer itself a bottom padding that accounts for note content, so the note has the same ~0.5rem clearance from the border that the rail has from the note.

- [ ] **P2** · **F101 — Composer sits in a vast, purposeless dead zone with no guidance for what to do next**
  `frontend_2/src/app/(app)/page.tsx:20`
  In home.png and the live render, the composer occupies roughly the top 135px of a ~900px-tall canvas; everything below to the bottom of the viewport is blank white space (m-home.png shows the same at mobile scale — over 1000px of nothing under the composer). For a first-run/empty state this is a missed opportunity: no example queries, no suggestion chips, no trending fandoms, no recent-search shortcuts (those exist in the sidebar's RECENT list but nothing surfaces in the main canvas). A first-time user has zero affordance for what a good query looks like beyond the placeholder text. Add a below-composer content zone: 3-5 clickable example-query chips (e.g. "enemies to lovers slow burn no major character death"), or a compact 'Popular fandoms' row, so the page has a clear secondary action beyond typing from scratch.

- [ ] **P2** · **F102 — Fandom-load error note has no visual distinction from a neutral status message**
  `frontend_2/src/components/SearchForm.tsx:132`
  The .composer-note uses .muted (color: var(--muted) = #666, font-size: 0.9em) — identical treatment to any secondary caption text elsewhere in the app. There's no icon, no warning color, no left-border accent — a user scanning the page has no signal that something failed (the fandom list) versus this being routine helper copy. Give error-toned notes a distinct visual language: a small warning/info icon, and/or a warmer neutral (not full red/error since the app still functions) so 'something didn't load' reads differently from 'here's a hint'.

- [ ] **P2** · **F103 — Fandom-load failure has no retry action, silently degrading a real feature**
  `frontend_2/src/components/SearchForm.tsx:132`
  When useFandoms() errors, SearchForm just prints static text ('showing All Fandoms only') with no way to retry the fetch — the user is stuck on 'All Fandoms' for the session even if the failure was transient (e.g. backend cold-start). Add a 'Retry' linklike button inline in the note (pattern already exists elsewhere per the .linklike CSS class), so a flaky load isn't a dead end.

- [ ] **P2** · **F104 — Page title and tagline have no real typographic hierarchy beyond raw browser defaults**
  `frontend_2/src/app/globals.css:36`
  h1 in globals.css only sets line-height: 1.2 — no explicit font-size, font-weight, or letter-spacing is defined anywhere for h1/h2/h3, so 'FicFinder' renders at the browser UA-stylesheet default (~2em / 32px bold). The tagline directly below uses .muted at 0.9em with no distinct max-width, so on desktop (home.png) it stretches nearly the full 880px composer width as one long line, reading more like a disclaimer than a value-prop subhead. Define an explicit type scale (h1 ~28-34px/600-700 weight, tagline ~15-16px with a measured max-width around 60-70ch) so the hierarchy is intentional rather than inherited from UA defaults.

- [ ] **P2** · **F105 — Pipeline status stage markers use raw Unicode glyphs (✓ … ·) instead of a real icon/spinner system**
  `frontend_2/src/components/PipelineStatus.tsx:107`
  PipelineStatus.tsx:107 sets marker = s==="done" ? "✓" : s==="active" ? "…" : "·" and renders it as plain text in a fixed-width span. Live-captured render shows these at default text size/weight/color, so 'done' and 'pending' are distinguished only by glyph shape at small size plus a 0.5 opacity dim on the whole <li> — no color coding (e.g. green check, spinning indicator for active). This is functional but visually thin for a multi-second loading state the user stares at. Swap to a small icon set (check-circle / spinner / empty-circle) with color semantics (success green, active blue/brand, pending gray), and give 'active' a real animated spinner instead of a static ellipsis character.

- [ ] **P2** · **F106 — PipelineStatus card has no visual distinction from any other .card on the page**
  `frontend_2/src/components/PipelineStatus.tsx:102`
  PipelineStatus.tsx:102 renders <div className="card stack" aria-live="polite" aria-busy="true">, reusing the same generic .card (globals.css:157: 1px border, 6px radius, flat padding) used for every other bordered box in the app (FacetFilter, FicCard, etc). Live screenshot confirms the loading state looks identical in weight/chrome to a static content card — nothing signals 'this is actively working' at a glance beyond the small in-list ellipsis marker. A loading state this central to the product (every search passes through it) should have distinct visual treatment: a subtle pulsing border/background, a slim top progress bar, or at minimum a spinner icon next to the 'Searching…' heading.

- [ ] **P2** · **F107 — Mobile composer control rail wraps controls with cramped vertical spacing and a right-aligned button that visually separates from its siblings**
  `frontend_2/src/app/globals.css:436`
  m-home.png at 390px shows the fandom select + strict-filters checkbox on one row and the Search button dropped to its own row below (margin-left: auto in .composer-rail with flex-wrap: wrap causes this), leaving a large empty gap between the checkbox row and the button. The button, now alone on its row, reads visually disconnected from the fandom/strict controls above it rather than as part of one cohesive control rail. At the mobile breakpoint, make the Search button full-width or stack all three controls in a single vertical list with consistent full-width sizing, rather than letting flex-wrap produce an orphaned right-aligned button.

- [ ] **P3** · **F108 — Composer's internal padding is inconsistent between input and rail, and cramped for its role as the page's primary object**
  `frontend_2/src/app/globals.css:416`
  .composer-input uses padding: 0.85rem 1rem 0.4rem (asymmetric, especially the thin 0.4rem bottom) while .composer-rail uses padding: 0.5rem 0.6rem 0.6rem 1rem (different left values are fine — right side differs from input's implicit 1rem too). The result, visible in home.png, is a composer box that feels tightly packed for what is the single most important control on the page — the primary search entry point deserves generous internal spacing (12-16px minimum vertical rhythm between input text baseline and the rail) to read as an inviting, spacious 'front door' rather than a compact form field.

- [ ] **P3** · **F109 — Pending pipeline stages are dimmed via opacity alone, which also washes out their text color redundantly with .muted patterns used elsewhere**
  `frontend_2/src/components/PipelineStatus.tsx:113`
  PipelineStatus.tsx:113 applies inline style={{ opacity: s === "pending" ? 0.5 : 1 }} to the whole <li>, including its marker and label text. This works but is a blunt instrument — at 0.5 opacity against a white background, pending-stage text (already default #111) lands around a pale gray that's hard to distinguish at a glance from the 'active' stage's own muted '(working…)' suffix, which uses a different mechanism (.muted class, color #666). Two different dimming systems (opacity wash vs. explicit muted color) are used for adjacent purposes in the same component — pick one (prefer explicit color tokens over opacity, since opacity also affects any future icon color/contrast unpredictably).

- [ ] **P3** · **F110 — Disabled Search button's text fails AA contrast against its own disabled background**
  `frontend_2/src/app/globals.css:487`
  Live-inspected computed styles: .composer-send:disabled sets color:#767676 on background:#ececec (globals.css:484-489). Contrast ratio computes to ~3.65:1, below the 4.5:1 AA threshold for normal text (WCAG technically exempts disabled controls, but the button is disabled by default on page load — see next finding — so this low-contrast gray text is often the FIRST thing a user sees of the primary CTA). Darken the disabled text to at least #595959 (matches the placeholder color already used elsewhere in this file) to read clearly even in its default disabled state.

- [ ] **P3** · **F111 — Search button renders disabled on first paint with no visual cue that typing will enable it**
  `frontend_2/src/components/SearchForm.tsx:41`
  canSubmit = q.trim().length > 0 && !busy (SearchForm.tsx:41) means the Search button is disabled the instant the page loads (empty query) — confirmed in home.png where the button reads as flat gray. There's nothing wrong with disabling it, but paired with finding above (weak disabled contrast) and no tooltip/affordance, first-time users see a grayed-out primary action with no explanation. Consider a subtle 'type to search' cue (e.g. placeholder-colored icon inside the button, or simply ensure disabled contrast is strong enough that it doesn't read as broken/loading).

- [ ] **P3** · **F112 — Fandom select's disabled 'not indexed' options are distinguished only by browser-default disabled-option styling plus a text suffix**
  `frontend_2/src/components/SearchForm.tsx:112`
  SearchForm.tsx:112-115 renders <option disabled>{f.name} (not indexed)</option> for uncollected fandoms — relying entirely on the browser's native disabled-option rendering (grayed text, no custom styling possible cross-browser for <option>) plus a parenthetical suffix. This is functional but the suffix reads as noisy engineering-speak ('not indexed') rather than user-facing language, and there's no way to visually scan the dropdown for which fandoms are searchable without reading every label. Rephrase to plain language (e.g. '— coming soon' or '— no results yet') and consider grouping indexed fandoms above a divider from not-yet-indexed ones via <optgroup> so the common case (searchable fandoms) sorts first.

- [ ] **P3** · **F113 — Composer suggestion tray items show query and fandom with no visual separation beyond justify-content: space-between**
  `frontend_2/src/app/globals.css:508`
  .composer-tray-item (globals.css:508-520) lays out <span>{h.q}</span> and <span className="muted">{h.fandom}</span> with justify-content: space-between and gap: 1rem — on a narrow viewport or with a long query, the fandom label likely gets pushed far right with no visual grouping/icon (no clock icon for 'recent', no visual chip around the fandom name). This is a minor list-row craft issue: a recent-search row would read more like a real product feature (vs. a raw data dump) with a small leading icon (history/clock) and the fandom rendered as a small pill/tag rather than bare muted text.

- [ ] **P3** · **F114 — Composer has no placeholder icon or visual affordance signaling 'this is a search box' beyond a text cursor**
  `frontend_2/src/components/SearchForm.tsx:83`
  The composer is a bare bordered box with a textarea and placeholder text 'Describe the fic you're looking for…' — no magnifying-glass icon, no send/arrow icon on the button beyond the word 'Search'. Compared to any modern search/chat composer (the code comments explicitly reference 'chatbox' and 'chat-style' as the intended metaphor), the current build has none of the iconography that signals that metaphor visually — it currently reads as a generic web form. Add a search or send icon (e.g. inside .composer-send, replacing/accompanying the text, or a leading icon in the textarea) to reinforce the intended chat-composer affordance.

- [ ] **P3** · **F115 — Strict-filters checkbox uses the bare unstyled native checkbox with no custom sizing or spacing consistency**
  `frontend_2/src/app/globals.css:462`
  .composer-rail input[type="checkbox"] (globals.css:462-464) only sets width: auto — no custom size, no accent-color, no alignment tuning against its label text. Live render shows a tiny ~13px native browser checkbox sitting slightly lower than the 'Strict filters' text baseline (default OS rendering, not vertically tuned). At minimum set accent-color to match the eventual brand action color (or the current --fg/#1c1c1c used by .composer-send) so it doesn't render in the OS-default blue, which currently clashes with the otherwise all-grayscale composer chrome (visible in home.png — the checkbox is plain, unstyled, browser-native).

- [ ] **P3** · **F116 — Mobile heading/tagline consume disproportionate vertical space relative to the composer below it**
  `frontend_2/src/app/(app)/page.tsx:22`
  m-home.png shows 'FicFinder' at a large size plus a 3-line-wrapped tagline taking up roughly 200px of the 812px mobile viewport before the composer even starts — nearly a quarter of the visible fold on a phone-sized screen. At mobile widths, consider tightening the h1 size and/or shortening the tagline (or truncating to one line with the full text available via a tooltip/expand), so the composer — the actual actionable element — appears higher in the initial viewport.

- [ ] **P3** · **F117 — Placeholder text color, while passing AA, reads visually indistinguishable from typed input at a glance in screenshots**
  `frontend_2/src/app/globals.css:429`
  .composer-input::placeholder sets color: #595959 explicitly labeled in a code comment as 'dark enough to read as intent, not a whisper (AA)' — but live-inspected typed text color is #111 (rgb(17,17,17)). The gap between #595959 and #111 is real but modest (~0.35 relative luminance difference); in home.png the placeholder 'Describe the fic you're looking for…' could be mistaken for already-entered dark text on a quick glance, undermining the 'this is empty, please type' signal an empty search box should send unambiguously. Consider whether the placeholder should trade a little AA headroom back toward a lighter, more clearly-secondary gray (e.g. #767676) while still passing 4.5:1 against white, or add a leading search icon so emptiness is obvious independent of text color.

- [ ] **P3** · **F118 — No loading skeleton or transition when the fandom list is fetching — select jumps from empty to populated with no in-between state shown on the composer itself**
  `frontend_2/src/components/SearchForm.tsx:109`
  useFandoms() exposes a loading flag (SearchForm.tsx:33, used at line 109 to disable the select) but nothing renders to indicate loading is in progress beyond the select simply being non-interactive — no skeleton shimmer (the app already has a .skeleton utility class defined in globals.css:230 for exactly this purpose), no 'Loading fandoms…' label. A user opening the page during a slow fetch sees an inert dropdown with no explanation. Swap the select for a .skeleton-shaped placeholder (or overlay a small spinner) while loading is true, consistent with skeleton patterns already used elsewhere in the app.

- [ ] **P3** · **F119 — Elapsed-time readout in the pipeline status uses raw 'Took {ms} ms' with no formatting for readability**
  `frontend_2/src/components/PipelineStatus.tsx:132`
  PipelineStatus.tsx:132 renders {elapsedMs != null && <span className="muted">Took {elapsedMs} ms</span>} — a raw millisecond integer (e.g. 'Took 5643 ms') with no thousands separator or unit conversion. For any search over ~1 second this reads as an awkward 4-5 digit number; converting to seconds with one decimal (e.g. '5.6s', matching the '5.6s' format already used elsewhere per the dev-results screenshot's '3 results · 5.6s') would be both more readable and consistent with how duration is displayed on the results page.


## Results (table, cards, refine)

*22 findings — P1: 3 · P2: 9 · P3: 10*

- [ ] **P1** · **F120 — ResultsTable overflows its own content column by ~46% even on a 1440px desktop viewport**
  `frontend_2/src/components/ResultsTable.tsx:31`
  Live-rendered the table (`/dev/search` → "Many results" → `/results`, table layout): the 11-column table measures 1289px wide inside an 880px `--maxw` content wrapper (verified via getBoundingClientRect: wrapWidth=880, scrollWidth=1289). That forces horizontal scrolling to see Tags/Summary/Why/Link even on a large monitor, which undercuts the point of a comfortable reading-width column layout. Either let results break out of `--maxw` to use the viewport, drop/compress low-value columns (Why is usually all em-dashes per the code's own comment at ResultsTable.tsx:49-51), or introduce column visibility controls.

- [ ] **P1** · **F121 — Unranked score cell clips the word "unranked" mid-word due to a too-narrow fixed column**
  `frontend_2/src/components/ResultsTable.tsx:32`
  COL_WIDTH.match_score is fixed at "4.5rem" (72px) to fit numeric scores like "97/100", but MatchScore.tsx's null-state renders the string "— unranked" which needs ~83px. Verified live: the cell's scrollWidth (83px) exceeds clientWidth (71px), so `text-overflow: ellipsis` truncates it to something like "— unra…" — an actual word gets clipped, not just decoratively shortened. Give the null state a shorter label ("unranked", "n/a", or just "—") or widen the column to fit both content shapes.

- [ ] **P1** · **F122 — Mobile table shows only ~2.5 of 11 columns with zero indication more content exists off-screen**
  `frontend_2/src/components/ResultsTable.tsx:85`
  At 390px viewport the `.xl-table` wrapper is 342px wide against a 1289px-wide table (27% visible) — verified via computed style overflowX:auto + scrollWidth/clientWidth. There's no scrollbar visible in the screenshot, no edge fade/gradient, no "swipe →" affordance, nothing signalling the Platform/Fandom/Words/Kudos/Hits/Tags/Summary/Link columns are reachable by a horizontal swipe. A first-time mobile user sees Score + a clipped Title and nothing else, with no cue to keep exploring. Add a visible scroll-shadow/gradient on the trailing edge (mask-image or a pseudo-element) and/or increase native scrollbar visibility on touch.

- [ ] **P2** · **F123 — "Excel" table gridlines and zebra striping are nearly invisible (contrast ~1.4-1.6:1)**
  `frontend_2/src/app/globals.css:330`
  `.xl-table th/td` border is `1px solid #d4d7dc` on white (contrast 1.44:1) and the zebra stripe is `#f7f8fa` on white (a ~1% luminance step) — both measured and confirmed by direct pixel inspection of the live table. The brief explicitly calls this the "gridlines-on-every-cell density" Excel look, but at these values the grid barely registers; it reads as a faint blur rather than a crisp spreadsheet grid, undermining the very effect the layout is going for. Darken the border to something in the #b8bcc2-#a5aab2 range and/or increase the zebra delta (e.g. #f0f2f5) so the structure the layout is built around is actually visible.

- [ ] **P2** · **F124 — FicCard's metadata strip is a single undifferentiated muted-gray run-on line with no separators**
  `frontend_2/src/components/FicCard.tsx:54`
  FicCard.tsx:54-64 renders platform / fandom / rating / status / chapters / words / kudos / hits / updated as sibling `<span>`s in one `.row.muted` flex container with only flex-gap between them — verified the rendered textContent runs together ("AO3Harry Potterrated MComplete32/32words: 184,320…") relying purely on whitespace gap to separate 9 different data types. On a card with fewer fields it reads fine, but with all fields present (the common case) it becomes an undifferentiated wall of gray 0.9em text that's hard to scan for one specific fact (e.g. "is this complete?"). Add visible separators (a middot or thin divider) and/or group into two tiers (identity: platform/fandom/rating vs stats: words/kudos/hits) with distinct visual weight.

- [ ] **P2** · **F125 — Quick-view (⤢) button and platform-link button are both far under a comfortable tap target, sitting side by side**
  `frontend_2/src/components/QuickViewButton.tsx:22`
  Measured live: QuickViewButton renders at ~25×24px (`padding: 0.15rem 0.45rem`, `font-size: 0.85em` glyph), PlatformLink at ~45×25px, separated by only `gap: 0.4rem` in the table's Link column (ResultsTable.tsx:171). Both are well under the ~44×44px baseline touch-target guidance, and they're adjacent, so a touch/mouse user has to be precise to hit the right one — worse on the FicCard header row where QuickView sits right next to the MatchScore badge. Increase padding on both to reach a real target size, especially since this is the row's only way to open the detail view or leave the app.

- [ ] **P2** · **F126 — Facet toggle buttons (Platform/Rating/Status/Tags) signal "active" with font-weight alone — verified nearly imperceptible**
  `frontend_2/src/components/FacetFilter.tsx:150`
  FacetFilter.tsx applies only `fontWeight: value.platforms.has(p) ? 700 : 400` for pressed state (lines 107, 125, 146, 171) with no background/border/color change. Clicked "AO3" live and screenshotted: the only visible difference between the pressed AO3 chip and its unpressed FFN/Wattpad siblings is a subtle bold vs. regular weight at ~14px — easy to miss, especially scanning across 6+ tag chips at once where several may be pressed simultaneously (the filter is "match all"). Give pressed facets a filled background + border color change so active filters are legible at a glance, not just weight.

- [ ] **P2** · **F127 — Skeleton table structure doesn't match the real table's grid — will visibly "pop" when data arrives**
  `frontend_2/src/components/ResultsSkeleton.tsx:34`
  ResultsSkeleton.tsx's `ResultsTableSkeleton` (lines 31-69) draws a plain table with a 2px bottom-border header and 1px row dividers only — no vertical gridlines, no header fill, no zebra. The real `.xl-table` (globals.css:321-374) has full cell gridlines, a shaded `#eef0f3` header, and zebra striping. Confirmed by direct comparison of dev-skeletons.png against the live rendered table: the loading state is visually a much lighter, airier table than what replaces it, so the "Excel" grid snaps into existence rather than the content simply filling in. Match the skeleton's border/background treatment to the real table so the loading→loaded transition is a fill, not a re-skin.

- [ ] **P2** · **F128 — No dev/demo screenshot or route actually previews the live ResultsTable with data — table view is effectively unaudited by design**
  `frontend_2/src/app/(dev)/dev/results/page.tsx:9`
  `/dev/results` (src/app/(dev)/dev/results/page.tsx) only renders FicCard permutations, never ResultsTable; `/dev/components` renders ResultsView only in its empty/error phases (never `phase="done"` with fics). The only way to see the live table is to route through `/dev/search` → trigger a scenario → land on `/results`, which isn't an obvious/discoverable demo path. Given the table is the DEFAULT layout (`ResultsView.tsx:67`) and the surface this audit is centered on, add a dedicated `/dev/results` (or a new demo) section that renders `<ResultsTable fics={SAMPLE_FICS} />` and `<ResultsTable fics={MANY_FICS} />` directly, matching the pattern already used for FicCard.

- [ ] **P2** · **F129 — "No results match the current filters" is a bare muted line with no way back to Reset from the message itself**
  `frontend_2/src/components/ResultsView.tsx:209`
  ResultsView.tsx:208-209 renders `<p className="muted">No results match the current filters.</p>` when facets zero-out the result set — plain text, no icon/illustration slot, and critically no inline "Reset filters" action even though FacetFilter already has a Reset button (it's just scrolled above, out of the immediate view once results collapse to nothing). A user who filtered themselves into a dead end has to scroll back up to find Reset rather than it being offered right where the empty message appears.

- [ ] **P2** · **F130 — "No matches found" (true zero-result) empty state has no illustration/icon slot and only a static suggestion**
  `frontend_2/src/components/ResultsView.tsx:118`
  ResultsView.tsx:117-127 renders a `.card` with bold "No matches found" + one muted sentence — no icon, no illustration, no secondary action (e.g. a button to broaden the search, clear Strict filters, or try a suggested query). Compare to how much structure the loading state (PipelineStatus, 4 numbered stages) and the search-failed state (retry button) get — the empty-results state is comparatively the least resolved of the three "nothing to show" states on this page despite likely being the most common non-happy-path outcome for a semantic search product with a real corpus gap.

- [ ] **P2** · **F131 — Results toolbar row (count · Open on board · Follow search · View toggle · Export) has no grouping — 5 unrelated control clusters in one flex-wrap row**
  `frontend_2/src/components/ResultsView.tsx:145`
  ResultsView.tsx:134-170 puts the result count, OpenOnBoardButton, SavedSearchButton, the view-toggle row, and ExportButtons all as flat siblings in one `.row` with `justify-content: space-between`, relying only on flex-wrap to keep them from colliding. Verified on mobile (390px, m-dev-results.png is cards-only so this wasn't visible there, but the same ResultsView renders it) this row wraps into a vertical stack with no visual grouping — "Open on board", "Follow search", "View: Table/Cards", "Export: CSV/TSV" all become separate full-ish-width chunks with equal visual weight, even though they're semantically different (one is navigation, one is a save action, one is a display toggle, one is data export). Group into visually distinct clusters (e.g. a divider or subtle background band) so the hierarchy of "primary actions" vs "view controls" vs "export" is legible.

- [ ] **P3** · **F132 — Results surface looks visibly more "raw" than the SearchForm composer directly above it**
  `frontend_2/src/app/globals.css:393`
  The composer (globals.css:393-524) has deliberate visual craft: layered box-shadow, a two-tone border (darker bottom edge for "ground"), a focus-tightening shadow, an `#1c1c1c` filled send button with press-travel (`translateY(1px)` on active). Everything below it on the same page — Refine panel, table, cards, export/view buttons — uses the bare default `button`/`.card` skeleton styles (flat `#f5f5f5` fill, plain 1px `#ccc` border, no shadow, no press feedback). The seam is visually jarring: a highly-finished search bar sits directly on top of a noticeably flatter results block. Not asking for full design here (that's the next phase's job), but flag it as the biggest visual-consistency gap on the page for the design pass to address first.

- [ ] **P3** · **F133 — Sort indicator glyphs (▲ ▼ ⇅) are small, low-contrast Unicode arrows rather than a real icon**
  `frontend_2/src/components/ResultsTable.tsx:97`
  ResultsTable.tsx:97-103 appends " ▲"/" ▼" for the active sort and " ⇅" for sortable-but-inactive columns as literal Unicode characters inline with the header label text (13.6px, inherits header color). They render inconsistently across platforms/fonts (Unicode arrow glyphs vary in weight and baseline alignment across system fonts) and are easy to miss at that size sitting right after 600-weight header text. Swap for a small SVG chevron/arrow icon with consistent sizing and a dedicated color, and consider showing the ⇅ affordance only on hover/focus rather than on all 8 sortable columns permanently (currently every sortable header carries the glyph at all times, adding visual noise).

- [ ] **P3** · **F134 — Facet numeric range inputs (Words ≥ / Words ≤ / Kudos ≥) have no placeholder or unit hint**
  `frontend_2/src/components/FacetFilter.tsx:186`
  FacetFilter.tsx:184-212 renders three bare `<input type="text">` with no `placeholder` attribute — verified live, all three inputs show empty boxes with no example value or unit inside. A first-time user sees three blank fields next to terse labels ("Words ≥") with no cue for the expected format/scale (is 50 fifty words? Is the field looking for "50000" or "50k"?). Add a placeholder like "e.g. 50000" to anchor expectations.

- [ ] **P3** · **F135 — "Why this matched" gets a bordered card treatment in the modal but zero distinction elsewhere**
  `frontend_2/src/components/FicCard.tsx:72`
  FicDetail.tsx:68-73 wraps `match_reason` in a `section className="card stack"` (bordered box) inside the quick-view modal, clearly setting it apart as a callout. The identical data in FicCard.tsx:72-76 is just an italic muted paragraph with a "Why: " text prefix, and in ResultsTable.tsx:165-169 it's a plain truncated table cell with no visual distinction from Summary next to it. Same content, three different visual treatments depending on which component renders it — worth reconciling once the design pass picks one presentation for this field (currently only ever populated in demo fixtures per the code comment, but the design still needs one consistent answer).

- [ ] **P3** · **F136 — PlatformLink icon button has a plain box-with-arrow appearance that doesn't clearly signal "open external site"**
  `frontend_2/src/app/globals.css:548`
  `.platform-link` (globals.css:548-573) is a bordered pill with the favicon + a small ↗ glyph at 0.8em — functionally fine, but visually it's just a bordered rectangle with two small marks in it, easy to mistake for a generic icon button rather than specifically "this leaves FicFinder and opens AO3/FFN/Wattpad in a new tab." At table density (24px tall, next to the equally-small quick-view button) the favicon itself is hard to identify at a glance — worth checking whether the favicon renders recognizably at that size once real favicons are wired in (currently a lettermark fallback per the CLAUDE.md notes).

- [ ] **P3** · **F137 — highlight <mark> color (#fff2a8) is a flat, slightly dated "highlighter yellow" with no thought given to how it will interact with a future theme**
  `frontend_2/src/app/globals.css:539`
  globals.css:538-543 sets `mark.hl { background: #fff2a8 }` — a saturated yellow that reads fine on white but will very likely clash once dark mode / any non-white surface exists (the code comment even says "stays legible in any future theme" but that's only true for the inherited text color, not the yellow background itself, which will look garish or low-contrast against a dark card). Flag now so the design pass treats this as a token from day one rather than a hardcoded hex to retrofit later.

- [ ] **P3** · **F138 — "+N more" tag disclosure uses a dashed border that reads as a different, weaker affordance than the solid tag pills it expands**
  `frontend_2/src/app/globals.css:184`
  TagList.tsx:22-33 / globals.css:175-193: the `<summary>` trigger for overflow tags gets `border: 1px dashed var(--border)` vs. the solid-border `.tag` pills next to it. Dashed borders conventionally signal "placeholder/draft/temporary" in most UI languages, which is a slightly odd signal for what's actually a fully-functional, permanent "show more" control. A solid border (perhaps with a distinct fill to separate it from a real tag) would read more intentionally as an action rather than a stub.

- [ ] **P3** · **F139 — Export CSV/TSV buttons are indistinguishable in weight from every other button on the page, despite triggering a file download**
  `frontend_2/src/components/ExportButtons.tsx:24`
  ExportButtons.tsx renders plain default `<button>`s with no icon (no download glyph) and identical styling to navigational and toggle buttons (Table/Cards, Refine chips, Follow search). A user scanning the results toolbar (verified live: `Open on board · ☆ Follow search · View: Table Cards · Export: CSV TSV`) has no visual cue that CSV/TSV specifically leaves the app / produces a file, versus the other buttons which stay in-app. A small download icon prefix would help disambiguate this action class from the rest of the toolbar row.

- [ ] **P3** · **F140 — Mobile sidebar renders fully expanded above the fold, pushing the actual results below several screens of navigation**
  `frontend_2/src/components/sidebar/Sidebar.tsx:198`
  Verified live at 390px viewport: the full sidebar (FicFinder wordmark, New search, Saved, History, Board, RECENT section, Account) renders inline above the page content rather than collapsing to a rail or a hamburger-triggered drawer, consuming roughly the first 240px of vertical space before any search/results content appears. Combined with the SearchForm, the full toolbar row, and the entire Refine panel (also fully expanded, ~700px tall with all facet groups visible), a mobile user has to scroll past roughly 1200px of chrome before reaching the first result row. This is an information-architecture/layout issue more than a pure visual one, but it directly affects how the results surface reads on mobile and should be flagged for the design pass (collapsible sidebar-as-drawer on small viewports, and/or a collapsed-by-default Refine panel on mobile).

- [ ] **P3** · **F141 — MatchScore's "unranked" label and numeric score have mismatched visual rhythm within the same column**
  `frontend_2/src/components/MatchScore.tsx:9`
  MatchScore.tsx:9-22 renders two structurally different shapes for the same column: ranked fics show `<strong>97</strong><span class="muted">/100</span>` (a two-part bold+muted composition), while unranked fics show a single flat `<span class="muted">— unranked</span>` with no bold element at all. Scanning down the Score column (verified in the live "many results" table), ranked rows have a strong dark number anchoring the left edge while unranked rows are uniformly light gray — which is actually somewhat useful for triage, but combined with the truncation bug (see separate finding) and no consistent right-alignment of the text baseline, the column reads unevenly. Worth an intentional pass once the score visualization itself is redesigned (see the MatchScore severity=P2 finding above).


## Fic detail & quick-view modal

*23 findings — P1: 0 · P2: 7 · P3: 16*

- [ ] **P2** · **F142 — "Why this matched" callout is visually identical to a plain .card — no distinct treatment for an AI-generated insight**
  `frontend_2/src/components/FicDetail.tsx:69`
  FicDetail.tsx:68-73 wraps match_reason in a bare `.card` (globals.css:157-161: 1px gray border, 6px radius, no background tint, no icon, no accent color). It's indistinguishable at a glance from any other bordered box on the page — nothing signals "this is the AI's reasoning, read this first." Compare to the Summary section right below it, which uses no card at all — so the callout's visual weight is arbitrary rather than communicating importance. Give it a distinct treatment (tinted background, left accent bar, small icon/label styling beyond bold text) so it reads as a callout, not a generic box.

- [ ] **P2** · **F143 — Stats row wraps ragged on mobile — label/value pairs break apart mid-group**
  `frontend_2/src/components/FicDetail.tsx:86`
  FicDetail.tsx:86 uses `flex-wrap: wrap` with `gap: 2rem` on the stats section but each label+value pair is its own flex child with no `min-width` or explicit basis. In m-dev-fic.png, the first fic's stats wrap into two uneven rows (Words/Kudos/Hits on row 1, Bookmarks/Comments on row 2) and the row-1 wrap happens to land the dev-tools "N" badge directly over the "Words" value at 184,320 — but more importantly the wrap point looks accidental (3 stats then 2, with no visual row boundary), not a deliberate 2-column or 3-column grid. Convert to a `grid` with `grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr))` (or similar) so mobile wrapping is a controlled grid, not incidental flex-wrap.

- [ ] **P2** · **F144 — Missing-value em-dash for Words/Kudos on the Wattpad demo fic has no visual distinction from a real value**
  `frontend_2/src/components/FicDetail.tsx:24`
  FicDetail.tsx:24-26 `fmt()` renders `null`/`undefined` as a bare `—` inside the same `<strong>` tag as real numbers. In dev-fic.png/m-dev-fic.png, the "Untitled Draft" fic shows Words: — and Kudos: — in full bold black, identical weight to a populated "1,200" Hits value next to it — there's no visual cue that this is "not indexed" versus "the value happens to be a dash character." A reader has to already know the convention. Render the em-dash in the muted/lighter color (not `<strong>`) so missing data visually recedes instead of matching the visual weight of real data.

- [ ] **P2** · **F145 — "Read on <platform>" CTA is styled identically to a secondary/default button, not the page's primary action**
  `frontend_2/src/components/FicDetail.tsx:121`
  FicDetail.tsx:121-130 applies `.button-link` (globals.css:65-74: `background: #f5f5f5`, 1px gray border, 4px radius) — the exact same gray, low-contrast, unstyled look as every other button on the page (including the modal's plain-text "✕" close button and any secondary Save/Export controls elsewhere in the app). In dev-fic.png the CTA reads as a flat gray strip with no visual priority — despite being described as the page's primary action, nothing distinguishes it as such: no accent color, no elevated contrast, no size increase. A user scanning the page would not know this is "the" action to take. Give it the highest-contrast/primary treatment on the page (filled accent background, not `#f5f5f5` gray) once the design system exists; flagging now since a P1-adjacent hierarchy gap this central to the page's job needs to be on the punch list.

- [ ] **P2** · **F146 — Modal close button is a bare ✕ glyph inside a full bordered/gray-background button — looks like a form control, not a close affordance**
  `frontend_2/src/components/Modal.tsx:69`
  Modal.tsx:69-71 renders `<button onClick={...} aria-label="Close">✕</button>` with zero className override, so it inherits the global `button` rule (globals.css:49-55: 1px border, `#f5f5f5` background, 4px radius, `0.4rem 0.75rem` padding) — the same visual treatment as every other button in the app (search submit, filter toggles, etc). A close affordance conventionally reads as a lightweight icon-only control (circular hit target, no visible border/fill until hover) positioned at a card's corner; here it's a boxed button with padding that makes the glyph look small and lost inside its own border, competing for attention with the modal title next to it. Give it a dedicated `.modal-close` treatment: borderless, circular hover state, larger touch target, positioned with more deliberate corner placement.

- [ ] **P2** · **F147 — Tag pills use a hairline border with no fill — visually weak, and the "+N more" disclosure pill is styled with a dashed border that reads as "disabled" rather than "expandable"**
  `frontend_2/src/app/globals.css:184`
  globals.css:162-169 `.tag` is a 1px solid gray border with transparent background — fine as a neutral skeleton default, but combined with globals.css:178-190 `.tag-more > summary` using a *dashed* border (visually associated with placeholder/disabled/drop-zone affordances in most design systems, not "click to expand"), the "+N more" control in dev-fic.png could easily be mistaken for a disabled or non-interactive element rather than the clickable disclosure it actually is. Swap the dashed border for a solid one (or a distinct fill/chevron) so it reads as actionable.

- [ ] **P2** · **F148 — "In progress" status has no visual distinction from "Complete" — a materially important fact rendered as interchangeable plain text**
  `frontend_2/src/components/FicDetail.tsx:58`
  FicDetail.tsx:58-60 renders both complete and incomplete states as identical plain-text spans in the same metadata row ("Complete" vs "In progress" — dev-fic.png shows both across the two demo fics with zero color/icon differentiation). Whether a fic is finished is one of the most decision-relevant facts for a fic reader (many readers specifically filter for complete-only). This should carry a status-color treatment (e.g. a small dot/badge, green for complete vs amber/gray for in-progress) so it's scannable without reading the word.

- [ ] **P3** · **F149 — Title hierarchy: h1 has no distinct type scale from body text weight-wise**
  `frontend_2/src/app/globals.css:36`
  globals.css:36-40 sets `h1, h2, h3 { line-height: 1.2; }` with no explicit font-size overrides, so the h1 relies entirely on the browser default (~2em) and inherits the same font-family/weight axis as everything else — no letter-spacing, no distinct weight step beyond default bold. In dev-fic.png the title reads fine at large sizes ("The Slow Burn at the End of the World") but on mobile (m-dev-fic.png) a 4-word title ("Cartography of Small Disasters") wraps to 2 lines and the byline ("by quietshelves") sits immediately below with almost no breathing room — the h1/byline pairing looks cramped rather than like a deliberate title-block. Add explicit font-size/weight/margin-bottom rules for h1 so title hierarchy is intentional rather than UA-default, and give the byline slightly more top margin at narrow widths.

- [ ] **P3** · **F150 — Stats row: numbers are not tabular-nums and not right-aligned, so multi-fic/multi-column comparison misaligns**
  `frontend_2/src/components/FicDetail.tsx:89`
  FicDetail.tsx:86-109 renders Words/Kudos/Hits/etc. as left-aligned `<strong>` text with the default proportional font. In dev-fic.png, comparing across the three stacked demo fics, digit widths visibly wobble (e.g. "184,320" vs "42,100" vs "—") because comma-grouped numbers in a proportional font don't align on their thousands/hundreds columns. Add `font-variant-numeric: tabular-nums` to the stat `<strong>` values so digit columns stay aligned, which matters even more once real users scan several stat columns quickly.

- [ ] **P3** · **F151 — Native-stat labels are inconsistently capitalized relative to the fixed Words/Kudos/Hits labels**
  `frontend_2/src/components/FicDetail.tsx:103`
  FicDetail.tsx:88,92,96 hardcode "Words", "Kudos", "Hits" with capital first letters, but the platform-native stats loop at line 101-108 renders `s.label` (lowercase strings from meta.ts: "bookmarks", "comments", "favs", "follows", "reviews", "votes", "reads") through `textTransform: capitalize` inline style. This happens to visually match in the screenshot, but it's fragile/inconsistent as a pattern — one label set is capitalized in source, the other is capitalized via CSS transform, so any i18n or copy change to one path silently diverges from the other. Normalize to one approach (either capitalize all via CSS, or title-case all label strings in meta.ts).

- [ ] **P3** · **F152 — CTA button-link is full-width by content only — sizing looks accidental, not intentional**
  `frontend_2/src/app/globals.css:65`
  globals.css:65-74 `.button-link` has no explicit width; in the screenshots it happens to stretch edge-to-edge because it's the only/last child of a `<section>` inside a `max-width` container, not because of a `width: 100%` rule. This is a coincidental full-width look (confirmed by reading the CSS — there is no width rule), which is fragile: if the CTA text gets longer or shorter (e.g. "Read on FanFiction.net" vs "Read on Wattpad"), the box will resize to hug the text rather than staying the deliberate full-bleed strip seen in the screenshot. Decide explicitly: either `width: 100%` + centered content (matching the current visual), or intentionally content-sized — don't leave it to accident.

- [ ] **P3** · **F153 — PlatformLogo favicon inside the CTA renders at 18px next to 16px-ish body text with no optical alignment fix**
  `frontend_2/src/components/PlatformLogo.tsx:124`
  FicDetail.tsx:128 passes `size={18}` for the favicon inside the CTA row, with `alignItems: 'center'` on the row (line 126). In dev-fic.png the AO3/FFN favicons (fetched via Google's favicon service, PlatformLogo.tsx:124-136) render as small squarish/circular glyphs vertically centered against the CTA text baseline — acceptable, but the favicons visibly differ in apparent size/weight from each other (AO3's icon reads noticeably smaller/lighter than Wattpad's bold orange "W" fallback tile) because real third-party favicons and the hand-drawn LetterTile fallback (PlatformLogo.tsx:67-103) were never visually calibrated against each other. This is inherent to mixing real favicons with a custom fallback — worth a design-pass note to either add a consistent padding/frame around all favicon renders, or move to a uniform custom icon set instead of live favicons for visual consistency.

- [ ] **P3** · **F154 — Modal header title and close button share the same row with no separation from body content below**
  `frontend_2/src/components/Modal.tsx:66`
  Modal.tsx:66-73 puts the title row and `{children}` directly inside one `.modal-body stack` div with a single uniform `gap` (from `.stack`, globals.css:142-146, `var(--gap)` = 1rem) — no border, background tint, or extra spacing distinguishes "modal chrome" (title+close) from "modal content" (the FicDetail body). Compare to typical modal patterns (e.g. claude.ai, which this codebase explicitly references as its interaction model in comments) where the header is visually a distinct bar. Here the title reads as just the first paragraph in the stack, with the fic's own `<h1>` (suppressed via hideTitle, but the byline/metadata row that follows) immediately below at the same gap — so the modal's title bar and the fic's byline/metadata visually blend into one continuous block instead of reading as header-then-content.

- [ ] **P3** · **F155 — Modal border-radius (16px) is not matched anywhere else in the app, and .card's radius (6px) is nested inside it unmatched**
  `frontend_2/src/app/globals.css:836`
  globals.css:836 gives `.modal { border-radius: 16px; }` while `.card` (used for the "Why this matched" callout inside the modal) uses `border-radius: 6px` (globals.css:159) and `.tag` pills use `999px` (globals.css:165) — three different radius values compound inside one modal view with no shared radius scale/token. This is a token-system gap, not just a one-off: once a design language locks, these should derive from a shared `--radius-sm/md/lg` scale so nested surfaces feel like one system rather than three unrelated roundness choices stacked inside each other.

- [ ] **P3** · **F156 — FicDetailSkeleton's shape doesn't match FicDetail's real layout — stats and tags placeholders imply a different structure than what actually renders**
  `frontend_2/src/components/FicDetailSkeleton.tsx:30`
  FicDetailSkeleton.tsx:30-40 shows exactly 3 stat placeholders and exactly 3 tag placeholders, but the real FicDetail can render 3-8 stats (3 fixed + up to 5 native stats per meta.ts:95-115) and up to 20 tags (FicDetail.tsx:114, `limit={20}`) plus a "+N more" disclosure that the skeleton never hints at. In dev-fic.png, the AO3 demo fic alone shows 5 stat columns and 5 visible tags — nearly double what the skeleton promises. A skeleton whose shape undersells the real content causes a visible "pop"/reflow when data loads (more columns appear than the skeleton implied), which reads as janky even though it's technically just "more content than placeholder." Widen the skeleton's stat/tag placeholder counts to the common-case upper bound so the loading-to-loaded transition doesn't visibly grow the layout.

- [ ] **P3** · **F157 — Skeleton loader's shimmer gradient is nearly invisible against the white page background**
  `frontend_2/src/app/globals.css:234`
  globals.css:230-240 sets `.skeleton` background to `#ececec` with a shimmer gradient sweeping between `#ececec` and `#f5f5f5` — a ~9-value luminance difference on an 8-bit 0-255 scale, i.e. barely perceptible motion. Combined with the plain white `--bg: #fff` page background, the skeleton blocks already have very low contrast from the page (which is arguably intentional for a subtle loader), but the shimmer *effect itself* is so low-contrast it likely won't register as "loading" to a user — it will just look like flat gray boxes. Increase the shimmer's mid-stop lightness delta (e.g. `#ececec` to `#fafafa` or brighter) so the sweep is actually perceptible, especially since motion is one of the only cues that this is "loading" vs. "a gray box is the final design."

- [ ] **P3** · **F158 — Summary block has no visual distinction from the fandom/metadata text above it — same font size, same color, same weight**
  `frontend_2/src/components/FicDetail.tsx:75`
  FicDetail.tsx:75-84 renders the Summary paragraph in plain default body text with only a `<strong>Summary</strong>` label above it — same treatment pattern as Words/Kudos labels, but Summary is prose (often 1-3 sentences of narrative text) sitting between two very differently-shaped sections (the compact metadata row above, the compact stats row below). In dev-fic.png the paragraph text is legible but doesn't feel like the page's actual descriptive content — it has no distinguishing line-height, max-width-for-readability, or type-scale bump versus the surrounding label/value pairs. Flag for the design pass: prose blocks like Summary and "Why this matched" deserve a distinct reading-optimized type treatment (slightly larger, constrained measure, increased line-height) versus the label/value UI chrome around them.

- [ ] **P3** · **F159 — Rating value ("Rated M") carries the exact same connotation-neutral gray as every other metadata token — no visual signal for content sensitivity**
  `frontend_2/src/components/FicDetail.tsx:57`
  FicDetail.tsx:57 renders `Rated M` (or E for explicit content) inline in the metadata row with zero distinguishing color/weight from "English" or "32/32". Content rating is the one metadata field with real user-facing stakes (someone scanning quickly should be able to tell at a glance this is mature/explicit content before clicking through) — currently it's visually inert. Flag for design: rating deserves its own small color-coded badge (e.g. green/yellow/red-ish scale mapped to G/T/M/E) rather than blending into the plain-text metadata run.

- [ ] **P3** · **F160 — Modal box-shadow is a single hard-coded value with no ambient/tight shadow pairing — reads flat despite the large 60px blur**
  `frontend_2/src/app/globals.css:838`
  globals.css:838 `box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22);` is a single large diffuse shadow with no tighter secondary shadow layer (the common pattern for a convincing elevated-surface look pairs a small tight shadow near the edge with a larger diffuse one further out). At 0.22 alpha with only one layer, on a plain white backdrop the modal's edge definition relies entirely on the 1px `#e7e5dd` border (line 835) rather than the shadow doing real elevation work — visually it reads more "outlined" than "floating." Minor now on a neutral background, but worth flagging since elevation/shadow tokens are exactly the kind of thing that should be decided systematically rather than left as this one hand-picked value.

- [ ] **P3** · **F161 — Mobile: dev-tools "N" badge and viewport-fixed elements aside, the Words stat value is genuinely obscured at the exact wrap point in the first demo card**
  `frontend_2/src/components/FicDetail.tsx:86`
  In m-dev-fic.png, the stats row for "The Slow Burn at the End of the World" wraps between Hits and Bookmarks — Bookmarks/Comments drop to their own row directly below, but there's no extra top margin at the wrap boundary (it's all one `flex-wrap` with uniform `gap`, FicDetail.tsx:86), so the two-row stack looks like an unintentional line-break rather than a clean 3-and-2 grid. (Noting the dev-tools "N" circle overlaps this area per the audit's own note that it's not app UI — but independent of that overlay, the wrap itself is visually ungrounded, no divider or extra spacing marks the row break.) Combine with the earlier grid-based fix recommendation: an explicit grid with consistent row-gap would resolve both the accidental-wrap look and give the badge overlap less to coincide with.

- [ ] **P3** · **F162 — Header stack (title, byline, metadata row) uses a flat 0.4rem gap regardless of content type — title-to-byline and byline-to-metadata get identical spacing despite being different kinds of relationship**
  `frontend_2/src/components/FicDetail.tsx:47`
  FicDetail.tsx:47 `<header className="stack" style={{ gap: '0.4rem' }}>` applies the same tight gap between the h1 and the byline (a tightly-related pair, appropriately close) AND between the byline and the full metadata row (a looser, less related pair — platform/fandom/rating/etc.) — both relationships get the identical 0.4rem regardless of their different closeness. In dev-fic.png this makes the byline and metadata row look like they're competing for the same visual "line" rather than byline reading as a sub-title and metadata reading as a separate data strip. Differentiate: keep title→byline tight, give byline→metadata more room (or add a subtle rule/divider) so the header block has internal hierarchy instead of one uniform stack.

- [ ] **P3** · **F163 — Focus ring radius (2px) is smaller than most focusable elements' own border-radius, so the ring looks clipped/misaligned on rounded controls**
  `frontend_2/src/app/globals.css:103`
  globals.css:103-107 sets a global `:focus-visible { outline: 2px solid #4a78d6; outline-offset: 2px; border-radius: 2px; }` — but `.tag-more > summary` has `border-radius: 999px` (pill shape) and `.platform-link` has `border-radius: 6px`, `.modal` close button has `border-radius: 4px` (inherited default). A 2px focus-ring radius applied via outline on a pill-shaped element (999px) will visibly clip into a squared-off corner around a rounded pill when it receives keyboard focus — outline-radius doesn't scale to match each element's own radius. Worth a design-pass note since this is a real, testable visual defect (not hypothetical) once someone tabs to the "+N more" tag disclosure.

- [ ] **P3** · **F164 — PlatformLogo has no loading placeholder — a blank gap can appear before the favicon network request resolves**
  `frontend_2/src/components/PlatformLogo.tsx:127`
  PlatformLogo.tsx:127-136 renders a plain `<img loading="lazy" onError={...}>` with no `onLoad` state and no fixed-size placeholder background while the Google favicon request is in flight. Since the CTA row and metadata badges size themselves around the icon's `width`/`height` attributes, the layout itself won't shift, but there's no visual affordance (skeleton shimmer, background tile) during the brief load window — a user on a slow connection sees an empty box where the favicon will appear rather than any indication something is loading there. Minor, but worth a background-color placeholder (e.g. `background: var(--muted)` at low opacity) so it doesn't read as a missing/broken image during the load window.


## Results board

*18 findings — P1: 1 · P2: 5 · P3: 12*

- [ ] **P1** · **F165 — Minimap renders as an empty white box with no empty-state treatment**
  `frontend_2/src/components/board/BoardCanvas.tsx:389`
  In board.png, the MiniMap (bottom-right) renders as a large plain white rectangle with a faint gray border — no dots, no node outlines, nothing legible. On an empty board (the default state most visitors will see, since nothing auto-seeds) this reads as a broken/unloaded UI element, not a 'you have no nodes yet' minimap. It should either be hidden entirely when `groupCount === 0` (matches the pattern already used for `.bempty`), or given a placeholder caption like 'Nothing to map yet' so it doesn't look like a rendering failure.

- [ ] **P2** · **F166 — 'By rewritten prompt' tab wraps to two lines, breaking the segmented control's row height**
  `frontend_2/src/components/board/board.css:378`
  STRATEGIES renders 'By platform' / 'By rewritten prompt' / 'Combined' as flex:1 buttons of equal width inside a 280px-wide toolbar card (btoolbar.css:378-403). 'By rewritten prompt' is the only label long enough to wrap, so it alone grows to two lines while its siblings stay single-line — confirmed in the toolbar crop, where the segmented control's row height is set by the two-line tab and the one-line tabs float with extra empty space above/below their text. A segmented control should have uniform button height regardless of label length: either shorten the label ('By prompt'), let the whole card widen slightly, or use `white-space: nowrap` with a smaller font-size for that one tab so all three stay one line.

- [ ] **P2** · **F167 — Fit/Clear controls have no button affordance — look like plain text captions**
  `frontend_2/src/components/board/board.css:428`
  `.btoolbar__link` (Fit/Clear) is a plain inline text button styled identically to running body copy — same font, no border, no background, sitting directly under a stats line at btoolbar.css:428-435. In the crop it's legible only because it's colored blue-ish, but visually it reads as a caption, not an actionable control, and there's no hover/pressed affordance beyond browser default. These are two of the board's only global actions (fit-to-view, clear-everything) and deserve at least a subtle pill/ghost-button treatment so they read as buttons at a glance, matching the weight given to Search/Seed demo in the dock.

- [ ] **P2** · **F168 — Search placeholder example text is truncated before showing the full example**
  `frontend_2/src/components/board/SearchDock.tsx:85`
  The search-query input (`.bdock__q`) sits in a `flex:1` box next to a fixed 150px fandom input and two buttons inside a `min(760px, 92vw)` dock (board.css:466-472). The placeholder text 'Describe the fic… e.g. drarry enemies to lovers slow burn, no MCD' is confirmed truncated mid-word in the screenshot crop ('...slow t'), cutting off before the important 'no MCD' qualifier that's presumably there to demonstrate exclusion syntax. Either shorten the placeholder to fit the realistic input width, or move the example text to helper copy below the input that doesn't get clipped.

- [ ] **P2** · **F169 — Zoom controls sit in the bottom-left corner, a known collision zone with dev/browser chrome**
  `frontend_2/src/components/board/BoardCanvas.tsx:390`
  React Flow's zoom `Controls` (+, −, fit-to-view, lock) default to `bottom-left` and are unconfigured in BoardCanvas.tsx:390 (`<Controls showInteractive={false} />`, no `position` prop). The crop shows the Next.js dev-tools badge sitting directly on top of the control stack, obscuring the '−' and lock buttons. Even discounting the dev badge (which won't ship to production), bottom-left is a contested corner in most browser chrome/dev-tool conventions — moving Controls to `position="bottom-right"` (stacked above or beside the minimap) or `top-right` avoids the collision risk entirely rather than relying on the dev badge being absent in prod.

- [ ] **P2** · **F170 — Drag-grip icon contrast is too low to read as an affordance**
  `frontend_2/src/components/board/board.css:80`
  `.bnode__dots` (the drag-grip icon in each table node header, the ⠿ glyph) is colored `#b9b7ad` on a `#faf9f5` header background — confirmed 2.01:1 contrast against white, and lower against the off-white header. It's meant to signal 'this header is draggable,' but at this contrast it barely registers, especially at 0.95rem. Raise it to at least 3:1 (WCAG's non-text-UI-component minimum) so the drag affordance is actually discoverable, e.g. `#9a988c` or darker.

- [ ] **P3** · **F171 — Active tab in the variant switcher has weak visual distinction from inactive tabs**
  `frontend_2/src/components/board/board.css:398`
  The 'By platform'/'By rewritten prompt'/'Combined' segmented control sets `role="radiogroup"` with `role="radio"` buttons (BoardToolbar.tsx:46-59), which is semantically correct, but visually the active tab (`.is-active`) is distinguished only by a white background + 1px shadow against the light `#f1efe8` track (board.css:398-403) — no accent color, no underline, no bold-weight difference beyond font-weight:600 which is subtle at 0.72rem. In the crop the active/inactive states are legible but low-contrast to each other at a glance; a design pass should add a stronger active indicator (accent-colored text or a bottom border) since this control drives which tables render — it's a primary, not incidental, control.

- [ ] **P3** · **F172 — Board's warm-ivory palette, the app's pure-white palette, and the reused cool-gray xl-table clash in temperature**
  `frontend_2/src/components/board/board.css:10`
  The board's canvas background (`--board-surface: #ffffff` node cards, `#f4f3ee` canvas, `#faf9f5` secondary surface, `#d9d7cc` line — all warm/ivory-toned per board.css:10-23) sits adjacent to the rest of the app which uses a pure white `--bg: #fff` (globals.css:16) and the `.xl-table` reused inside NodeTable uses a cool blue-gray palette (`#eef0f3` header, `#d4d7dc` borders, `#b0b4ba` outer border — globals.css:326-339). The result: navigating from the rest of the app onto the board is a visible temperature shift (white → warm ivory), and then the table inside each board node is a second shift back toward cool gray-blue. This is explicitly flagged as intentional 'skeleton' territory by the file's own header comment, but it's worth surfacing now since it's the most systemic coherence gap on this surface and the design pass should resolve canvas/app/table palette to one temperature.

- [ ] **P3** · **F173 — Frame container's near-transparent background may not read as a visual group once populated**
  `frontend_2/src/components/board/board.css:223`
  `GroupFrame.tsx` renders `.bframe` with `background: rgba(255,255,255,0.45)` (board.css:223) — a translucent white wash over the dotted canvas. This is a sensible idea for 'frame contains tables, but doesn't visually compete with them,' but at 45% opacity over the light `#f4f3ee`/dot canvas the frame boundary itself (a 1px `#cfccbf` border, line 224) will be the only thing distinguishing 'inside a search group' from 'empty canvas' — there's no code path shown for a frame that has zero visible presence beyond a thin border and text header. Once real tables populate it this may read fine, but it's worth flagging now: verify in a populated state that the frame boundary + faint wash is enough to visually group multiple tables as 'one search,' or the frame concept (the toolbar's core value prop per the empty-state copy) will be invisible.

- [ ] **P3** · **F174 — Empty-board card has no illustration or visual anchor, just stacked text**
  `frontend_2/src/components/board/board.css:296`
  The empty-board card ('An empty board.') at board.css:296-310 is text-only: a bold headline, a paragraph, and one text button — no illustration, icon, or visual anchor. It sits centered over a plain dotted grid with nothing else to look at. Compare to typical canvas-tool empty states (Figma, Miro, Linear) which usually pair the copy with a small diagram or icon showing what a populated board looks like. Given this is the first thing most users see on `/board`, it's an obvious opportunity for a small illustrative element — even a simple line-art sketch of 'frame containing two tables' — to make the empty state feel designed rather than a fallback message.

- [ ] **P3** · **F175 — Empty-board card is absolutely positioned independent of the toolbar/dock panels, not composed with them**
  `frontend_2/src/components/board/board.css:298`
  `.bempty` is absolutely positioned at `left: 50%; top: 42%` (board.css:298-299) independent of the toolbar and dock panels, which are React Flow `Panel`s pinned to `top-left` and `bottom-center` respectively. On any viewport where the toolbar is taller (e.g. when the save-warning banner renders, BoardToolbar.tsx:64-70) or the dock grows (pipeline stages appear during search, SearchDock.tsx:115-123), the empty card's fixed 42%-from-top position isn't aware of those siblings and could visually crowd them on shorter viewports. Given the card is 420px wide (`min(420px, 86vw)`) and the toolbar card is 280px wide sitting at the true top-left, there's no visible overlap in the 1440x900 shot, but the positioning approach is brittle rather than composed relative to the other panels.

- [ ] **P3** · **F176 — React Flow attribution reads as an unstyled library artifact, not integrated into the board's visual language**
  `frontend_2/src/components/board/board.css:543`
  The React Flow attribution watermark ('React Flow') sits at the extreme bottom-right corner in default library styling, confirmed in board.png directly below the empty minimap. `.react-flow__attribution` is only overridden for background/font-size (board.css:543-546: `background: transparent; font-size: 0.6rem`) but keeps default text color and position. It's required by React Flow's free license unless removed via a paid plan, so it can't be deleted, but its current styling — tiny gray text with no integration into the toolbar/minimap visual language — reads as an unstyled library leftover rather than an intentional footer credit. A design pass should at minimum color-match it to `--board-muted` (it likely already inherits something close, but confirm) and consider whether it needs a background pill to stay legible over the dot grid at all zoom levels.

- [ ] **P3** · **F177 — Search and Seed demo buttons have similar visual weight despite different priority**
  `frontend_2/src/components/board/SearchDock.tsx:107`
  `.bdock__go` (Search) and `.bdock__seed` (Seed demo) sit directly adjacent in the dock row (SearchDock.tsx:107-112) with near-identical button geometry (same height, same border-radius) but very different visual weight: Search is solid dark-fill (`background: var(--board-ink)`, board.css:477) while Seed demo is a light outline button (`background: #f5f4ef`, board.css:491). This hierarchy is correct in principle (primary vs. secondary action) but the two buttons are the same size and sit with no more separating gap than the other input pairs in the row, so at a glance both read as similarly-weighted actions in the flow. Confirmed in the dock crop — 'Search' and 'Seed demo' visually compete for attention rather than one clearly leading. Consider a size or gap differentiation, or grouping 'Seed demo' more visually as a secondary/tertiary escape hatch (e.g., smaller text-only button) since the empty-state card already offers the same seed action as its primary CTA.

- [ ] **P3** · **F178 — Frame width is driven entirely by table count, so single-table frames may truncate the query title unnecessarily**
  `frontend_2/src/lib/board/layout.ts:33`
  `.bframe__query` (the search's title in the frame header, GroupFrame.tsx:32-34) truncates to a single line via `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` (board.css:250-253), which is reasonable, but it sits in a frame whose width is derived purely from `frameSize(parts.length)` in layout.ts:33-39 — i.e., the frame is exactly as wide as its child tables, with no minimum width reserved for the query text itself. A search with a short query into a strategy that produces only one narrow table (e.g. a single-platform result) could produce a frame header narrower than a moderately long query, truncating text that would otherwise fit if the frame had a sensible minimum width. Not visible in the current empty-board shot, but worth flagging for the populated-state design pass: the frame header should have its own min-width independent of table count so the query name doesn't truncate unnecessarily on narrow single-table frames.

- [ ] **P3** · **F179 — Disabled Fit/Clear buttons are nearly invisible, hiding that the controls exist at all**
  `frontend_2/src/components/board/board.css:436`
  `.btoolbar__link:disabled` (Fit when there are no nodes, Clear when there are no groups) sets `color: #b9b7ad` on the white toolbar card — 2.01:1 contrast, confirmed via calculation. Disabled controls are conventionally exempt from strict WCAG AA text contrast since they're non-interactive, but at this ratio the buttons are essentially illegible in the empty-board screenshot ('Fit' and 'Clear' are barely visible as light gray smudges in the crop) — a user scanning the toolbar for available actions may not even register that 'Fit' and 'Clear' exist as controls at all, let alone that they're currently disabled. A slightly darker disabled state (closer to 3:1, e.g. `#a5a399`) would keep the disabled semantic while staying discoverable as UI.

- [ ] **P3** · **F180 — Toolbar's static description and live counter have no visual separation, reading as one paragraph**
  `frontend_2/src/components/board/board.css:416`
  The toolbar description text ('One table per source database — AO3, FFN, Wattpad.', BoardToolbar.tsx:62) and the meta counter ('0 searches · 0 tables', line 72-76) sit in the same 280px-wide card with no visual separator beyond whitespace (board.css:404-423 has no border-top or divider between `.btoolbar__hint` and `.btoolbar__meta`). Confirmed in the crop: the hint paragraph and the counter line read as one continuous paragraph block rather than two distinct informational rows (description vs. live stats), which is a missed opportunity for a thin divider or extra margin to separate 'static help text' from 'live state' at a glance — helpful given the counter is the one piece of information that changes as the user works.

- [ ] **P3** · **F181 — Icon-only action buttons have no resting-state affordance, only appear interactive on hover**
  `frontend_2/src/components/board/board.css:126`
  Every actionable icon-only button across the board surface — `.bframe__btn` (duplicate/close, GroupFrame.tsx:51-68), `.bnode__btn` (collapse, TableNode.tsx:58-66), `.brow-view` (quick view, NodeTable.tsx:182-190) — is a bare glyph in a transparent box with no visible resting-state border or background, only appearing on `:hover` (board.css:137,286,210). This means none of these controls has any static affordance signaling 'this is clickable' until the cursor happens to land on it; a user has to discover every action button by hovering blind across the header. At minimum, a subtle default background tint (even 4-6% opacity of the ink color) would give these a resting-state presence consistent with how buttons are commonly expected to read at a glance, especially since there are 3+ of these small icon buttons stacked in every frame/node header.

- [ ] **P3** · **F182 — Empty-state's primary CTA button is styled as a secondary/outline button, undercutting its priority**
  `frontend_2/src/components/board/board.css:316`
  The empty-board card's single action button ('Or seed two demo searches', board.css:316-325) uses the same light-outline button style (`background: #f5f4ef`, `border: 1px solid #d0cec5`) as the secondary 'Seed demo' button in the dock below it (board.css:488-496) — both are visually identical secondary/tertiary buttons. But in the empty state, seeding demo data IS the primary suggested action (it's the only button on the card), so styling it identically to a de-emphasized secondary action elsewhere on the same screen undersells it. Consider giving the empty-card's seed button the same solid/primary treatment as `.bdock__go` (Search), since in that context it's the card's one and only CTA.


## History, Saved, Settings, Account, Toasts

*25 findings — P1: 1 · P2: 12 · P3: 12*

- [ ] **P1** · **F183 — History page has no per-row actions at all — Saved has 'Unfollow' but History has nothing, despite `removeHistory()` already existing**
  `frontend_2/src/components/panels/HistoryPanel.tsx:53`
  `src/lib/client/history.ts` exports `removeHistory(id)` (line 96) — a working, tested per-row delete function — but `HistoryPanel.tsx` never imports or calls it. The only destructive action on the page is the all-or-nothing 'Clear log' button (line 42-44). Meanwhile the sidebar's own Recent list (`SidebarRow.tsx`) gives the *exact same data* a full kebab menu: Open / Pin / Copy link / Remove (lines 77-85). A user who wants to delete one embarrassing search has to nuke their entire history, on the page whose own doc comment (page.tsx:7) calls it 'the complete, manageable log.' Add a row-level kebab (reuse `Menu`/`MenuItem` from `sidebar/Menu.tsx`) with at minimum Open + Remove, ideally mirroring the sidebar's Pin/Copy link too so pinning is discoverable outside the sidebar.

- [ ] **P2** · **F184 — Saved empty state duplicates the intro paragraph almost verbatim, reading as a copy bug**
  `frontend_2/src/components/panels/SavedPanel.tsx:20`
  SavedPanel always renders 'Open one to re-run it; new results since your last visit are flagged. Stored only in this browser.' (line 21-23) directly above the empty-state paragraph 'No followed searches yet. Run a search and choose Follow search to track it for new results.' (line 28-31) — visible in saved.png as two full-width gray sentences stacked with no visual distinction between 'how this feature works' and 'you have none yet'. When the list is empty, the first sentence is talking about content that doesn't exist yet, which reads as redundant/confusing. Suppress the intro line when `saved.length === 0` and let the empty state stand alone, or merge them into one message.

- [ ] **P2** · **F185 — History/Saved rows are a plain `.card` with zero hover/press affordance, unlike every other clickable row in the app**
  `frontend_2/src/components/panels/HistoryPanel.tsx:57`
  Each `<li>` in HistoryPanel (line 57) and SavedPanel (line 35) is `className="card row"` — `.card` (globals.css:157-161) is a static bordered box with no `:hover`/`:active` state at all. Every other list-row pattern in this codebase has hover feedback: `.xl-table tbody tr:hover` fills a color (globals.css:372-374), `.sidebar-search-item:hover` fills `--sidebar-hover` (globals.css:756-758), `.composer-tray-item:hover` fills gray (globals.css:522-524). These full-page list rows are the one place a user can click into a result and get zero visual response until the browser's default link-underline (which doesn't even apply here since only the query text inside is a link, not the row). Add `.card:hover` background tint + transition consistent with the rest of the app, or better, promote the row-level Link to wrap more of the row so the whole card is clickable and hoverable.

- [ ] **P2** · **F186 — History row's clickable query text is not visually distinguished from the muted metadata line under it**
  `frontend_2/src/components/panels/HistoryPanel.tsx:59`
  In HistoryPanel (lines 58-69) the only thing indicating 'this is a link' is that the query sits inside a `<Link>` wrapping a `<strong>{h.q}</strong>` — bold black text, same color as any other bold text on the page, with no underline, no accent color, no cursor affordance beyond the default browser pointer. In history.png this makes the row read as plain text, not an actionable list item — a user scanning the page has no visual cue which part is clickable versus the `.muted` fandom/date metadata beside it. Give the query link a distinct treatment (accent color, or underline on hover at minimum) so it reads as navigable.

- [ ] **P2** · **F187 — History/Saved rows pack four pieces of metadata into one comma/dot-separated `.muted` run-on sentence**
  `frontend_2/src/components/panels/SavedPanel.tsx:44`
  HistoryPanel line 62-68 concatenates fandom + strict flag + result count + cache status into a single string like 'Naruto · strict · 42 results · saved — opens instantly', all in one small gray font with no visual grouping. SavedPanel does the same at lines 40-51 (fandom + strict + new-count + last-checked). At a glance this reads as a wall of low-contrast text rather than distinct facts. Especially 'X new since last check' in SavedPanel (the single most actionable piece of information on the whole page — literally the point of a followed search) is buried mid-sentence in the same gray weight as everything else, when it should be the visually loudest element in the row (e.g. a colored badge/pill).

- [ ] **P2** · **F188 — 'N new since last check' badge exists as a plain `<strong>` — no color, no pill, despite being the entire value proposition of the Saved page**
  `frontend_2/src/components/panels/SavedPanel.tsx:44`
  SavedPanel line 44-46: `<strong>{s.newIds.length} new since last check</strong>` renders in default black bold text, identical weight to the query title above it. This is the single most important signal on the page (why would you check followed searches otherwise?) and it has no dedicated visual language — no accent color, no notification-dot/badge shape, nothing that would let a user scan a list of 10 followed searches and instantly spot which ones have news. Give it a real badge treatment: a colored pill (reuse `.tag` shape with an accent background) or a small dot indicator, distinct from the 'no new results' case.

- [ ] **P2** · **F189 — 'Unfollow' button on Saved rows is a raw default `<button>` with no icon, sitting flush against the card edge**
  `frontend_2/src/components/panels/SavedPanel.tsx:53`
  SavedPanel line 53: `<button onClick={() => unsaveSearch(s.params)}>Unfollow</button>` — no className, so it inherits the global button style (globals.css:49-55): light gray fill, 1px border, 4px radius, same as every other button in the app including 'Retry' and 'Sign out'. A destructive/negative action (unfollowing) reads with identical visual weight to a neutral action. It also has no confirmation despite being irreversible (re-following requires re-running the exact search and choosing Follow again) — inconsistent with `onClear` in HistoryPanel which does `window.confirm(...)` for its bulk destructive action. At minimum, give it the `.menu-item-danger`-style red treatment used elsewhere for destructive intent, and consider whether a single stray click should silently drop tracking with zero undo/confirmation.

- [ ] **P2** · **F190 — Settings modal's left tab rail has only one tab, making the two-pane rail/pane layout look broken/pointless with real content**
  `frontend_2/src/components/SettingsModal.tsx:25`
  `SettingsModal.tsx` TABS array (lines 25-27) has a single entry ('Account'), yet the component always renders the full two-column `.settings` flex layout (globals.css:869-873): a 150px-wide bordered rail on the left plus a content pane on the right (settings-tabs, lines 874-882). With one tab, the rail is a lonely highlighted button sitting in 150px of otherwise-empty vertical space next to a border, for zero navigational value — a single-tab tablist is视觉ally inert chrome. Either add the tabs the product needs now (even a stub 'Appearance'/'Data' placeholder) or collapse to a single-pane layout when `TABS.length === 1` so the rail doesn't render as dead weight.

- [ ] **P2** · **F191 — Account action buttons ('Become a patron' / 'Manage billing' / 'Refresh' / 'Sign out') are four visually identical gray buttons in one row with no hierarchy**
  `frontend_2/src/components/panels/AccountPanel.tsx:96`
  AccountPanel.tsx lines 96-112 renders up to four `<button>`s with zero className differentiation — all inherit the same flat gray global button style. 'Become a patron' (a primary monetization CTA) has the exact same visual weight as 'Refresh' (a utility action) and 'Sign out' (a mildly destructive session action, separated only by a `<span className="spacer">` pushing it right — the sole hierarchy cue in the whole row). A conversion-critical CTA should not look identical to a housekeeping button; give 'Become a patron' a primary/filled treatment (the app already has one: `.composer-send`'s dark-fill pattern), and consider `.menu-item-danger`-style tinting for Sign out.

- [ ] **P2** · **F192 — 'Unreachable' auth state renders an error condition with zero color/icon distinction from a normal informational paragraph**
  `frontend_2/src/components/panels/AccountPanel.tsx:61`
  AccountPanel.tsx lines 57-71: the 'unreachable' branch (server couldn't be verified — a real error condition, elevated enough to warrant its own state) renders `<p className="muted">` — the exact same low-contrast gray used for all decorative/secondary copy throughout the app (e.g. 'Sign in to track usage', 'Loading…'). There's no visual escalation (no warning icon, no `.error` red, no bordered alert box) to signal 'something went wrong and you might be looking at stale data' versus routine informational text. Compare to the dedicated red '.error' class already used two branches later for billing-redirect failures (line 94) — the unreachable state should get at least that treatment, arguably a proper warning-toned alert box.

- [ ] **P2** · **F193 — Google sign-in fallback banner uses a diagonal-stripe 'construction tape' pattern that looks like a broken/missing-asset placeholder, not an informational notice**
  `frontend_2/src/components/GoogleSignIn.tsx:74`
  `.skeleton-banner` (globals.css:211-224) renders a 45°-repeating-gradient hazard-stripe background behind the 'Google sign-in is not configured' message (GoogleSignIn.tsx lines 73-78). Diagonal stripes are a near-universal UI convention for 'broken/placeholder/under construction,' not for 'this is expected, here's what to do instead' — the visual language actively undersells that this is an intentional, handled state (the copy itself explains the demo harness workaround calmly, but the container visually screams 'something is wrong here'). Replace with a calm info-toned bordered box (light blue/neutral fill, an info icon) once real design tokens exist; even in skeleton form, a flat tinted box with a left accent bar would read more accurately than hazard stripes.

- [ ] **P2** · **F194 — 'Clear log' destructive action is a plain-looking button (`.menu-item-danger`) floating alone, right-aligned, with no icon and easy to misclick against nothing since there's no confirmation styling difference before the click**
  `frontend_2/src/components/panels/HistoryPanel.tsx:42`
  HistoryPanel.tsx lines 40-46 renders `<button className="menu-item-danger" onClick={onClear}>Clear log</button>` inside a `.row` with `justifyContent:"flex-end"`. `.menu-item-danger` (globals.css:1158-1164) is designed as a dropdown-menu-item style (flex row, transparent background, hover-fill) — repurposed here as a standalone top-level page action, it has no border/button shape at all (no `border`, no `background` beyond hover), so in the page context it renders as plain red text floating top-right with no button affordance until hovered. A destructive top-level page action deserves an actual button shape (border or fill) so it doesn't read as a stray label.

- [ ] **P2** · **F195 — Saved panel's loading state is bare text ('Loading…') while History's is a proper content-shaped skeleton — inconsistent loading treatment for near-identical pages**
  `frontend_2/src/components/panels/SavedPanel.tsx:26`
  HistoryPanel.tsx line 48-49 uses `<HistoryListSkeleton rows={4} />` (a proper shimmering card-shaped skeleton, ResultsSkeleton.tsx lines 10-29) while SavedPanel.tsx line 25-26 uses a bare `<p className="muted">Loading…</p>` for the exact same hydration-gap moment on a structurally identical page (same card-list layout, same localStorage-backed data). One page teaches the eye what's coming (skeleton mimics the final shape), the other flashes plain gray text then pops in real content — the flash-of-unstyled-loading-text will read as less polished immediately next to its sibling page. Build a `SavedListSkeleton` mirroring `HistoryListSkeleton`.

- [ ] **P3** · **F196 — Page headers (`<h1>`) render as bare browser-default bold serif-adjacent text with no visual hierarchy beyond size**
  `frontend_2/src/app/(app)/history/page.tsx:15`
  Both history/page.tsx line 15 and saved/page.tsx line 15 render `<h1 style={{margin:0}}>` with only inline margin reset — no weight/tracking/color treatment from globals.css beyond the blanket `h1,h2,h3{line-height:1.2}` rule (globals.css:36-40). In the screenshots these render as generic ~2rem bold black text, visually identical in register to a Word-document heading — no distinguishing type scale, no eyebrow/label, no accent underline, nothing that signals 'this is a top-level app destination' vs a subsection heading. Every page header in the app (Search history, Followed searches, and presumably Board/Settings) will look this plain until a type system exists — flag for the design pass: establish a real H1 treatment (size/weight/letter-spacing distinct from H2/H3) before shipping visual design.

- [ ] **P3** · **F197 — Settings modal pane heading (`<h3>Account</h3>`) duplicates the dialog's own title bar, and mismatches its type scale**
  `frontend_2/src/components/SettingsModal.tsx:94`
  The Modal's own title bar already renders 'Settings' as `<strong style={{fontSize:"1.1rem"}}>` (Modal.tsx line 68), and then SettingsModal renders a second heading 'Account' at `<h3 style={{margin:"0 0 0.75rem"}}>` (SettingsModal.tsx line 94) directly below the active tab (which itself already says 'Account'). Since there's currently only one tab, this is three redundant renderings of the word/concept 'Account' stacked within ~100px (dialog title 'Settings', tab label 'Account', pane heading 'Account') with no font-family/weight relationship tying them into one hierarchy — the `<strong>` and the `<h3>` use unrelated ad hoc inline sizes rather than a shared modal-heading scale.

- [ ] **P3** · **F198 — Account panel has no avatar in the signed-in card, despite the sidebar rendering one for the same user two clicks away**
  `frontend_2/src/components/panels/AccountPanel.tsx:86`
  The sidebar's `AccountButton.tsx` renders a `.sidebar-avatar` circle with the user's email-initial (lines 31-33, globals.css `.sidebar-avatar` 1072-1084: circular, bordered, centered initial). Opening Settings from that exact button leads to `AccountPanel`'s signed-in card (lines 84-92), which shows only `<strong>{user?.email}</strong>` — plain text, no avatar at all. The identity visual that exists one component away is dropped entirely in the panel that's specifically about that identity, making the settings dialog feel less considered than the sidebar chrome that opens it.

- [ ] **P3** · **F199 — Loading busy-state buttons only change their text label ('Redirecting…') with no spinner/disabled visual cue beyond the global 0.5 opacity wash**
  `frontend_2/src/components/panels/AccountPanel.tsx:99`
  AccountPanel.tsx lines 98-104: while `busy === "checkout"`/`"portal"`, the button's *own* text changes to 'Redirecting…', but a user is about to be navigated away to Stripe — there's no spinner, no pulsing/loading animation, just static text and the generic `button:disabled{opacity:.5}` rule (globals.css:57-60) which is applied to the busy button but also to every *other* button in the row simultaneously (since `disabled={busy !== null}` gates all four buttons at once, line 98/103/107/111). The result: clicking 'Become a patron' dims all four buttons uniformly with no visual distinction for which one is actually 'the one doing something' beyond re-reading its label text.

- [ ] **P3** · **F200 — Google's native sign-in button is unstyled/unwrapped, so its `outline`/`large` theme will visually clash with every other button in the app**
  `frontend_2/src/components/GoogleSignIn.tsx:83`
  GoogleSignIn.tsx line 62-64 calls `renderButton(ref.current, {theme:"outline", size:"large"})` — Google's own widget renders its brand-compliant pill button (rounded corners, Google's exact blue/gray, its own type), dropped into a bare `<div ref={ref} />` (line 83) with no surrounding treatment. Google's button will have different corner radius, different height, and a different border color than this app's `button{border-radius:4px}` global style (globals.css:49-55) sitting right next to it in the same panel — e.g. any future 'or continue with email' secondary option would look mismatched beside it. This is inherent to using the official widget (which is correct — don't reproduce Google's logo per this repo's own convention), but the *container* around it deserves padding/alignment consideration so the size/shape jump doesn't feel like an unstyled foreign element dropped mid-layout. Flag for the design pass to give it a dedicated `.google-signin-slot` wrapper with matched vertical rhythm.

- [ ] **P3** · **F201 — Toasts are pinned bottom-right with no responsive repositioning — will collide with mobile viewport edges and any future bottom-anchored mobile nav**
  `frontend_2/src/app/globals.css:1177`
  .toast-region (globals.css:1177-1186) is `position:fixed; bottom:1.25rem; right:1.25rem` with `max-width:320px` and no media query. On narrow viewports (the m-*.png mobile shots are 390px wide) a 320px-wide toast plus 1.25rem right offset leaves very little margin from the left edge, and there's no accommodation for iOS safe-area-inset-bottom or a future mobile tab bar overlapping the same bottom-right corner. There's also no stacking cap — `items` (Toast.tsx line 39-49) can grow unbounded if multiple actions fire in quick succession (e.g. rapid copy-link clicks before the 3.2s auto-dismiss), each pushing the stack taller with no max-visible/collapse behavior.

- [ ] **P3** · **F202 — Toast dark pill has no icon or shape distinction between info and error tone — only a background-color swap**
  `frontend_2/src/app/globals.css:1197`
  .toast[data-tone="error"] (globals.css:1197-1199) changes background from `#1c1c1a` to `#7a1c17` — that's the entire visual differentiation between a neutral confirmation ('Link copied to clipboard.') and a failure ('Couldn't copy the link.'). Both render as identically-shaped dark rounded pills with white text (Toast.tsx line 56-58), same padding, same shadow, same animation — a user glancing at a toast out of the corner of their eye (which is the whole use case for a transient toast) has only a subtle warm-vs-cool dark-color shift to distinguish success from failure, no icon (✓/✕), no border accent. Add a small leading icon per tone at minimum.

- [ ] **P3** · **F203 — Toast text has no explicit line-height/wrap handling for longer error messages, and the region has no aria-atomic, risking truncation-adjacent overflow**
  `frontend_2/src/app/globals.css:1187`
  .toast (globals.css:1187-1196) sets `max-width:320px` and `font-size:0.85rem` but no `word-break`/`overflow-wrap` — most error copy in this app is short ('Couldn't copy the link.') but `AccountPanel`'s error state can surface raw `ApiError.message` text (AccountPanel.tsx line 48) which could be an arbitrary backend string; at 320px max-width with no overflow handling, a long unbroken token (e.g. a URL or stack-trace-like message) could overflow the pill's rounded corners rather than wrapping cleanly. Minor, but worth a defensive `overflow-wrap: anywhere` given `.modal` already does exactly this for the same reason (globals.css line 845).

- [ ] **P3** · **F204 — History/Saved list items are `<li className="card row">` fighting two different flex intents — `.card` gives padding/border, `.row` gives `align-items:center` — resulting in the date/status column vertically centering against a two-line stack, not aligning to its baseline**
  `frontend_2/src/components/panels/HistoryPanel.tsx:57`
  Both `<li key={h.id} className="card row" style={{justifyContent:"space-between"}}>` (HistoryPanel.tsx line 57) and the Saved equivalent stack a two-line block (query + metadata, via a nested `.stack`) against a single-line trailing element (date, or the Unfollow button) inside a `.row` (`align-items:center`, globals.css:147-152). This vertically centers the trailing element against the *midpoint* of the two-line block rather than aligning it to the top line (where the eye naturally pairs 'query ↔ date') — in the screenshots this isn't glaringly wrong at 2-line height, but it's a fragile pattern that will look increasingly off if the metadata line ever wraps to two lines (long fandom names, e.g. 'Harry Potter and the Something Something Crossover').

- [ ] **P3** · **F205 — Settings dialog's mobile stacked-tabs layout (`@media max-width:600px`) turns the tab rail into a bare wrapped row of text buttons with no visual grouping**
  `frontend_2/src/app/globals.css:903`
  globals.css lines 903-916: under 600px, `.settings-tabs` flips to `flex-direction:row; flex-wrap:wrap` with only a bottom border to separate it from the pane. With a single 'Account' tab today this is invisible, but the moment a second tab is added, mobile users get unlabeled wrapped buttons with no chip/pill shape (still using `.settings-tab`'s plain padding, globals.css:883-890) — no visual affordance that these are a tab *group* versus arbitrary buttons in a toolbar. Flag for when tab count grows: mobile tab rail needs its own treatment (e.g. horizontal scroll with a pill/underline active-indicator) rather than wrap-and-hope.

- [ ] **P3** · **F206 — Settings modal's Account tab pane has a fixed `min-height:320px` even though the current Account content is short, leaving a large empty gap at the bottom when signed out**
  `frontend_2/src/app/globals.css:872`
  .settings (globals.css:869-873) sets `min-height:320px` on the two-pane flex container. The signed-out AccountPanel branch (AccountPanel.tsx lines 73-80) renders just one muted sentence + the Google sign-in button/banner — well under 320px of actual content — so the dialog will show a tall left rail beside a short right-aligned content block with a large dead-air gap below it, rather than the modal sizing to its content. This is a deliberate min-height for future tabs, but as currently wired with one short pane it visibly wastes space (would show clearly in the actual running app, not captured in my screenshot set but directly derivable from the fixed min-height + known-short content).

- [ ] **P3** · **F207 — Date formatting on History/Saved rows uses locale `toLocaleDateString()` with no time, so multiple searches run minutes apart on the same day are indistinguishable**
  `frontend_2/src/components/panels/HistoryPanel.tsx:70`
  HistoryPanel.tsx line 70: `{new Date(h.at).toLocaleDateString()}` and SavedPanel.tsx line 50: `{new Date(s.lastCheckedAt).toLocaleDateString()}` both drop the time component entirely. For a history log specifically (whose entire purpose is chronological recall), two searches run 5 minutes apart today both just say 'Today's date' with no way to tell them apart or know which is more recent beyond list order. Not a rendering defect, but a real information-design gap the design pass should address — at minimum a relative-time format ('2 hours ago', '3 days ago') would both look more polished and carry more information than a bare date.


## Dev/demo surfaces

*9 findings — P1: 0 · P2: 2 · P3: 7*

- [ ] **P2** · **F208 — Dev bar and dev-main have no responsive/mobile treatment at all**
  `frontend_2/src/app/globals.css:919`
  `.dev-bar` (globals.css:919-930) uses `justify-content: space-between` with the 'DEV / DEMOS' label on the left and a `.row` of two nav links (`gap: 1rem`) on the right, but unlike `.sidebar`/`.app-main` there is no `@media (max-width: 720px)` override for `.dev-bar`/`.dev-main` anywhere in globals.css (the only mobile breakpoint block, lines 942-963, only touches `.sidebar`/`.app-main`/`.sidebar-foot`). At the 390px width used for the app's own mobile screenshots, 'DEV / DEMOS' + 'Demo index' + '← Back to app' packed into one sticky flex row with `padding: 0.5rem 1rem` will crowd or wrap awkwardly against the viewport edge. No m-dev-*.png screenshot exists to confirm this was ever checked at mobile width.

- [ ] **P2** · **F209 — Seed page leaves ~85% of viewport height as dead white space below a two-line form**
  `frontend_2/src/app/(dev)/dev/seed/page.tsx:56`
  dev-seed.png shows all content (header, two buttons, one caption line) confined to the top ~250px of a 917px-tall viewport, leaving a completely empty white void for the remaining ~670px before the page ends. The page has no max-content wrapper limiting vertical growth and no illustration/preview panel to fill the space — for a page that's meant to demo the seeded state (per its own header copy 'so you can preview the populated UI'), showing literally nothing after seeding (the confirmation card that does appear per code is still fairly sparse) reads as broken/incomplete rather than intentionally minimal.

- [ ] **P3** · **F210 — Pipeline status demo nests a bordered card inside a bordered card with no visual distinction**
  `frontend_2/src/app/(dev)/dev/components/page.tsx:49`
  In dev/components/page.tsx:49-56, each frozen-stage row renders `<PipelineStatus>` (itself a `.card`-bordered box per dev-skeletons/dev-components screenshots) directly under a plain muted label, with 5 near-identical boxes stacked vertically (visible in dev-components.png, y≈290-1400). Because every box shares the same border/radius/padding as every other `.card` on the page, the 5 stage-snapshots read as a repeating wall of identical gray boxes rather than a clear before/after progression — there's no visual differentiation (e.g. dimmed vs. active state, a numbered rail, side-by-side layout) to show these are sequential frames of the same component.

- [ ] **P3** · **F211 — Seed page result is a single low-contrast checkmark with no success color or icon**
  `frontend_2/src/app/(dev)/dev/seed/page.tsx:74`
  dev-seed.png shows the post-seed confirmation as `<strong>Seeded ✓</strong>` (seed/page.tsx:74) in plain black/default text — no green, no check-icon glyph styling, nothing to signal 'this succeeded' at a glance distinct from the surrounding gray-muted body copy. For a page whose entire job is a two-button seed/clear toggle, the success state deserves an obvious visual confirmation (accent color, small icon, or a toast) rather than a unicode ✓ character inline with default heading weight.

- [ ] **P3** · **F212 — Seed page buttons are undifferentiated — destructive 'Clear all demo data' looks identical to the safe seed action**
  `frontend_2/src/app/(dev)/dev/seed/page.tsx:69`
  seed/page.tsx:68-69 renders `<button onClick={seed}>Seed fake searches + account</button>` and `<button onClick={clearAll}>Clear all demo data</button>` side by side with the same default `button` styling (globals.css:49-55: gray `#f5f5f5` fill, 1px `#ccc` border, both identical). Clear wipes localStorage history/results/fics/saved and signs the fake user out — a destructive action sitting directly next to (and visually indistinguishable from) the primary seed action risks accidental clicks. Even at the skeleton stage this is worth a `.error`/warning-colored treatment or at minimum separation.

- [ ] **P3** · **F213 — Skeleton shimmer/pulse animation is not visible in a static screenshot — no motion cue that these are loading states**
  `frontend_2/src/app/(dev)/dev/skeletons/page.tsx:1`
  dev-skeletons.png shows every skeleton block as a flat, static, uniformly pale gray-on-white rectangle (`Skeleton` component, referenced in skeletons/page.tsx:1). Without any visible shimmer, pulse-opacity, or gradient sweep baked into a still frame, the entire page reads as a wall of disabled/blank UI rather than 'things are loading.' Whether or not a CSS animation exists at runtime, the design pass should make sure the resting/paused appearance (e.g. print styles, prefers-reduced-motion, or the very first frame) still communicates 'loading' via a subtler gradient or icon, not just a mid-gray box indistinguishable from a disabled control.

- [ ] **P3** · **F214 — Results-table skeleton header row has literal column labels but skeleton bars below don't align to column widths**
  `frontend_2/src/components/ResultsSkeleton.tsx:1`
  In dev-skeletons.png (y≈360-540), the 'Results — table' skeleton renders real text headers (Score, Title, Platform, Fandom, Words, Kudos, Hits, Tags, Summary, Why, Link) but every data-row skeleton bar underneath is a fixed ~90-110px pill regardless of the column's actual header width — e.g. the 'Summary' column header spans ~140px but its skeleton bar is the same width as the 4-character 'Tags' column's bar. A content-shaped skeleton should roughly mirror the eventual content width per column (wide bar under Summary, narrow under Score/Hits) so the loading state doesn't visually jump when real data arrives.

- [ ] **P3** · **F215 — Demo title links use default browser underline, inconsistent visual weight vs. the rest of the neutral skeleton chrome**
  `frontend_2/src/app/globals.css:931`
  No CSS rule sets `text-decoration: none` on plain `<a>` (globals.css only strips underline on `.button-link`/`.skip-link`/nav-specific classes at lines 72, 134, 556, 657, 675, 750), so `Demo index`, `← Back to app` in the dev bar, and every demo-index card title inherit the browser default blue-less-but-underlined link style. Visible in dev-index.png/dev-seed.png/dev-components.png/dev-skeletons.png as heavy underlines under bold black text — reads as dated 90s-web styling rather than a deliberate link affordance. Even for a skeleton pass, consider `.dev-bar a { text-decoration: none }` with a hover-only underline for a cleaner nav bar.

- [ ] **P3** · **F216 — Dev-bar 'DEV / DEMOS' label and nav links have no hover/active affordance distinct from body links**
  `frontend_2/src/app/globals.css:931`
  `.dev-bar a { color: #cdd5e0; }` (globals.css:931-933) sets a static light-gray link color with no `:hover`/`:focus-visible` override beyond the global `:focus-visible` ring — clicking 'Demo index' or '← Back to app' gives zero visual feedback on hover (no brightness change, no underline-weight shift), which especially matters for a persistent sticky nav bar used to jump between many demo pages during design review.

---

## Reproducing the screenshots

Captured with puppeteer-core against `npm run dev` on :3010 — script preserved at
`frontend_2/scripts/audit-screenshots.js` (desktop 1440×900 full-page + mobile 390×844
for /, /results, /history, /saved, /board and every /dev demo state).
