'use client';

import { useEffect, useState } from 'react';
import { SITE } from '@/lib/site';

const STEPS = [
  { mark: '“', sub: 'Query', label: 'Reading your query' },
  { mark: 'C', sub: 'Claude', label: 'Expanding the search (HyDE)' },
  { mark: 'G', sub: 'Gemini', label: 'Embedding the meaning' },
  { mark: 'pg', sub: 'Postgres', label: `Vector search · ${SITE.ficsIndexed.toLocaleString()} fics` },
  { mark: 'C', sub: 'Claude', label: 'Re-ranking the best matches' },
];

export function ArchitectureBeam() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current >= STEPS.length - 1 ? 3 + ((current + 1) % 2) : current + 1));
    }, 700);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-16">
      {/* horizontal on desktop */}
      <div className="hidden w-full items-stretch justify-center gap-2 sm:flex">
        {STEPS.map((step, index) => (
          <div key={`${step.sub}-${index}`} className="flex flex-1 items-center gap-2">
            <PipelineNode step={step} active={index === active} complete={index < active} />
            {index < STEPS.length - 1 && <Connector lit={index < active} />}
          </div>
        ))}
      </div>

      {/* vertical on mobile */}
      <div className="flex flex-col items-center gap-2 sm:hidden">
        {STEPS.map((step, index) => (
          <div key={`${step.sub}-m-${index}`} className="flex flex-col items-center gap-2">
            <PipelineNode step={step} active={index === active} complete={index < active} />
            {index < STEPS.length - 1 && <Connector vertical lit={index < active} />}
          </div>
        ))}
      </div>

      <div
        className="min-h-12 rounded-md border border-border bg-surface px-4 py-3 text-center font-mono text-sm text-ink-2"
        aria-live="polite"
      >
        {STEPS[active]?.label}
      </div>
    </div>
  );
}

function Connector({ vertical = false, lit }: { vertical?: boolean; lit: boolean }) {
  return (
    <span
      aria-hidden
      className={vertical ? 'h-5 w-px' : 'h-px flex-1'}
      style={{ backgroundColor: lit ? 'var(--accent)' : 'var(--border)' }}
    />
  );
}

function PipelineNode({
  step,
  active,
  complete,
}: {
  step: { mark: string; sub: string; label: string };
  active: boolean;
  complete: boolean;
}) {
  const on = active || complete;
  return (
    <div className="flex min-w-[80px] flex-col items-center gap-2 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full border font-mono text-sm font-semibold transition-colors duration-300 ease-out"
        style={{
          backgroundColor: on ? 'var(--accent-soft)' : 'var(--surface)',
          borderColor: active ? 'var(--accent)' : 'var(--border-strong)',
          color: on ? 'var(--accent-text)' : 'var(--ink-2)',
          boxShadow: active ? '0 0 0 4px var(--accent-soft)' : 'none',
        }}
      >
        {step.mark}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-ink-3">{step.sub}</div>
    </div>
  );
}
