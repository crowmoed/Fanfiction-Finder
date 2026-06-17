'use client';

import { useEffect, useRef, useState } from 'react';
import type { Fandom, FandomInfo } from '@/lib/schema/types';
import { cn } from '@/lib/cn';

interface FilterChipsProps {
  fandom: Fandom;
  onFandomChange: (fandom: Fandom) => void;
  compact?: boolean;
}

export function FilterChips({ fandom, onFandomChange, compact = false }: FilterChipsProps) {
  const [fandoms, setFandoms] = useState<FandomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/fandoms')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('No fandom route'))))
      .then((data: { fandoms: FandomInfo[] }) => {
        if (Array.isArray(data.fandoms) && data.fandoms.length > 0) setFandoms(data.fandoms);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (fandom) return;
    const first =
      fandoms.find((item) => item.name === 'All Fandoms') ??
      fandoms.find((item) => item.collected) ??
      fandoms[0];
    if (first) onFandomChange(first.name);
  }, [fandom, fandoms, onFandomChange]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex min-w-0 items-center">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Choose fandom"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border bg-surface-2 font-mono text-xs text-ink transition-colors duration-150 ease-out',
          open ? 'border-accent' : 'border-border hover:border-border-strong',
          compact ? 'h-8 px-2.5' : 'px-3 py-1.5',
        )}
      >
        <span aria-hidden className="text-accent-text">✦</span>
        <span className={compact ? 'sr-only' : 'max-w-[160px] truncate'}>{fandom || 'All Fandoms'}</span>
        <span aria-hidden className="text-ink-3">⌄</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="scrollbar-translucent absolute left-0 top-full z-[50] mt-2 max-h-64 w-64 overflow-y-auto rounded-md border border-border bg-surface p-1.5 shadow-soft"
        >
          {loading ? (
            <div className="px-3 py-2 font-mono text-xs text-ink-3">loading…</div>
          ) : fandoms.length === 0 ? (
            <div className="px-3 py-2 font-mono text-xs text-ink-3">no fandoms found</div>
          ) : (
            fandoms.map((item) => {
              const selected = item.name === fandom;
              return (
                <button
                  type="button"
                  key={item.name}
                  role="option"
                  aria-selected={selected}
                  disabled={!item.collected}
                  onClick={() => {
                    onFandomChange(item.name);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm text-ink transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-40',
                    selected ? 'bg-accent-soft text-accent-text' : 'hover:bg-surface-2',
                  )}
                >
                  <span>{item.name}</span>
                  {selected && <span aria-hidden className="text-accent-text">✓</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
