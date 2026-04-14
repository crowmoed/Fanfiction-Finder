'use client';

import { useEffect, useState } from 'react';
import type { PipelineStatus } from '@/lib/schema/types';
import { formatElapsed } from '@/lib/utils/format';

interface StatusIndicatorProps {
  status: PipelineStatus;
}

export default function StatusIndicator({ status }: StatusIndicatorProps) {
  const [collapsed, setCollapsed] = useState(false);
  const allDone = status.steps.every((s) => s.status === 'complete' || s.status === 'skipped' || s.status === 'error');
  const hasError = status.steps.some((s) => s.status === 'error');

  useEffect(() => {
    if (allDone) {
      const timer = setTimeout(() => setCollapsed(true), 300);
      return () => clearTimeout(timer);
    } else {
      setCollapsed(false);
    }
  }, [allDone]);

  if (collapsed && allDone) {
    const ao3 = status.resultCounts?.ao3 ?? 0;
    const ffn = status.resultCounts?.ffn ?? 0;
    const wattpad = status.resultCounts?.wattpad ?? 0;
    const total = ao3 + ffn + wattpad;
    const elapsed = status.elapsedMs ? formatElapsed(status.elapsedMs) : '';

    const parts = [
      ao3 > 0 && `AO3 (${ao3})`,
      ffn > 0 && `FFN (${ffn})`,
      wattpad > 0 && `Wattpad (${wattpad})`,
    ].filter(Boolean).join(', ');

    return (
      <div
        className="text-sm text-center py-2 font-mono"
        style={{ color: 'var(--text-secondary)' }}
      >
        {total > 0
          ? `${total} results from ${parts}${elapsed ? ` · ${elapsed}` : ''} · ranked`
          : 'no results yet'}
        {hasError && (
          <span className="ml-2" style={{ color: 'var(--accent)' }}>· some sources unreachable</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-0 h-12 px-6 overflow-x-auto" aria-live="polite">
      {status.steps.map((step, i) => {
        const isLast = i === status.steps.length - 1;

        return (
          <div key={step.id} className="flex items-center shrink-0">
            {/* Step */}
            <div className="flex flex-col items-center gap-1">
              <StepCircle status={step.status} />
              <span
                className="text-xs font-mono whitespace-nowrap transition-all duration-150"
                style={{
                  color: step.status === 'active'
                    ? 'var(--text-primary)'
                    : step.status === 'complete'
                    ? 'var(--text-secondary)'
                    : 'var(--text-tertiary)',
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {!isLast && (
              <div
                className="w-8 sm:w-12 h-px mx-1 mb-4"
                style={{
                  backgroundColor:
                    step.status === 'complete' || step.status === 'active'
                      ? 'var(--accent)'
                      : 'var(--border-default)',
                  borderStyle: step.status === 'pending' ? 'dashed' : 'solid',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepCircle({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <div
        className="w-3 h-3 rounded-full animate-pulse"
        style={{ backgroundColor: 'var(--accent)' }}
      />
    );
  }

  if (status === 'complete') {
    return (
      <div
        className="w-3 h-3 rounded-full flex items-center justify-center animate-scale-in"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
          <path
            d="M1 3.5L2.8 5.5L6 1.5"
            stroke="white"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-3 h-3 rounded-full flex items-center justify-center bg-red-500">
        <span className="text-white text-xs leading-none">✕</span>
      </div>
    );
  }

  if (status === 'skipped') {
    return (
      <div
        className="w-3 h-3 rounded-full border-2 flex items-center justify-center"
        style={{ borderColor: 'var(--text-tertiary)' }}
      >
        <div className="w-1 h-px" style={{ backgroundColor: 'var(--text-tertiary)' }} />
      </div>
    );
  }

  // pending
  return (
    <div
      className="w-3 h-3 rounded-full border-2"
      style={{ borderColor: 'var(--border-default)' }}
    />
  );
}
