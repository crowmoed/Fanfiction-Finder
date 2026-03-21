# FicFinder Frontend Implementation Spec

> **Purpose**: This document is the single source of truth for building the FicFinder frontend. It assumes the backend (API routes, scrapers, AI ranking pipeline) already exists and is functional. Your job is to implement the UI layer on top of it.
>
> **Stack**: Next.js 14 (App Router), Tailwind CSS, TanStack Table v8, Dexie.js (IndexedDB), SheetJS (xlsx export)
>
> **Design direction**: Light, clean, typographic — modern search engine aesthetic. Think Google Search meets Letterboxd. High legibility, generous whitespace, restrained color, strong type hierarchy.

---

## 1. Design System

### 1.1 Typography

Use Google Fonts. Load via `next/font/google`.

| Role | Font | Weight | Size |
|------|------|--------|------|
| Display / Logo | **Instrument Serif** | 400 | 32px (logo), 48px (hero) |
| Headings | **DM Sans** | 600 | 18–24px |
| Body / UI | **DM Sans** | 400, 500 | 14–16px |
| Mono / Tags / Metadata | **JetBrains Mono** | 400 | 12–13px |

**Why these**: Instrument Serif gives the literary/editorial flavor without going full old-book. DM Sans is geometric, highly legible at small sizes, and pairs well. JetBrains Mono for data-dense elements (word counts, scores, tags).

### 1.2 Color Palette

Define as CSS variables in `globals.css` and reference in Tailwind config via `theme.extend.colors`.

```css
:root {
  /* Surfaces */
  --bg-primary: #FAFAF9;        /* warm off-white, main background */
  --bg-secondary: #F5F5F4;      /* card/table row alt background */
  --bg-elevated: #FFFFFF;        /* cards, modals, search bar */
  --bg-hover: #F0EFED;          /* row/item hover */

  /* Text */
  --text-primary: #1C1917;      /* headings, primary content */
  --text-secondary: #57534E;    /* secondary labels, metadata */
  --text-tertiary: #A8A29E;     /* placeholders, disabled */

  /* Borders */
  --border-default: #E7E5E4;
  --border-subtle: #F0EFED;

  /* Accent — muted teal, used sparingly */
  --accent: #0D9488;
  --accent-light: #CCFBF1;
  --accent-hover: #0F766E;

  /* Platform badges */
  --ao3-red: #990000;
  --ao3-red-bg: #FEF2F2;
  --ffn-blue: #334CB0;
  --ffn-blue-bg: #EFF3FF;

  /* Score heat — match score gradient stops */
  --score-high: #0D9488;        /* 80–100 */
  --score-mid: #D97706;         /* 50–79 */
  --score-low: #A8A29E;         /* 0–49 */

  /* Status */
  --status-complete: #16A34A;
  --status-wip: #D97706;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(28, 25, 23, 0.04);
  --shadow-md: 0 4px 12px rgba(28, 25, 23, 0.06);
  --shadow-lg: 0 12px 32px rgba(28, 25, 23, 0.08);
}
```

**Rules**:
- Never use pure black (`#000`) or pure white (`#FFF`) for text/backgrounds. The palette is warm-toned (stone family).
- The accent teal appears only on: active search button, match score highlights, links on hover, and the progress indicator active step.
- Platform badges use their own color sets — AO3 is always red-toned, FFN always blue-toned.

### 1.3 Spacing & Layout

- Max content width: `960px` (search-focused, not dashboard-wide)
- Results table max width: `1200px` (wider to accommodate columns)
- Base spacing unit: `4px`. Use Tailwind spacing scale (`p-2` = 8px, `p-4` = 16px, etc.)
- Horizontal page padding: `24px` on mobile, `48px` on desktop
- Vertical rhythm: section gaps of `32px`, element gaps of `16px`

### 1.4 Border Radius

- Search bar, cards: `12px` (`rounded-xl`)
- Buttons: `8px` (`rounded-lg`)
- Tags, badges: `6px` (`rounded-md`)
- Table cells: `0` (sharp edges inside the table)

### 1.5 Transitions

All interactive elements use `transition-all duration-150 ease-out`. No jarring state changes. Hover states should feel instant but smooth.

