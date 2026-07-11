"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ALL_FANDOMS, type SearchParams } from "@/lib/contracts";
import { useFandoms } from "@/lib/client/useFandoms";
import { Icon } from "@/components/Icon";

/**
 * SearchForm — the search composer, in two structures:
 *
 * - `variant="hero"` (home): the "Baseline" structure from the search-bar
 *   exploration (design-explorations/search-bar, variant 04). No box at all —
 *   an auto-growing serif textarea resting on a baseline rule, so long
 *   cravings wrap onto new lines instead of scrolling off the side (Enter
 *   submits, Shift+Enter breaks the line). The rule is the whole state
 *   language: it breathes at rest, sweeps near-black on focus, and becomes an
 *   indeterminate progress sweep while busy. Controls (fandom, strict, search)
 *   are typographic, revealed on focus/text.
 * - `variant="boxed"` (default, results page): the plain chat-style box —
 *   auto-growing textarea over a control rail behind a visible seam.
 *
 * There is deliberately NO history/autofill tray in either structure — recent
 * searches move to the sidebar instead.
 */

const MAX_INPUT_HEIGHT = 168; // boxed: ~6 lines before the textarea scrolls
const MAX_HERO_INPUT_HEIGHT = 176; // hero: ~5 lines before the textarea scrolls

/** External fill request (home's suggestion chips): loads `q` into the input
 *  for editing without submitting. `nonce` must change per request so the same
 *  chip can re-fill after the user edited or cleared the text. */
export type SearchPrefill = { q: string; nonce: number };

/**
 * Idle placeholder rotation (hero): feature discovery for semantic search.
 * Deliberately short (they must fit a 24px serif line on a 390px phone without
 * clipping mid-word) and DISJOINT from the home page's suggestion chips — the
 * ghost text and a chip sitting under it must never echo each other.
 */
export const PLACEHOLDERS = [
  "Describe the fic you're looking for…",
  "post-war Drarry, slow burn…",
  "found family, slow healing…",
  "time-travel fix-it, happy ending…",
  "quiet pining, eighth year…",
];

export function SearchForm({
  initial,
  onSubmit,
  busy,
  variant = "boxed",
  autoFocus,
  onCancel,
  prefill,
}: {
  initial?: Partial<SearchParams>;
  onSubmit: (params: SearchParams) => void;
  busy?: boolean;
  variant?: "hero" | "boxed";
  /** Hero only: fill the input with a suggested query (editable, focused,
   *  caret at the end) without submitting. See SearchPrefill. */
  prefill?: SearchPrefill | null;
  /** Boxed only: autofocus the textarea on mount. Used when the composer was
   *  opened via /results' "Edit search" (REDESIGN-SPEC §3.1) — a bare empty
   *  /results visit stays quiet, so this is opt-in, not the hero's always-on
   *  empty-mount focus. */
  autoFocus?: boolean;
  /** Boxed only: renders a Cancel action that restores the caller's previous
   *  view (e.g. /results' query headline) without submitting. Escape does the
   *  same. Omit when there's nothing to cancel back to. */
  onCancel?: () => void;
}) {
  const { fandoms, loading, error: fandomsError, retry: retryFandoms } = useFandoms();
  const [q, setQ] = useState(initial?.q ?? "");
  const [fandom, setFandom] = useState(initial?.fandom ?? ALL_FANDOMS);
  const [strict, setStrict] = useState(initial?.strict ?? false);

  const canSubmit = q.trim().length > 0 && !busy;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({ q: q.trim(), fandom, strict });
  };

  const shared = {
    q,
    setQ,
    fandom,
    setFandom,
    strict,
    setStrict,
    busy,
    canSubmit,
    submit,
    fandoms,
    loading,
    fandomsError,
    retryFandoms,
  };

  return variant === "hero" ? (
    <HeroForm {...shared} prefill={prefill} />
  ) : (
    <BoxedForm {...shared} autoFocus={autoFocus} onCancel={onCancel} />
  );
}

