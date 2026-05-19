'use client';

import Link from 'next/link';
import { useState } from 'react';

import { MOCK_RESULTS } from '@/lib/mock-data';
import ResultsTable from '@/components/ResultsTable';
import { ResultsBento } from '@/components/results/ResultsBento';
import { ViewToggle, usePersistedResultsView } from '@/components/results/ViewToggle';
import { useIsMobile } from '@/hooks/useMediaQuery';

export default function DemoPage() {
  const [view, setView] = usePersistedResultsView();
  const isMobile = useIsMobile();
  const [query] = useState('enemies to lovers slow burn, complete only');

  return (
    <div className="min-h-screen paper-grid-bg">
      <header
        className="sticky top-0 z-40 flex h-14 items-center justify-between px-4 sm:px-6"
        style={{
          backgroundColor: 'rgba(244, 240, 223, 0.92)',
          borderBottom: '1.5px solid var(--border-ink)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Link href="/" className="flex items-baseline gap-2" aria-label="FanFiction Finder home">
          <span className="font-display text-2xl italic leading-none" style={{ color: 'var(--text-primary)' }}>
            Fanfic Finder
          </span>
          <span className="font-mono text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            / demo
          </span>
        </Link>
        <Link
          href="/"
          className="font-mono text-xs underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← back to search
        </Link>
      </header>

      <main className="mx-auto px-4 py-8 sm:px-6" style={{ maxWidth: '1200px' }}>
        <section className="mb-8">
          <div
            className="indie-sticker mb-3 inline-block px-2 py-0.5 font-mono text-[11px]"
            style={{
              backgroundColor: 'var(--accent-alt-light)',
              color: 'var(--text-primary)',
              border: '1.5px solid var(--text-primary)',
            }}
          >
            demo / static fixture data
          </div>
          <h1 className="font-display text-4xl italic leading-tight" style={{ color: 'var(--text-primary)' }}>
            What results look like
          </h1>
          <p className="mt-2 max-w-prose text-base" style={{ color: 'var(--text-secondary)' }}>
            These are mocked results from <code className="font-mono text-sm">lib/mock-data.ts</code>. The
            real search hits AO3/FFN/Wattpad and ranks with Gemini + Claude; this page just renders the
            same components against a fixed payload so you can see the UI without auth or a backend.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span>query:</span>
            <span
              className="rounded-full border px-2 py-0.5"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            >
              {query}
            </span>
            <span>•</span>
            <span>{MOCK_RESULTS.length} results</span>
          </div>
        </section>

        <div className="sticky top-16 z-20 mb-4 flex justify-end">
          <ViewToggle value={view} onChange={setView} />
        </div>

        {view === 'bento' ? (
          <ResultsBento results={MOCK_RESULTS} />
        ) : (
          <ResultsTable results={MOCK_RESULTS} isRanked isMobile={isMobile} />
        )}

        <footer className="mt-12 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          <span>static fixture</span>
          <span style={{ color: 'var(--accent)' }}>◆</span>
          <span>no auth required</span>
          <span style={{ color: 'var(--accent)' }}>◆</span>
          <Link href="/" className="underline">go back home</Link>
        </footer>
      </main>
    </div>
  );
}