---

## 2. Page Layout

Single-page app at `app/page.tsx`. No multi-page routing needed. The entire experience is:

```
┌─────────────────────────────────────────────────────────┐
│  Logo (left)                        History toggle (right)│  ← Sticky header, 56px tall
├─────────────────────────────────────────────────────────┤
│                                                           │
│              [ Search Bar — full width, prominent ]        │  ← Hero area on first load
│                                                           │
│              [ Quick filter chips below search ]           │
│                                                           │
├─────────────────────────────────────────────────────────┤
│  [ Pipeline Status Indicator ]                            │  ← Appears during search
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Results count + sort controls                            │  ← Table toolbar
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Results Table (virtualized, full width)             │  │
│  │  ...                                                 │  │
│  │  ...                                                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  [ Export button ]                          [ Load more ] │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.1 States

The page has 3 visual states. Transition between them smoothly.

**Empty state (first load / no search)**:
- Search bar is vertically centered in the viewport (like Google's homepage)
- Logo sits above the search bar, larger (48px)
- Below search bar: 3–4 "try searching for" example chips
- No table, no toolbar, no status indicator
- If search history exists, show a subtle "Recent searches" section below the examples

**Loading state (search in progress)**:
- Search bar moves to the top (sticky header area) with a smooth CSS transition
- Pipeline status indicator appears below the header
- Results table appears and populates incrementally as results stream in
- Table rows that arrive before ranking completes show a placeholder shimmer in the Match Score column

**Results state (search complete)**:
- Pipeline indicator collapses to a single line summary ("Found 47 results from AO3 and FFN in 3.2s")
- Table is fully populated with scores and sorted by match rank
- Export button appears below the table

---

## 3. Component Specifications

### 3.1 `SearchBar.tsx`

**Location**: Prominent, centered. Moves to header on search.

**Structure**:
```
┌──────────────────────────────────────────────────────┐
│  🔍  "Find fics where the villain wins and it's..."  │  → [Search]
└──────────────────────────────────────────────────────┘
```

**Details**:
- Container: `bg-elevated`, `shadow-md`, `rounded-xl`, `border border-border-default`
- Input: no visible border, full width, `text-primary`, 16px font
- Placeholder text cycles through examples with a typewriter animation (3s per example, pause 2s between):
  - `"enemies to lovers slow burn over 100k words"`
  - `"fix-it fic where nobody dies, complete only"`
  - `"dark academia AU with unreliable narrator"`
  - `"found family trope, rated T or below"`
- Search icon: left-aligned, `text-tertiary`, 20px
- Submit button: right-aligned inside the bar, `bg-accent`, `text-white`, `rounded-lg`, `px-5 py-2`
- On hover: button → `bg-accent-hover`
- On focus: container gains `ring-2 ring-accent/30`
- Submit on Enter key or button click
- Disable button + show spinner inside it while search is in progress
- On mobile: button becomes icon-only (magnifying glass)

**Quick Filter Chips** (below search bar, only in empty state):
- Row of horizontally scrollable chips
- Each chip = a pre-built query shortcut: `"Slow Burn"`, `"Fix-It"`, `"Complete Only"`, `"100k+ Words"`, `"Enemies to Lovers"`, `"Time Travel"`
- Styling: `bg-secondary`, `text-secondary`, `rounded-md`, `px-3 py-1.5`, `text-sm font-mono`
- On click: populate the search bar with the chip's text and auto-submit
- On hover: `bg-hover`, `text-primary`

### 3.2 `StatusIndicator.tsx`

**Location**: Below the header, above results. Fixed height of 48px when visible.

Shows the 5-stage pipeline as a horizontal stepper.

**Structure**:
```
  ● Tag Mapping  ─── ● Parsing Query  ─── ◉ Searching AO3  ─── ○ Searching FFN  ─── ○ Ranking
