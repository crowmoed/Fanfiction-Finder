'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Fandom, FicResult } from '@/lib/schema/types';
import { Button } from '@/components/ui/Button';
import { FilterChips } from '@/components/search/FilterChips';

const EXAMPLES = [
  'enemies to lovers slow burn over 100k words',
  'fix-it fic where nobody dies, complete only',
  'dark academia AU with an unreliable narrator',
  'found family trope, rated T or below',
];

interface PromptSearchBarProps {
  onSearch: (
    prompt: string,
    fandom: Fandom,
    cachedResults?: FicResult[],
    includeTags?: string[],
    excludeTags?: string[],
  ) => void;
  isSearching: boolean;
  compact?: boolean;
  initialPrompt?: string;
  initialFandom?: Fandom;
}

export default function PromptSearchBar({
  onSearch,
  isSearching,
  compact = false,
  initialPrompt = '',
  initialFandom = '',
}: PromptSearchBarProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [fandom, setFandom] = useState<Fandom>(initialFandom);
  const [placeholder, setPlaceholder] = useState(EXAMPLES[0]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setPrompt(initialPrompt), [initialPrompt]);
  useEffect(() => setFandom(initialFandom), [initialFandom]);

  useEffect(() => {
    if (compact) return;
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % EXAMPLES.length;
      setPlaceholder(EXAMPLES[index]);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [compact]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || compact) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 164)}px`;
  }, [compact, prompt]);

  const handleSubmit = useCallback(() => {
    const trimmed = prompt.trim();
    if (!trimmed || isSearching) return;
    onSearch(trimmed, fandom);
  }, [fandom, isSearching, onSearch, prompt]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setPrompt('');
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-border-strong bg-surface px-2 py-1 shadow-soft">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What are you in the mood for…"
          aria-label="Search for fanfiction"
          className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm text-ink outline-none placeholder:text-ink-3"
          disabled={isSearching}
        />
        <FilterChips fandom={fandom} onFandomChange={setFandom} compact />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSearching || !prompt.trim()}
          aria-label="Search"
          className="h-8 w-8 rounded-full p-0"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </Button>
      </div>
    );
  }

  return (
    <div className="stamp rounded-md p-1" role="search" aria-label="Search for fanfiction">
      <div className="flex min-h-[152px] flex-col rounded-[8px] bg-surface px-4 pb-3 pt-4">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Describe the fic you want"
          className="min-h-[72px] w-full flex-1 resize-none bg-transparent px-1 py-1 text-[18px] leading-relaxed text-ink outline-none placeholder:italic placeholder:text-ink-3"
          rows={2}
          disabled={isSearching}
        />
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <FilterChips fandom={fandom} onFandomChange={setFandom} />
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-[11px] text-ink-3 sm:inline">⌘↵ to search</span>
            <Button onClick={handleSubmit} disabled={isSearching || !prompt.trim()}>
              {isSearching ? 'Steeping…' : 'Steep a pot'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
