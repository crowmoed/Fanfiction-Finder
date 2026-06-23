"use client";

/**
 * Highlight — renders text with the active query terms wrapped in <mark>.
 *
 * Terms come from HighlightContext (provided by the results surface) so callers
 * don't have to thread the query through every component. When there's no active
 * query (e.g. demos, detail page opened directly), it renders plain text.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { highlightSegments, queryTerms } from "@/lib/results/highlight";

const HighlightContext = createContext<string[]>([]);

/** Provide the active query terms to everything below (derived from the query). */
export function HighlightProvider({
  query,
  children,
}: {
  query: string | undefined;
  children: ReactNode;
}) {
  const terms = useMemo(() => (query ? queryTerms(query) : []), [query]);
  return (
    <HighlightContext.Provider value={terms}>{children}</HighlightContext.Provider>
  );
}

export function Highlight({ text }: { text: string | null | undefined }) {
  const terms = useContext(HighlightContext);
  if (!text) return null;
  if (terms.length === 0) return <>{text}</>;
  const segments = highlightSegments(text, terms);
  return (
    <>
      {segments.map((seg, i) =>
        seg.match ? (
          <mark key={i} className="hl">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}