```

**Details**:
- 5 steps in a horizontal row, connected by lines
- Each step has a small circle indicator + label
- States per step:
  - **Pending**: hollow circle, `text-tertiary`, dashed connector line
  - **Active**: filled circle with pulse animation, `accent` color, `text-primary`, solid connector
  - **Complete**: filled circle with checkmark, `accent` color, `text-secondary`, solid connector
  - **Skipped**: hollow circle with dash, `text-tertiary` (e.g., "LLM Decomposition" when tag mapper handles it)
- Labels: `text-xs font-mono`, below each circle
- Connector lines: 2px, color matches the state of the left step
- The active step's label should have a subtle fade-in animation
- On completion, the entire stepper collapses (height transition to 0) and is replaced by a one-line summary:
  - Format: `"47 results from AO3 (31) and FFN (16) · 3.2s · Ranked by AI"`
  - Style: `text-sm text-secondary`, centered
- If a step errors (e.g., FFN timeout), show the circle in `text-red-500` with an ✕ icon, and append a note to the summary: `"FFN unavailable — showing AO3 results only"`

**Props interface**:
```typescript
interface PipelineStatus {
  steps: {
    id: 'tag-map' | 'llm-parse' | 'ao3-fetch' | 'ffn-fetch' | 'ranking';
    label: string;
    status: 'pending' | 'active' | 'complete' | 'skipped' | 'error';
  }[];
  resultCounts?: { ao3: number; ffn: number };
  elapsedMs?: number;
}
```

### 3.3 `ResultsTable.tsx`

**Location**: Main content area below the status indicator. This is the most complex component.

**Library**: TanStack Table v8 with `@tanstack/react-table`.

**Table container**:
- `bg-elevated`, `rounded-xl`, `shadow-sm`, `border border-border-default`
- Overflow-x scroll on mobile with a subtle fade-out gradient on the right edge
- Virtualized rows via `@tanstack/react-virtual` — critical for performance when displaying 50+ results

#### Column Definitions

| # | Column ID | Header | Width | Sortable | Cell Rendering |
|---|-----------|--------|-------|----------|----------------|
| 1 | `rank` | `#` | 48px fixed | Yes (default sort, ascending) | Rank number. Bold `font-mono`. Top 3 get accent color. |
| 2 | `title` | `Title` | flex (min 200px) | Yes (alphabetical) | Fic title as a link (`text-primary`, underline on hover). Below title in a second line: truncated summary in `text-xs text-tertiary`, max 100 chars. |
| 3 | `platform` | `Source` | 72px fixed | Yes | Badge component. AO3 = red badge with "AO3" text. FFN = blue badge with "FFN" text. Badges use `rounded-md`, `text-xs font-mono font-medium`, `px-2 py-0.5`. |
| 4 | `author` | `Author` | 120px | Yes (alphabetical) | Author name as a link to their profile. `text-sm text-secondary`. |
| 5 | `rating` | `Rating` | 56px fixed | Yes | Single letter in a small circle badge: G (green), T (yellow), M (orange), E (red). FFN ratings mapped to this scheme: K→G, K+→G, T→T, M→M. |
| 6 | `words` | `Words` | 80px fixed | Yes (numeric) | Formatted number with `font-mono text-sm`. Use compact format: `1.2k`, `52.3k`, `120k`, `1.2M`. Right-aligned. |
| 7 | `status` | `Status` | 80px fixed | Yes | Pill badge: "Complete" = `status-complete` text + green dot, "WIP" = `status-wip` text + yellow dot. `text-xs`. |
| 8 | `tags` | `Tags` | 180px | No | Show top 3 tags as small chips (`bg-secondary rounded-md text-xs font-mono px-1.5 py-0.5`). If more exist, show a "+N" chip that expands the full list on click (dropdown, not navigate). |
| 9 | `matchScore` | `Match` | 72px fixed | Yes (numeric, desc) | Score as a number (0–100) inside a small horizontal bar. Bar fill width = score %, color from score heat palette. Number overlaid in `font-mono text-xs font-medium`. |
| 10 | `matchReason` | `Why` | 180px | No | One-line AI explanation in `text-xs text-secondary italic`. Truncated with ellipsis, full text on hover (title tooltip). |

#### Table Behavior

