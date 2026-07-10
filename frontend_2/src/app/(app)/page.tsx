"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { type SearchParams } from "@/lib/contracts";
import { SearchForm, type SearchPrefill } from "@/components/SearchForm";

// Example queries: clicking one loads it into the composer for editing (it
// does NOT search). A separate pool from SearchForm's rotating placeholders so
// the ghost text and a chip never show the same line at once.
const SUGGESTIONS = [
  "Drarry slow burn, enemies to lovers, no major character death",
  "post-war Kakashi raises Naruto, found family, slow healing",
  "time-travel fix-it where Luffy remembers everything",
  "quiet eighth-year Hogwarts fic, lots of pining, happy ending",
];

export default function HomePage() {
  const router = useRouter();
  // The one async moment on this page is the click-to-navigate to /results.
  // Wrapping the push in a transition gives us a real pending state, which the
  // hero baseline already knows how to render: its vermilion rule sweep (the
  // one busy motif) plays and the input/controls disable (double-submit guard)
  // for the brief window before /results takes over. Reduced-motion is handled
  // inside the baseline CSS (globals.css §18).
  const [pending, startTransition] = useTransition();

  // Chips prefill the composer (editable) instead of firing a search. The
  // nonce lets the same chip re-fill after the user edited or cleared it.
  const [prefill, setPrefill] = useState<SearchPrefill | null>(null);
  const prefillSeq = useRef(0);

  const go = (params: SearchParams) => {
    const qs = new URLSearchParams({
      q: params.q,
      fandom: params.fandom,
      strict: String(params.strict ?? false),
    });
    startTransition(() => {
      router.push(`/results?${qs.toString()}`);
    });
  };

  return (
    <div className="home-hero">
      {/* The page's one kicker (REDESIGN-SPEC §2). Whisper-quiet folio line —
          what this is and where it searches. */}
      <p className="eyebrow home-kicker rise-in">
        Semantic fic search · AO3 · FFN · Wattpad
      </p>

      {/* The signature statement. No hanko here: the sidebar lockup carries the
          brand; a decorative stamp with no commitment behind it is costume.
          A 60ms beat after the kicker so the opening reads as two moments. */}
      <h1
        className="t-display-hero home-headline rise-in"
        style={{ "--rise-delay": "60ms" } as React.CSSProperties}
      >
        Describe the fic you want.
      </h1>

      <div
        className="home-composer rise-in"
        style={{ "--rise-delay": "120ms" } as React.CSSProperties}
      >
        <SearchForm onSubmit={go} variant="hero" busy={pending} prefill={prefill} />
      </div>

      <div className="hero-suggestions">
        <span
          className="hero-suggestions-label rise-in"
          style={{ "--rise-delay": "200ms" } as React.CSSProperties}
        >
          Try one of these
        </span>
        <div className="hero-suggestions-row">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={s}
              type="button"
              className="suggestion-chip rise-in"
              style={
                { "--rise-delay": `${240 + i * 40}ms` } as React.CSSProperties
              }
              onClick={() => setPrefill({ q: s, nonce: ++prefillSeq.current })}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
