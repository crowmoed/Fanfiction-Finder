"use client";

import { useMemo, useState } from "react";

import { ALL_FANDOMS, type SearchParams } from "@/lib/contracts";
import { useFandoms } from "@/lib/client/useFandoms";
import { useSearchHistory } from "@/lib/client/history";

/**
 * SearchForm — the search lectern. Controlled inputs for query, fandom, and the
 * strict toggle. Emits a SearchParams on submit; the parent decides what to do
 * (navigate to /results, run inline, etc).
 *
 * The query input has history-backed autocomplete: as you type, matching past
 * searches surface in a dropdown; picking one fills query + fandom + strict.
 */
export function SearchForm({
  initial,
  onSubmit,
  busy,
}: {
  initial?: Partial<SearchParams>;
  onSubmit: (params: SearchParams) => void;
  busy?: boolean;
}) {
  const { fandoms, loading } = useFandoms();
  const history = useSearchHistory();
  const [q, setQ] = useState(initial?.q ?? "");
  const [fandom, setFandom] = useState(initial?.fandom ?? ALL_FANDOMS);
  const [strict, setStrict] = useState(initial?.strict ?? false);
  const [focused, setFocused] = useState(false);

  const canSubmit = q.trim().length > 0 && !busy;

  // De-duped past queries matching the current input (case-insensitive).
  const suggestions = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const seen = new Set<string>();
    return history
      .filter((h) => {
        const key = `${h.q}::${h.fandom}`;
        if (seen.has(key)) return false;
        seen.add(key);
        if (h.q.toLowerCase() === needle) return false; // already typed exactly
        return needle === "" || h.q.toLowerCase().includes(needle);
      })
      .slice(0, 6);
  }, [history, q]);

  const showSuggestions = focused && suggestions.length > 0;

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setFocused(false);
        onSubmit({ q: q.trim(), fandom, strict });
      }}
    >
      <div style={{ position: "relative" }}>
        <input
          type="search"
          placeholder="Describe the fic you're looking for…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          // Delay so a click on a suggestion registers before blur hides it.
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          aria-label="Search query"
          autoComplete="off"
        />
        {showSuggestions && (
          <ul
            className="autocomplete"
            role="listbox"
            aria-label="Recent searches"
          >
            {suggestions.map((h) => (
              <li key={h.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="autocomplete-item"
                  onMouseDown={(e) => e.preventDefault()} // keep focus until click fires
                  onClick={() => {
                    setQ(h.q);
                    setFandom(h.fandom);
                    setStrict(h.strict);
                    setFocused(false);
                  }}
                >
                  <span>{h.q}</span>
                  <span className="muted">{h.fandom}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="row">
        <label className="row" style={{ gap: "0.4rem" }}>
          Fandom:
          <select
            value={fandom}
            onChange={(e) => setFandom(e.target.value)}
            disabled={loading}
            style={{ width: "auto" }}
          >
            {fandoms.map((f) => (
              <option key={f.name} value={f.name} disabled={!f.collected}>
                {f.name}
                {f.collected ? "" : " (not indexed)"}
              </option>
            ))}
          </select>
        </label>
        <label className="row" style={{ gap: "0.4rem" }}>
          <input
            type="checkbox"
            checked={strict}
            onChange={(e) => setStrict(e.target.checked)}
            style={{ width: "auto" }}
          />
          Strict filters
        </label>
        <span className="spacer" />
        <button type="submit" disabled={!canSubmit}>
          {busy ? "Searching…" : "Search"}
        </button>
      </div>
    </form>
  );
}