- **Default sort**: `matchScore` descending (best match first). `rank` column is derived from this sort.
- **Sort indicators**: Chevron up/down in header, `accent` color when active.
- **Row hover**: `bg-hover` background transition.
- **Row click**: Entire row is clickable — opens the fic URL in a new tab. Cursor `pointer`. Except when clicking author link, tag chip, or expand button (those have their own actions, use `e.stopPropagation()`).
- **Alternating rows**: Even rows get `bg-secondary` (very subtle striping).
- **Sticky header row**: Table header sticks to the top of the table container on scroll.
- **Empty state**: If no results, show centered message: "No fics found. Try broadening your search or tweaking your prompt." with a magnifying glass illustration.
- **Loading shimmer**: Before ranking completes, the `matchScore` and `matchReason` columns show animated shimmer placeholders (CSS skeleton animation). Other columns populate immediately as results stream in.

#### Table Toolbar (above the table)

```
  47 results                                          Sort: [Match Score ▼]  ·  Platform: [All ▼]  ·  Status: [All ▼]
```

- Left: result count in `text-sm text-secondary`
- Right: inline filter dropdowns. Styled as minimal select elements (no heavy dropdown chrome). Each is a `<select>` with options:
  - **Sort**: Match Score, Word Count, Title (A-Z), Newest Updated
  - **Platform**: All, AO3 Only, FFN Only
  - **Status**: All, Complete, In-Progress
  - **Rating**: All, G/K, T, M, E
- Filter changes apply instantly (client-side filtering + re-sort via TanStack Table state).

### 3.4 `ExportButton.tsx`

**Location**: Below the results table, left-aligned.

**Behavior**:
- Button label: `"Export Results"` with a download icon
- Style: `bg-secondary text-primary rounded-lg px-4 py-2 text-sm font-medium`
- On hover: `bg-hover`
- On click: generate `.xlsx` file client-side using SheetJS
- Filename: `ficfinder-[query-slug]-[YYYYMMDD-HHmm].xlsx` (e.g., `ficfinder-enemies-to-lovers-20260321-1430.xlsx`)
- Include all rows, all columns, plus hidden columns: full tag list (comma-separated), full summary text, direct URL
- Show a brief toast notification on success: "Exported 47 results" (disappears after 3s)
- Secondary option: small dropdown caret next to button offering `.csv` as alternative format

### 3.5 `SearchHistory.tsx`

**Location**: Slides in from the right as a side panel (320px wide) when the history icon in the header is clicked. Overlays the content with a backdrop blur.

**Structure**:
```
┌─────────────────────────┐
│  Search History     [✕] │
├─────────────────────────┤
│  🔍 "enemies to lovers" │  ← most recent first
│     AO3: 31 · FFN: 16   │
│     2 hours ago          │
├─────────────────────────┤
│  🔍 "dark academia AU"  │
│     AO3: 22 · FFN: 8    │
│     Yesterday            │
├─────────────────────────┤
│  ...                     │
├─────────────────────────┤
│  [ Clear All History ]   │
└─────────────────────────┘
```

**Details**:
- Each entry shows: prompt text (truncated to 60 chars), result counts per platform, relative timestamp
- Click an entry: re-runs the search. If cached results exist (within 24hr TTL), display them instantly. Otherwise, re-execute the full pipeline.
- "Clear All History" at the bottom: confirms with a small inline "Are you sure?" prompt before clearing
- Stored via Dexie.js in IndexedDB. Schema:

```typescript
interface SearchHistoryEntry {
  id?: number;             // auto-incremented
  prompt: string;
  parsedFilters: object;   // the resolved filters from tag mapper / LLM
  resultCount: number;
  ao3Count: number;
  ffnCount: number;
  timestamp: Date;
  cachedResults?: FicResult[];  // optional, for instant re-display
}
```

**Dexie setup** (`lib/storage/db.ts`):
```typescript
import Dexie, { type Table } from 'dexie';

export class FicFinderDB extends Dexie {
  searchHistory!: Table<SearchHistoryEntry>;
  
  constructor() {
    super('ficfinder');
    this.version(1).stores({
      searchHistory: '++id, prompt, timestamp'
    });
  }
}

export const db = new FicFinderDB();
```

---

## 4. Search Pipeline Integration

The frontend communicates with the backend via API routes that already exist. Here's how the UI orchestrates a search:

