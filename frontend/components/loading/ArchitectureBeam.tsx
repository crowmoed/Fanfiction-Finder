'use client';

import { useEffect, useState } from 'react';
import { AnimatedBeam } from '@/components/ui/animated-beam';

const STEPS = [
  { mark: '“', label: 'Your query', sub: 'Query' },
  { mark: 'C', label: 'Expanding (HyDE)', sub: 'Claude' },
  { mark: 'G', label: 'Embedding', sub: 'Gemini' },
  { mark: 'pg', label: 'Vector search · 341k fics', sub: 'Postgres' },
  { mark: 'C', label: 'Re-ranking top 50', sub: 'Claude' },
];

export function ArchitectureBeam() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const timer = window.setInterval(() => {
      setActive((current) => (current >= STEPS.length - 1 ? 3 + ((current + 1) % 2) : current + 1));
    }, 700);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 py-16">
      <div className="hidden w-full items-center justify-center gap-3 sm:flex">
        {STEPS.map((step, index) => (
          <div key={step.label} className="flex flex-1 items-center gap-3">
            <PipelineNode step={step} active={index === active} complete={index < active} />
            {index < STEPS.length - 1 && <AnimatedBeam />}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 sm:hidden">
        {STEPS.map((step, index) => (
          <div key={step.label} className="flex flex-col items-center gap-3">
            <PipelineNode step={step} active={index === active} complete={index < active} />
            {index < STEPS.length - 1 && <AnimatedBeam vertical />}
          </div>
        ))}
      </div>

      <div
        className="min-h-12 rounded-lg border px-4 py-3 text-center font-mono text-sm"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
        aria-live="polite"
      >
        {STEPS[active]?.label}
      </div>
    </div>
  );
}

function PipelineNode({
  step,
  active,
  complete,
}: {
  step: { mark: string; label: string; sub: string };
  active: boolean;
  complete: boolean;
}) {
  return (
    <div className="flex min-w-[92px] flex-col items-center gap-2 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full border font-mono text-sm font-semibold"
        style={{
          backgroundColor: active || complete ? 'var(--accent-alt-light)' : 'var(--bg-elevated)',
          borderColor: 'var(--text-primary)',
          color: 'var(--text-primary)',
          boxShadow: active ? '0 0 22px rgba(217,119,87,0.5), var(--shadow-sm)' : 'var(--shadow-sm)',
        }}
      >
        {step.mark}
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
          {step.sub}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {step.label}
        </div>
      </div>
    </div>
  );
}