type InnerProps = {
  q: string;
  setQ: (v: string) => void;
  fandom: string;
  setFandom: (v: string) => void;
  strict: boolean;
  setStrict: (v: boolean) => void;
  busy?: boolean;
  canSubmit: boolean;
  submit: () => void;
  fandoms: ReturnType<typeof useFandoms>["fandoms"];
  loading: boolean;
  fandomsError: ReturnType<typeof useFandoms>["error"];
  retryFandoms: ReturnType<typeof useFandoms>["retry"];
};

/* ────────────────────────────────────────────────────────────────────
   Hero: the "Baseline" structure. Input on a rule, typographic controls.
   ──────────────────────────────────────────────────────────────────── */

function HeroForm({
  q, setQ, fandom, setFandom, strict, setStrict,
  busy, canSubmit, submit, fandoms, loading, fandomsError, retryFandoms,
  prefill,
}: InnerProps & { prefill?: SearchPrefill | null }) {
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Anchor for the fandom list: an in-box element FandomListbox portals its
  // <ul> into, so the list positions against the composer box and hangs off its
  // bottom edge as an overlay (seamless with the bar, but out of flow — it does
  // NOT push the suggestions below it).
  const fandomSlotRef = useRef<HTMLDivElement>(null);

  // Grow with the content, same chatbox behavior as the boxed composer: reset,
  // then take scrollHeight up to the cap. Runs on every q change (incl. prefill).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HERO_INPUT_HEIGHT)}px`;
  }, [q]);

  // The hero input owns the room, so it takes focus on a fresh mount — but
  // only when it opens empty (REDESIGN-SPEC §2). A back-navigation that lands
  // here with a prefilled query must not yank the caret out from under the
  // user, so the guard reads the query ONCE at mount, not on every render.
  useEffect(() => {
    if (inputRef.current && !inputRef.current.value) inputRef.current.focus();
  }, []);

  // Suggestion-chip prefill: load the text, then hand the caret to the user at
  // the end of the line — an editable draft, not a fired search. Keyed on the
  // nonce so re-clicking a chip after edits re-fills.
  useEffect(() => {
    if (!prefill?.q) return;
    setQ(prefill.q);
    const el = inputRef.current;
    if (!el) return;
    // Focus after the new value has rendered so the caret lands at the end.
    const raf = requestAnimationFrame(() => {
      el.focus();
      const end = prefill.q.length;
      el.setSelectionRange(end, end);
    });
    return () => cancelAnimationFrame(raf);
  }, [prefill, setQ]);

  // Quiet idle life: rotate example placeholders while empty and unfocused.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (q || focused) return;
    let i = PLACEHOLDERS.indexOf(placeholder);
    const id = window.setInterval(() => {
      i = (i + 1) % PLACEHOLDERS.length;
      setPlaceholder(PLACEHOLDERS[i]);
    }, 3500);
    return () => window.clearInterval(id);
  }, [q, focused, placeholder]);

  const stateClass = [
    "baseline",
    busy ? "baseline--busy" : "",
    q ? "baseline--has-text" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <form
      ref={rootRef}
      className={stateClass}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="baseline-box">
        <div className="baseline-field">
          <textarea
            ref={inputRef}
            className="baseline-input"
            rows={1}
            /* The visible placeholder is the crossfading ghost below (a native
               ::placeholder can't be transitioned); aria-label carries the
               accessible name, so blanking the native placeholder is a11y-safe. */
            placeholder=""
            value={q}
            disabled={busy}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label="Search query"
            autoComplete="off"
            spellCheck={false}
          />
          {/* Ghost placeholder: keyed by text so each rotation tick fades the new
              phrase in (reduced motion pins the phrase, so it mounts once). */}
          {!q && (
            <span className="baseline-ghost" aria-hidden="true" key={placeholder}>
              {placeholder}
            </span>
          )}
        </div>

        <div className="baseline-controls">
          <FandomListbox
            fandoms={fandoms}
            loading={loading}
            value={fandom}
            disabled={busy}
            onChange={setFandom}
            inlineSlot={fandomSlotRef}
          />
          <button
            type="button"
            className="baseline-control baseline-strict"
            role="switch"
            aria-checked={strict}
            disabled={busy}
            onClick={() => setStrict(!strict)}
          >
            Strict: <span className="baseline-strict-state">{strict ? "on" : "off"}</span>
          </button>
          <span className="baseline-spacer" aria-hidden="true" />
          {/* Busy state: the rule's vermilion sweep is the working indicator —
              no second spinner next to it (one busy motif per view). */}
          <button type="submit" className="baseline-control baseline-submit" disabled={!canSubmit}>
            {busy ? "Searching…" : "Search"}
            {!busy && (
              <span className="baseline-submit-arrow" aria-hidden="true">
                <Icon name="arrow-right" size={14} />
              </span>
            )}
          </button>
        </div>

        {/* Anchor for the fandom list overlay: the list is portaled here and
            positioned against the box, hanging off its bottom edge in front of
            the page — the "seamless" picker. Out of flow, so nothing moves. */}
        <div ref={fandomSlotRef} className="baseline-fandom-slot" />

        {/* The slip's bottom edge IS the baseline rule — it closes the card and
            keeps both of its jobs: ink focus sweep, vermilion working line
            (picked from /dev/baseline-backgrounds.html, 08 "Slip"). */}
        <div className="baseline-rule" aria-hidden="true">
          <span className="baseline-rule-focus" />
          <span className="baseline-rule-sweep" />
        </div>
      </div>

      {fandomsError && (
        <p className="baseline-note muted" role="status">
          <Icon name="alert" size={14} /> Couldn&apos;t load the fandom list, so
          only All Fandoms is available.{" "}
          <button type="button" className="linklike" onClick={retryFandoms}>
            Retry
          </button>
        </p>
      )}
    </form>
  );
}