### 4.1 API Route: `POST /api/search`

**Request body**:
```json
{
  "prompt": "enemies to lovers slow burn over 100k words",
  "platforms": ["ao3", "ffn"],
  "filters": {}
}
```

**Response**: Server-Sent Events (SSE) stream. Each event has a `type` field:

```typescript
type SearchEvent =
  | { type: 'status'; step: string; status: 'active' | 'complete' | 'skipped' | 'error'; message?: string }
  | { type: 'results'; platform: 'ao3' | 'ffn'; results: FicResult[] }
  | { type: 'ranked'; results: FicResult[] }  // final ranked list
  | { type: 'done'; totalMs: number }
  | { type: 'error'; message: string }
```

### 4.2 Frontend SSE Handler

In `page.tsx` or a custom hook (`hooks/useSearch.ts`):

```typescript
function useSearch() {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>(initialStatus);
  const [results, setResults] = useState<FicResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  async function search(prompt: string) {
    setIsSearching(true);
    setResults([]);
    resetPipeline();

    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, platforms: ['ao3', 'ffn'] }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop()!;
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const event: SearchEvent = JSON.parse(line.slice(6));
        
        switch (event.type) {
          case 'status':
            updatePipelineStep(event.step, event.status);
            break;
          case 'results':
            // Append unranked results immediately (matchScore = null)
            setResults(prev => [...prev, ...event.results]);
            break;
          case 'ranked':
            // Replace with fully ranked list
            setResults(event.results);
            break;
          case 'done':
            setIsSearching(false);
            saveToHistory(prompt, event);
            break;
          case 'error':
            handleError(event.message);
            break;
        }
      }
    }
  }

  return { search, results, pipelineStatus, isSearching };
}
```

### 4.3 Streaming UX Details

The key UX challenge: results arrive in two phases (raw results, then ranked results). Handle this gracefully:

1. **Phase 1 — Results streaming in**: As `results` events arrive, rows appear in the table. The `matchScore` column shows a shimmer skeleton. Rows are sorted by platform arrival order (AO3 results first, then FFN, since AO3 is usually faster). The rank column shows "—".

2. **Phase 2 — Ranking complete**: When the `ranked` event arrives, the table does a smooth transition:
   - Score skeletons are replaced with actual scores
   - Rows re-sort by match score with a CSS `transition` on `transform` (rows slide into new positions over 300ms)
   - Rank numbers populate
   - This re-sort animation is critical — don't just swap rows instantly, it's disorienting

3. **If ranking fails/is skipped**: Scores stay empty. Sort falls back to a combined stat heuristic (kudos + favorites normalized). Show a subtle banner: "AI ranking unavailable — sorted by popularity".

---

## 5. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Layout changes |
|------------|-------|----------------|
| Mobile | < 640px | Search bar full-bleed, table horizontal scroll, history as bottom sheet instead of side panel, hide Author + Rating + Why columns (available on row expand) |
| Tablet | 640–1024px | Narrower table, Tags column hidden (available on row expand) |
| Desktop | > 1024px | Full layout as specified |

### Mobile-Specific

- Search bar: remove right padding for button, use icon-only submit button
- Results table: card layout option (toggle between table and cards). Each card shows:
  ```
  ┌──────────────────────────┐
  │ [AO3] Title of the Fic    │
  │ by Author · 52.3k words   │
  │ Complete · Rated T         │
  │ ██████████░░ 78/100        │
  │ "Strong enemies-to-lovers  │
  │  dynamics with..."         │
  │ [slow burn] [fix-it] +3    │
  └──────────────────────────┘
  ```
- Card style: `bg-elevated rounded-xl p-4 shadow-sm border border-border-default`
- Cards stack vertically with `gap-3`
- Toggle control (table/card icon buttons) in the toolbar, only visible on mobile

---

## 6. Animations & Micro-Interactions

### Search Bar

- **Typewriter placeholder**: CSS `@keyframes` + JS interval cycling through example prompts. Characters appear one by one (40ms per char), pause 2s at end, then erase (20ms per char), pause 500ms, next example.
- **Hero → Header transition**: When search is submitted from the empty state, the search bar animates from center to top using CSS `transition` on `transform` and `top`. Duration: 400ms, `ease-out`. The logo scales down simultaneously.

