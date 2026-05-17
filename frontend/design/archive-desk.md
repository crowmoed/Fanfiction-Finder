# Archive Desk Demo Package

Archive Desk is a refinement of the current Fanfic Finder visual system. It keeps the handmade, reader-first personality while making the product feel more intentional, scannable, and ready for repeated use.

## Route

Open the demo at:

```txt
/archive-desk-demo
```

## Core Mood

- A small fanfiction research desk, not a generic SaaS app.
- Paper, ink, stamps, archive labels, reader notes, and ranked metadata.
- Warm and personal, but calmer and more polished than the current zine treatment.

## Palette

```css
--desk-paper: #f5efe3;
--desk-paper-raised: #fffaf1;
--desk-paper-muted: #eadfca;
--desk-ink: #191712;
--desk-ink-soft: #4c463b;
--desk-ink-faint: #807565;
--desk-rule: #b9a98d;
--desk-red: #9d2f24;
--desk-blue: #294d68;
--desk-brass: #9f7624;
--desk-green: #436d3d;
```

## Typography

- Display: `Instrument Serif`, italic for brand and page-level identity.
- Body: existing `Newsreader`, used with generous line-height.
- Metadata: `IBM Plex Mono`, used for filters, counts, tags, stamps, and status labels.

## Component Direction

- Search should feel like the main work surface: framed, high contrast, and tactile.
- Filters should read as archive labels rather than rounded SaaS pills.
- Results should prioritize title, author, summary, tags, source, and match score.
- Platform badges should keep the stamp metaphor, but use flatter color and less rotation.
- Tables can inherit this style by reducing heavy shadows and treating headers as catalog dividers.

## Application Notes

This demo is intentionally isolated. To apply it to the production UI, start by moving the `--desk-*` tokens into `app/globals.css`, then update the existing search, result table, card, toolbar, and badge components in small passes.
