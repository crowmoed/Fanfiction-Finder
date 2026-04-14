'use client';

import { useState, useCallback, useRef } from 'react';
import type { FicResult, PipelineStatus, PipelineStep, SearchEvent } from '@/lib/schema/types';

const INITIAL_STEPS: PipelineStep[] = [
  { id: 'tag-map', label: 'Tag Mapping', status: 'pending' },
  { id: 'llm-parse', label: 'Parsing Query', status: 'pending' },
  { id: 'ao3-fetch', label: 'Searching AO3', status: 'pending' },
  { id: 'ffn-fetch', label: 'Searching FFN', status: 'pending' },
  { id: 'wattpad-fetch', label: 'Searching Wattpad', status: 'pending' },
  { id: 'ranking', label: 'Ranking', status: 'pending' },
];

function createInitialStatus(): PipelineStatus {
  return { steps: INITIAL_STEPS.map((s) => ({ ...s })) };
}

export function useSearch() {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>(createInitialStatus());
  const [results, setResults] = useState<FicResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRanked, setIsRanked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const updateStep = useCallback((stepId: string, status: PipelineStep['status'], errorMessage?: string) => {
    setPipelineStatus((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === stepId ? { ...s, status, errorMessage } : s
      ),
    }));
  }, []);

  const search = useCallback(async (
    prompt: string,
    fandom: string,
    cachedResults?: FicResult[],
    authHeaders?: Record<string, string>
  ) => {
    // Abort any in-progress search
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setIsRanked(false);
    setError(null);
    setResults([]);
    setPipelineStatus(createInitialStatus());

    // Use cached results instantly if available
    if (cachedResults && cachedResults.length > 0) {
      setResults(cachedResults);
      setIsRanked(true);
      setPipelineStatus({
        steps: INITIAL_STEPS.map((s) => ({ ...s, status: 'complete' })),
        elapsedMs: 0,
        resultCounts: {
          ao3: cachedResults.filter((r) => r.platform === 'ao3').length,
          ffn: cachedResults.filter((r) => r.platform === 'ffn').length,
          wattpad: cachedResults.filter((r) => r.platform === 'wattpad').length,
        },
      });
      setIsSearching(false);
      return;
    }

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ prompt, fandom }),
        signal: controller.signal,
      });

      if (response.status === 401) {
        setError('Please sign in to search.');
        setIsSearching(false);
        return;
      }

      if (response.status === 429) {
        setError('You\u2019ve reached your weekly search limit. Upgrade for more searches.');
        setIsSearching(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Search response has no body');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let event: SearchEvent;
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }

          switch (event.type) {
            case 'status':
              updateStep(event.step, event.status, event.message);
              break;
            case 'results':
              setResults((prev) => [...prev, ...event.results]);
              break;
            case 'ranked':
              setResults(event.results);
              setIsRanked(true);
              setPipelineStatus((prev) => ({
                ...prev,
                resultCounts: {
                  ao3: event.results.filter((r) => r.platform === 'ao3').length,
                  ffn: event.results.filter((r) => r.platform === 'ffn').length,
                  wattpad: event.results.filter((r) => r.platform === 'wattpad').length,
                },
              }));
              break;
            case 'done':
              setIsSearching(false);
              setPipelineStatus((prev) => ({ ...prev, elapsedMs: event.totalMs }));
              break;
            case 'error':
              setError(event.message);
              setIsSearching(false);
              break;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Search failed');
      setIsSearching(false);
    }
  }, [updateStep]);

  return { search, results, pipelineStatus, isSearching, isRanked, error };
}