/** Typographic fandom chooser: text button + custom listbox, keyboard-complete. */
function FandomListbox({
  fandoms,
  loading,
  value,
  disabled,
  onChange,
  inlineSlot,
}: {
  fandoms: ReturnType<typeof useFandoms>["fandoms"];
  loading: boolean;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  /** When provided, the list is portaled into this element and positioned as an
   *  overlay hanging off the composer box's bottom edge (the "seamless" hero
   *  picker). Omit (boxed variant) to render the floating dropdown off the
   *  button instead. Either way it's an out-of-flow overlay. */
  inlineSlot?: React.RefObject<HTMLDivElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const options = useMemo(
    () => fandoms.map((f) => ({ name: f.name, enabled: f.collected })),
    [fandoms]
  );

  const openList = () => {
    const idx = Math.max(0, options.findIndex((o) => o.name === value));
    setActive(idx);
    setOpen(true);
  };

  const close = (refocus = false) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  };

  const choose = (idx: number) => {
    const opt = options[idx];
    if (!opt || !opt.enabled) return;
    onChange(opt.name);
    close(true);
  };

  const move = (from: number, dir: 1 | -1) => {
    // Skip disabled (not-indexed) options; stop at the ends.
    let i = from;
    do {
      i += dir;
    } while (i >= 0 && i < options.length && !options[i].enabled);
    if (i >= 0 && i < options.length) setActive(i);
  };

  // Outside click closes. The inline list is portaled outside wrapRef (into the
  // composer slot), so its own clicks must also count as "inside" — otherwise
  // mousedown on an option would close the list before the click selects it.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (inlineSlot?.current?.contains(t)) return;
      close();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, inlineSlot]);

  // Move focus into the listbox on open (autoFocus isn't honored on <ul>),
  // so arrow keys work immediately; keep the active option scrolled into view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelectorAll("li")
      [active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(active, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(active, -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(options.findIndex((o) => o.enabled));
    } else if (e.key === "End") {
      e.preventDefault();
      const last = [...options].reverse().findIndex((o) => o.enabled);
      if (last >= 0) setActive(options.length - 1 - last);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Tab") {
      close();
    }
  };

  return (
    <div className="baseline-control baseline-fandom" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className="baseline-fandom-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled || loading}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            openList();
          }
        }}
      >
        {value}
        <span className="baseline-caret" aria-hidden="true">
          <Icon name="chevron-down" size={12} />
        </span>
      </button>
      {open && renderList()}
    </div>
  );

  function renderList() {
    const list = (
      <ul
        ref={listRef}
        className={`baseline-fandom-list${
          inlineSlot ? " baseline-fandom-list--inline" : ""
        }`}
        role="listbox"
        tabIndex={-1}
        aria-label="Fandom"
        aria-activedescendant={`baseline-fandom-opt-${active}`}
        onKeyDown={onListKeyDown}
      >
        {options.map((o, i) => (
          <li
            key={o.name}
            id={`baseline-fandom-opt-${i}`}
            role="option"
            aria-selected={o.name === value}
            aria-disabled={!o.enabled}
            className={[
              "baseline-fandom-option",
              i === active ? "baseline-fandom-option--active" : "",
              !o.enabled ? "baseline-fandom-option--disabled" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onMouseEnter={() => o.enabled && setActive(i)}
            onClick={() => choose(i)}
          >
            {o.name}
            {!o.enabled && <span className="muted"> (not indexed)</span>}
          </li>
        ))}
      </ul>
    );
    // Hero: portal into the in-box slot so the overlay anchors to the box and
    // hangs off its bottom edge. Boxed: render in place (dropdown off the button).
    return inlineSlot?.current ? createPortal(list, inlineSlot.current) : list;
  }
}

/* ────────────────────────────────────────────────────────────────────
   Boxed: the plain chat-style composer (results page and anywhere dense).
   ──────────────────────────────────────────────────────────────────── */

function BoxedForm({
  q, setQ, fandom, setFandom, strict, setStrict,
  busy, canSubmit, submit, fandoms, loading, fandomsError, retryFandoms,
  autoFocus, onCancel,
}: InnerProps & { autoFocus?: boolean; onCancel?: () => void }) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Grow with the content (chatbox behavior): reset, then take scrollHeight
  // up to the cap. Runs on every q change, including the initial value.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [q]);

  // Opt-in autofocus (REDESIGN-SPEC §3.1): only when the caller explicitly
  // opened this as an editor (e.g. /results' Edit search), not on every mount
  // — a bare empty /results visit should stay quiet, unlike the hero.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per mount
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="composer">
        <textarea
          ref={inputRef}
          className="composer-input"
          rows={1}
          placeholder="Describe the fic you're looking for…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape" && onCancel) {
              e.preventDefault();
              onCancel();
            }
          }}
          aria-label="Search query"
          autoComplete="off"
        />

        <div className="composer-rail">
          <label className="composer-control">
            Fandom:
            <FandomListbox
              fandoms={fandoms}
              loading={loading}
              value={fandom}
              disabled={busy}
              onChange={setFandom}
            />
          </label>
          <label className="composer-control">
            <input
              type="checkbox"
              checked={strict}
              onChange={(e) => setStrict(e.target.checked)}
            />
            Strict filters
          </label>
          {onCancel && (
            <button type="button" className="btn-ghost composer-cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="composer-send" disabled={!canSubmit}>
            {busy ? "Searching…" : "Search"}
          </button>
        </div>

        {fandomsError && (
          <p className="composer-note muted" role="status">
            <Icon name="alert" size={14} /> Couldn&apos;t load the fandom list, so
            only All Fandoms is available.{" "}
            <button type="button" className="linklike" onClick={retryFandoms}>
              Retry
            </button>
          </p>
        )}
      </div>
    </form>
  );
}
