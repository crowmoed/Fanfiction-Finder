'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { type Fandom, type FandomInfo } from '@/lib/schema/types';

const EXAMPLES = [
  'enemies to lovers slow burn over 100k words',
  'fix-it fic where nobody dies, complete only',
  'dark academia AU with unreliable narrator',
  'found family trope, rated T or below',
];

interface SearchBarProps {
  onSearch: (prompt: string, fandom: Fandom) => void;
  isSearching: boolean;
  compact?: boolean;
  initialPrompt?: string;
  initialFandom?: Fandom;
  onQuickFilter?: (query: string) => void;
}

export default function SearchBar({
  onSearch,
  isSearching,
  compact = false,
  initialPrompt = '',
  initialFandom = '',
}: SearchBarProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [fandom, setFandom] = useState<Fandom>(initialFandom);
  const [fandoms, setFandoms] = useState<FandomInfo[]>([]);
  const [focused, setFocused] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const exampleIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const directionRef = useRef<'type' | 'erase'>('type');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch fandom list from backend
  useEffect(() => {
    fetch('/api/fandoms')
      .then((r) => r.json())
      .then((data: { fandoms: FandomInfo[] }) => {
        setFandoms(data.fandoms);
        if (!fandom) {
          const first = data.fandoms.find((f) => f.collected) ?? data.fandoms[0];
          if (first) setFandom(first.name);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Typewriter animation for placeholder
  useEffect(() => {
    if (compact) return;

    function tick() {
      const example = EXAMPLES[exampleIndexRef.current];

      if (directionRef.current === 'type') {
        charIndexRef.current += 1;
        setPlaceholder(example.slice(0, charIndexRef.current));

        if (charIndexRef.current >= example.length) {
          directionRef.current = 'erase';
          timerRef.current = setTimeout(tick, 2000);
        } else {
          timerRef.current = setTimeout(tick, 40);
        }
      } else {
        charIndexRef.current -= 1;
        setPlaceholder(example.slice(0, charIndexRef.current));

        if (charIndexRef.current <= 0) {
          directionRef.current = 'type';
          exampleIndexRef.current = (exampleIndexRef.current + 1) % EXAMPLES.length;
          timerRef.current = setTimeout(tick, 500);
        } else {
          timerRef.current = setTimeout(tick, 20);
        }
      }
    }

    timerRef.current = setTimeout(tick, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [compact]);

  const handleSubmit = useCallback(() => {
    if (!prompt.trim() || isSearching) return;
    onSearch(prompt.trim(), fandom);
  }, [prompt, fandom, isSearching, onSearch]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }

  const containerSize = compact ? 'px-3 py-2' : 'px-4 py-3.5';

  return (
    <div className="w-full space-y-3">
      {/* Search input */}
      <div
        className={`flex items-center gap-3 ${containerSize} rounded-xl border transition-all duration-150`}
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: focused ? 'var(--accent)' : 'var(--border-default)',
          boxShadow: focused
            ? '0 0 0 3px rgba(13, 148, 136, 0.15), var(--shadow-md)'
            : 'var(--shadow-md)',
        }}
        role="search"
        aria-label="Search for fanfiction"
      >
        {/* Search icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={compact ? 'Search fanfiction…' : placeholder || EXAMPLES[0]}
          className="flex-1 bg-transparent outline-none text-base min-w-0"
          style={{ color: 'var(--text-primary)' }}
          aria-label="Search query"
          disabled={isSearching}
        />

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={isSearching || !prompt.trim()}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-150 disabled:opacity-60"
          style={{ backgroundColor: isSearching ? 'var(--accent-hover)' : 'var(--accent)' }}
          onMouseEnter={(e) => {
            if (!isSearching) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-hover)';
          }}
          onMouseLeave={(e) => {
            if (!isSearching) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent)';
          }}
          aria-label="Search"
        >
          {isSearching ? (
            <>
              <Spinner />
              <span className="hidden sm:inline">Searching…</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="sm:hidden">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">Search</span>
            </>
          )}
        </button>
      </div>

      {/* Fandom selector — hidden in compact/header mode */}
      {!compact && <div className="flex items-center gap-2">
        <label
          className="text-sm shrink-0"
          style={{ color: 'var(--text-secondary)' }}
          htmlFor="fandom-select"
        >
          Fandom:
        </label>
        <select
          id="fandom-select"
          value={fandom}
          onChange={(e) => setFandom(e.target.value as Fandom)}
          className="flex-1 max-w-xs border rounded-lg px-3 py-1.5 text-sm focus:outline-none transition-colors duration-150"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-default)',
          }}
        >
          {fandoms.length === 0 ? (
            <option value="">Loading...</option>
          ) : (
            <>
              <optgroup label="Available">
                {fandoms.filter((f) => f.collected).map((f) => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </optgroup>
              <optgroup label="Coming Soon">
                {fandoms.filter((f) => !f.collected).map((f) => (
                  <option key={f.name} value={f.name} disabled>{f.name}</option>
                ))}
              </optgroup>
            </>
          )}
        </select>
      </div>}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M8 2a6 6 0 016 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