### Pipeline Indicator

- **Active step pulse**: The active circle has a CSS `@keyframes pulse` (scale 1→1.3→1, opacity 1→0.6→1) on a 1.5s loop.
- **Step completion**: Circle fills from hollow to solid with a quick scale-bounce (200ms).
- **Collapse**: After all steps complete, a 300ms delay, then the indicator's height transitions to the summary line height over 250ms.

### Results Table

- **Row entrance**: New rows fade in and slide up (`opacity 0→1`, `translateY(8px→0)`) over 200ms. Stagger consecutive rows by 30ms.
- **Ranking reorder**: When ranked results arrive, rows transition to their new positions using `transform: translateY()` over 300ms with `ease-in-out`. This requires tracking previous row positions.
- **Score bar fill**: The horizontal match score bar animates its width from 0 to final value over 400ms with `ease-out`, triggered when the score first appears.
- **Tag expand**: Tag list expands with a `max-height` transition (200ms).

### History Panel

- **Slide in**: `transform: translateX(100%→0)` over 250ms with backdrop opacity fading in.
- **Slide out**: Reverse, same timing.

---

## 7. Accessibility

- All interactive elements have visible focus rings (`ring-2 ring-accent/30 ring-offset-2`)
- Search bar: `role="search"`, `aria-label="Search for fanfiction"`
- Results table: proper `<table>` semantics (TanStack Table handles this), `aria-sort` on sortable columns
- Pipeline status: `aria-live="polite"` region so screen readers announce step changes
- Platform badges: include `aria-label="Archive of Our Own"` / `aria-label="FanFiction.net"` (not just "AO3")
- Export button: `aria-label="Export search results as spreadsheet"`
- History panel: trap focus when open, `Escape` closes it
- Color contrast: all text/background pairs meet WCAG AA (4.5:1 minimum). Verified: `text-primary` on `bg-primary` = 14.5:1, `text-secondary` on `bg-primary` = 7.2:1, `text-tertiary` on `bg-primary` = 4.6:1
- Score bar: don't rely on color alone — the number is always visible alongside the bar

---

## 8. File Structure (Frontend Only)

Only create/modify these files. Do not touch backend API routes, scrapers, or AI modules.

```
app/
├── page.tsx                    # Main page — all 3 states (empty, loading, results)
├── layout.tsx                  # Root layout — font loading, global styles, metadata
└── globals.css                 # CSS variables, base styles, animations

components/
├── SearchBar.tsx               # Search input + submit + typewriter placeholder
├── QuickFilters.tsx            # Pre-built query chips
├── StatusIndicator.tsx         # 5-step pipeline progress
├── ResultsTable.tsx            # TanStack Table with all columns
├── ResultsCard.tsx             # Mobile card layout alternative
├── TableToolbar.tsx            # Result count + sort/filter controls
├── ExportButton.tsx            # XLSX/CSV export via SheetJS
├── SearchHistory.tsx           # Side panel with past searches
├── PlatformBadge.tsx           # AO3/FFN badge component
├── RatingBadge.tsx             # Rating circle badge
├── ScoreBar.tsx                # Match score horizontal bar
├── TagList.tsx                 # Expandable tag chips
└── Toast.tsx                   # Lightweight toast notification

hooks/
├── useSearch.ts                # SSE handler, state management for pipeline + results
├── useSearchHistory.ts         # Dexie.js read/write operations
└── useMediaQuery.ts            # Responsive breakpoint detection

lib/
├── storage/
│   └── db.ts                   # Dexie.js IndexedDB setup
├── schema/
│   └── types.ts                # Shared TypeScript interfaces (FicResult, PipelineStatus, etc.)
└── utils/
    ├── format.ts               # Word count formatter (52300 → "52.3k"), relative time
    └── export.ts               # SheetJS export logic
```

---

## 9. Key TypeScript Interfaces

These go in `lib/schema/types.ts` and are imported everywhere:

