'use client';

import { useEffect, useState } from 'react';
import { Loader2, Check, Search, Sparkles, Binary, Database, ListChecks } from 'lucide-react';
import { SITE } from '@/lib/site';
import { cn } from '@/lib/cn';

/**
 * The loading screen, as an "agent planning" timeline: the real search pipeline
 * (read → expand → embed → retrieve → re-rank) revealed step by step. Self-driven
 * (no backend coupling); reduced-motion shows it settled rather than animating.
 */

const STEPS = [
  { icon: Search, title: 'Reading your query', sub: 'Pulling out tropes, pairings, and constraints' },
  { icon: Sparkles, title: 'Expanding the search', sub: 'Drafting hypothetical fic summaries with Claude (HyDE)' },
  { icon: Binary, title: 'Embedding the meaning', sub: 'Gemini · 768-dimension vectors' },
  { icon: Database, title: `Searching ${SITE.ficsIndexed.toLocaleString()} fics`, sub: 'Hybrid vector retrieval across AO3, FFN & Wattpad' },
  { icon: ListChecks, title: 'Re-ranking the best matches', sub: 'Scoring each candidate against your query' },
] as const;

type StepState = 'pending' | 'active' | 'complete';

export function ArchitectureBeam() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActive(STEPS.length - 1);
      return;
    }
    const timer = window.setInterval(() => {
      setActive((current) => Math.min(current + 1, STEPS.length - 1));
    }, 760);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        {/* spectrum hairline — ties the loader to the hero aurora */}
        <div aria-hidden className="spectrum-strip h-[3px] w-full" />

        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
          <Loader2 className="h-4 w-4 animate-spin text-ink-2" aria-hidden />
          <span className="text-[15px] font-semibold tracking-tight text-ink">Searching the archive…</span>
          <span className="ml-auto font-mono text-[11px] text-ink-3">usually sub-second</span>
        </div>

        <ol className="flex flex-col p-5" aria-label="Search progress">
          {STEPS.map((step, index) => {
            const state: StepState = index < active ? 'complete' : index === active ? 'active' : 'pending';
            const isLast = index === STEPS.length - 1;
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="relative flex gap-4"
                aria-current={state === 'active' ? 'step' : undefined}
              >
                {/* connector */}
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute left-[11px] top-7 -bottom-1 w-px"
                    style={{
                      backgroundColor:
                        index < active
                          ? 'color-mix(in srgb, var(--ink-3) 55%, transparent)'
                          : 'var(--border)',
                    }}
                  />
                )}

                {/* status node */}
                <span
                  className={cn(
                    'relative z-10 mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-surface ring-4 ring-surface transition-colors duration-300',
                    state === 'complete' && 'border border-status-complete text-status-complete',
                    state === 'active' && 'border border-ring text-ink',
                    state === 'pending' && 'border border-border text-ink-3'
                  )}
                  style={
                    state === 'active'
                      ? { boxShadow: '0 0 0 4px color-mix(in srgb, var(--ring) 20%, transparent)' }
                      : undefined
                  }
                >
                  {state === 'complete' ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : state === 'active' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  )}
                </span>

                {/* label */}
                <div className={cn('flex-1 pb-6', state === 'pending' && 'opacity-55')}>
                  <p
                    className={cn(
                      'text-[14px] tracking-tight transition-colors',
                      state === 'active' ? 'font-semibold text-ink' : state === 'complete' ? 'font-medium text-ink-2' : 'font-medium text-ink-3'
                    )}
                  >
                    {step.title}
                  </p>
                  {index <= active && (
                    <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-ink-3">{step.sub}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
