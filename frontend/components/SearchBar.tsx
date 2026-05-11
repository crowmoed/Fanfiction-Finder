'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { type Fandom, type FandomInfo, type FicResult } from '@/lib/schema/types';

const EXAMPLES = [
  'enemies to lovers slow burn over 100k words',
  'fix-it fic where nobody dies, complete only',
  'dark academia AU with unreliable narrator',
  'found family trope, rated T or below',
];

interface SearchBarProps {
  onSearch: (prompt: string, fandom: Fandom, cachedResults?: FicResult[]) => void;
  isSearching: boolean;
  compact?: boolean;
  initialPrompt?: string;
  initialFandom?: Fandom;
  appendToPrompt?: string;
}

export default function SearchBar({
  onSearch,
  isSearching,
  compact = false,
  initialPrompt = '',
  initialFandom = '',
  appendToPrompt = '',
}: SearchBarProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [fandom, setFandom] = useState<Fandom>(initialFandom);
  const [fandoms, setFandoms] = useState<FandomInfo[]>([]);
  const [placeholder, setPlaceholder] = useState('');
  const [fireworks, setFireworks] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const fireworkIdRef = useRef(0);
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
        const list = Array.isArray(data.fandoms) ? data.fandoms : [];
        setFandoms(list);
        if (!fandom) {
          const allFandoms = list.find((f) => f.name === 'All Fandoms');
          const first = allFandoms ?? list.find((f) => f.collected) ?? list[0];
          if (first) setFandom(first.name);
        }
      })
      .catch(() => {
        setFandoms([]);
      });
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

  const spawnFirework = useCallback(() => {
    const colors = ['var(--accent)', 'var(--accent-alt)', 'var(--accent-hover)'];
    const input = inputRef.current;
    const container = input?.parentElement;
    const width = container?.clientWidth ?? 300;
    // Gentle center bias: average two randoms → triangular distribution peaked at 0.5.
    const r = (Math.random() + Math.random()) / 2;
    const x = 16 + r * Math.max(0, width - 32);
    // Vary vertical position above the bar: higher = farther up.
    const y = -4 - Math.random() * 22;
    const id = ++fireworkIdRef.current;
    const color = colors[Math.floor(Math.random() * colors.length)];
    setFireworks((prev) => [...prev, { id, x, y, color }]);
    setTimeout(() => {
      setFireworks((prev) => prev.filter((f) => f.id !== id));
    }, 950);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!prompt.trim() || isSearching) return;
    const full = appendToPrompt
      ? `${prompt.trim()}, ${appendToPrompt}`
      : prompt.trim();
    onSearch(full, fandom, undefined);
  }, [prompt, fandom, isSearching, onSearch, appendToPrompt]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }

  const containerSize = compact ? 'px-3 py-2' : 'px-4 py-3.5';

  return (
    <div className="w-full space-y-3">
      {/* Search input */}
      <div
        className={`relative flex items-center gap-3 ${containerSize}`}
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: `1.5px solid var(--text-primary)`,
          borderRadius: compact ? '6px' : '4px',
          boxShadow: compact ? 'var(--shadow-sm)' : 'var(--shadow-md)',
        }}
        role="search"
        aria-label="Search for fanfiction"
      >
        {/* Firework bursts — one per keystroke, auto-removed after animation */}
        <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
          {fireworks.map((f) => (
            <span
              key={f.id}
              className="firework absolute"
              style={{ left: f.x, top: f.y, color: f.color }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  className="firework-particle"
                  style={{ ['--angle' as string]: `${i * 45}deg` }}
                />
              ))}
            </span>
          ))}
        </div>
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
          onChange={(e) => {
            const next = e.target.value;
            if (next.length > prompt.length) spawnFirework();
            setPrompt(next);
          }}
          onKeyDown={handleKeyDown}
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
          className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-mono font-medium uppercase tracking-wider disabled:opacity-50"
          style={{
            backgroundColor: isSearching ? 'var(--accent-hover)' : 'var(--accent)',
            color: 'var(--bg-elevated)',
            border: '1.5px solid var(--text-primary)',
            borderRadius: '4px',
            letterSpacing: '0.05em',
          }}
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
          className="flex-1 max-w-xs px-3 py-1.5 text-sm font-mono focus:outline-none"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1.5px solid var(--text-primary)',
            borderRadius: '4px',
            boxShadow: '2px 2px 0 rgba(26, 24, 20, 0.9)',
          }}
        >
          {fandoms.length === 0 ? (
            <option value="">Backend unavailable</option>
          ) : (
            <>
              {fandoms.find((f) => f.name === 'All Fandoms') && (
                <option value="All Fandoms">All Fandoms</option>
              )}
              <optgroup label="Available">
                {fandoms.filter((f) => f.collected && f.name !== 'All Fandoms').map((f) => (
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