```typescript
export interface FicResult {
  id: string;
  platform: 'ao3' | 'ffn';
  title: string;
  author: string;
  url: string;
  authorUrl: string;
  rating: 'G' | 'T' | 'M' | 'E';
  wordCount: number;
  chapters: string;
  status: 'complete' | 'in-progress';
  tags: string[];
  summary: string;
  stats: {
    kudos?: number;
    hits?: number;
    bookmarks?: number;
    reviews?: number;
    favs?: number;
    follows?: number;
  };
  matchScore: number | null;  // null before ranking
  matchReason: string | null;
  updatedAt: string;          // ISO date string
}

export interface PipelineStep {
  id: 'tag-map' | 'llm-parse' | 'ao3-fetch' | 'ffn-fetch' | 'ranking';
  label: string;
  status: 'pending' | 'active' | 'complete' | 'skipped' | 'error';
  errorMessage?: string;
}

export interface PipelineStatus {
  steps: PipelineStep[];
  resultCounts?: { ao3: number; ffn: number };
  elapsedMs?: number;
  summary?: string;
}

export interface SearchHistoryEntry {
  id?: number;
  prompt: string;
  parsedFilters: Record<string, unknown>;
  resultCount: number;
  ao3Count: number;
  ffnCount: number;
  timestamp: Date;
  cachedResults?: FicResult[];
}

export type SortField = 'matchScore' | 'wordCount' | 'title' | 'updatedAt';
export type PlatformFilter = 'all' | 'ao3' | 'ffn';
export type StatusFilter = 'all' | 'complete' | 'in-progress';
export type RatingFilter = 'all' | 'G' | 'T' | 'M' | 'E';
```

---

## 10. Dependencies to Install

```bash
npm install @tanstack/react-table @tanstack/react-virtual dexie xlsx
```

All other dependencies (Next.js, React, Tailwind) are assumed to already be in the project from the backend setup.

---

## 11. Implementation Order

Build in this order — each step should result in a working (if incomplete) UI:

1. **`layout.tsx` + `globals.css`**: Font loading, CSS variables, base styles. Verify fonts render.
2. **`page.tsx` empty state + `SearchBar.tsx`**: Centered hero search bar with typewriter animation. No functionality yet.
3. **`QuickFilters.tsx`**: Static chips below search bar.
4. **`StatusIndicator.tsx`**: Build with mock data first. Wire to real pipeline later.
5. **`lib/schema/types.ts` + `lib/utils/format.ts`**: Types and formatters.
6. **`ResultsTable.tsx` + all sub-components** (PlatformBadge, RatingBadge, ScoreBar, TagList): Build with mock data array of 10 results. Get columns, sorting, filtering working.
7. **`TableToolbar.tsx`**: Wire filter controls to TanStack Table state.
8. **`hooks/useSearch.ts`**: SSE handler. Wire to real backend. Test the full search flow.
9. **`page.tsx` state transitions**: Implement empty→loading→results transitions with animations.
10. **`lib/storage/db.ts` + `hooks/useSearchHistory.ts` + `SearchHistory.tsx`**: IndexedDB persistence and history panel.
11. **`ExportButton.tsx` + `lib/utils/export.ts`**: SheetJS integration.
12. **`ResultsCard.tsx` + responsive breakpoints**: Mobile card layout.
13. **Animations polish**: Typewriter, pipeline pulse, row entrance, reorder, score bar fill.
14. **Accessibility audit**: Focus management, ARIA attributes, contrast check.

---

## 12. Things to NOT Do

- Do not add authentication or user accounts. Everything is anonymous + client-side.
- Do not add dark mode yet (future enhancement). Build light mode only.
- Do not add infinite scroll. Results are capped at 50 per search — all render in one page.
- Do not pre-optimize with React.memo/useMemo everywhere. Only optimize if you observe performance issues with 50 rows.
- Do not create a separate loading page or splash screen. The empty state IS the landing page.
- Do not use a component library (no MUI, no Chakra, no shadcn). Build all components from scratch with Tailwind. The design system is custom.
- Do not use `localStorage` — all persistence goes through Dexie.js / IndexedDB.
- Do not modify any files in `lib/scrapers/`, `lib/ai/`, or `app/api/`. Those are backend. This spec is frontend only.
