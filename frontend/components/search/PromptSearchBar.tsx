'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Fandom, FicResult } from '@/lib/schema/types';
import { ShineBorder } from '@/components/ui/shine-border';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { FilterChips } from '@/components/search/FilterChips';

const EXAMPLES = [
  'enemies to lovers slow burn over 100k words',
  'fix-it fic where nobody dies, complete only',
  'dark academia AU with unreliable narrator',
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
      <div
        className="flex items-center gap-2 rounded-full border px-2 py-1"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }}
      >
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search fanfiction..."
          className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm outline-none"
          style={{ color: 'var(--text-primary)' }}
          disabled={isSearching}
        />
        <FilterChips fandom={fandom} onFandomChange={setFandom} compact />
        <InteractiveHoverButton iconOnly onClick={handleSubmit} disabled={isSearching || !prompt.trim()}>
          Search
        </InteractiveHoverButton>
      </div>
    );
  }

  return (
    <ShineBorder
      borderRadius={18}
      borderWidth={1.5}
      duration={14}
      color={['var(--shine-1)', 'var(--shine-2)', 'var(--shine-3)']}
      className="shadow-md"
    >
      <div
        className="flex min-h-[160px] flex-col rounded-2xl px-5 py-4"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
        role="search"
        aria-label="Search for fanfiction"
      >
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[72px] w-full flex-1 resize-none bg-transparent px-1 py-1 text-[18px] leading-relaxed outline-none placeholder:italic"
          style={{ color: 'var(--text-primary)' }}
          rows={2}
          disabled={isSearching}
        />
        <div
          className="mt-3 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <FilterChips fandom={fandom} onFandomChange={setFandom} />
          <InteractiveHoverButton onClick={handleSubmit} disabled={isSearching || !prompt.trim()}>
            {isSearching ? 'Searching' : 'Search'}
          </InteractiveHoverButton>
        </div>
      </div>
    </ShineBorder>
  );
}
