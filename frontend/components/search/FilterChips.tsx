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
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-wrap items-center gap-2">
      <button
        type="button"
        className={chipClass(compact)}
        onClick={() => setOpen((value) => !value)}
        title="Choose fandom"
        style={{
          borderColor: open ? 'var(--accent)' : 'var(--border-default)',
          color: 'var(--text-primary)',
        }}
      >
        <span aria-hidden style={{ color: 'var(--accent)' }}>✦</span>
        <span className={compact ? 'sr-only' : 'max-w-[160px] truncate'}>{fandom || 'All Fandoms'}</span>
        <span aria-hidden style={{ color: 'var(--text-tertiary)' }}>⌄</span>
      </button>

      {open && (
        <div
          className="scrollbar-translucent absolute left-0 top-full z-50 mt-2 w-64 overflow-y-auto rounded-lg border p-1.5 shadow-md"
          style={{ maxHeight: '16rem', backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--text-primary)' }}
          onWheel={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
              loading…
            </div>
          ) : fandoms.length === 0 ? (
            <div className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
              no fandoms found
            </div>
          ) : fandoms.map((item) => {
            const selected = item.name === fandom;
            return (
              <button
                type="button"
                key={item.name}
                disabled={!item.collected}
                onClick={() => {
                  onFandomChange(item.name);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: selected ? 'var(--accent-light)' : 'transparent',
                }}
              >
                <span>{item.name}</span>
                {selected && (
                  <span aria-hidden style={{ color: 'var(--accent)' }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function chipClass(compact: boolean) {
  return cn(
    'inline-flex items-center gap-1.5 rounded-full border bg-[var(--bg-secondary)] font-mono text-xs',
    compact ? 'h-8 px-2' : 'px-3 py-1.5'
  );
}
