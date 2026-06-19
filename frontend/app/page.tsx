'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Fandom, FicResult } from '@/lib/schema/types';
import { useSearch } from '@/hooks/useSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useAuth } from '@/hooks/useAuth';

import PromptSearchBar from '@/components/search/PromptSearchBar';
import { ResultsView } from '@/components/results/ResultsView';
import ExportButton from '@/components/ExportButton';
import SearchHistory from '@/components/SearchHistory';
import AuthButton from '@/components/AuthButton';
import SettingsButton from '@/components/SettingsButton';
import ThemeToggle from '@/components/ThemeToggle';
import { HeroTitle } from '@/components/hero/HeroTitle';
import { RotatingCravings } from '@/components/hero/RotatingCravings';
import { StatsTicker } from '@/components/proof/StatsTicker';
import { FandomMarquee } from '@/components/proof/FandomMarquee';
import { ArchitectureBeam } from '@/components/loading/ArchitectureBeam';
import { HangingCupSign } from '@/components/ambient/TeahouseDecor';

type AppState = 'empty' | 'loading' | 'results';

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>('empty');
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentFandom, setCurrentFandom] = useState<Fandom>('');
  const [showHistory, setShowHistory] = useState(false);
  const [authPrompt, setAuthPrompt] = useState(false);

  const { search, results, isSearching, isRanked, error, reset } = useSearch();
  const { history, addEntry, clearHistory, getCachedEntry, getByShareId } = useSearchHistory();
  const { isLoggedIn, getAuthHeader, logout } = useAuth();

  const sharedRestoredRef = useRef(false);
  const skipUrlPushRef = useRef(false);

  const handleGoHome = useCallback(() => {
    reset();
    setCurrentQuery('');
    setCurrentFandom('');
    setAppState('empty');
    sharedRestoredRef.current = true;
    if (window.location.search) {
      window.history.pushState({}, '', '/');
    }
  }, [reset]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
    }
    const query = params.get('q');
    if (query) setCurrentQuery(query);
  }, []);

  const restoreFromUrl = useCallback(async () => {
    const shareId = new URLSearchParams(window.location.search).get('r');
    if (!shareId) {
      reset();
      setCurrentQuery('');
      setCurrentFandom('');
      setAppState('empty');
      return;
    }
    const entry = await getByShareId(shareId);
    if (entry && entry.cachedResults && entry.cachedResults.length > 0) {
      skipUrlPushRef.current = true;
      handleSearch(entry.prompt, entry.fandom as Fandom, entry.cachedResults);
    } else {
      window.history.replaceState({}, '', '/');
      setAppState('empty');
    }
    // handleSearch intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getByShareId, reset]);

  useEffect(() => {
    if (sharedRestoredRef.current) return;
    if (!isLoggedIn) return;
    sharedRestoredRef.current = true;
    restoreFromUrl();
  }, [isLoggedIn, restoreFromUrl]);

  useEffect(() => {
    const onPop = () => { restoreFromUrl(); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [restoreFromUrl]);

  useEffect(() => {
    if (isSearching) setAppState('loading');
    else if (results.length > 0) setAppState('results');
  }, [isSearching, results.length]);

  const skipNextSaveRef = useRef(false);

  const handleSearch = useCallback(
    async (
      prompt: string,
      fandom: Fandom,
      cachedResults?: FicResult[],
      includeTags: string[] = [],
      excludeTags: string[] = [],
    ) => {
      if (!isLoggedIn) {
        setAuthPrompt(true);
        return;
      }
      setAuthPrompt(false);
      const nextFandom = fandom || 'All Fandoms';
      setCurrentQuery(prompt);
      setCurrentFandom(nextFandom);
      setAppState('loading');

      if (!cachedResults) {
        const cached = await getCachedEntry(prompt, nextFandom);
        cachedResults = cached?.cachedResults;
      }

      skipNextSaveRef.current = !!(cachedResults && cachedResults.length > 0);

      await search(prompt, nextFandom, cachedResults, getAuthHeader(), includeTags, excludeTags, logout);
    },
    [getAuthHeader, getCachedEntry, isLoggedIn, search, logout]
  );

  const savedForQueryRef = useRef<string | null>(null);
  useEffect(() => {
    if (isSearching) {
      savedForQueryRef.current = null;
      return;
    }
    if (!isRanked || results.length === 0 || !currentQuery) return;
    const key = `${currentQuery}|${currentFandom}`;
    if (savedForQueryRef.current === key) return;
    savedForQueryRef.current = key;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    const shareId = Math.random().toString(36).slice(2, 8);
    addEntry({
      shareId,
      prompt: currentQuery,
      fandom: currentFandom,
      parsedFilters: {},
      resultCount: results.length,
      ao3Count: results.filter((r) => r.platform === 'ao3').length,
      ffnCount: results.filter((r) => r.platform === 'ffn').length,
      wattpadCount: results.filter((r) => r.platform === 'wattpad').length,
      timestamp: new Date(),
      cachedResults: results,
    });
    if (skipUrlPushRef.current) {
      skipUrlPushRef.current = false;
    } else {
      window.history.pushState({}, '', `/?r=${shareId}`);
    }
  }, [addEntry, currentFandom, currentQuery, isRanked, isSearching, results]);

  const handleHistorySearch = useCallback(
    (prompt: string, fandom: string, cached?: FicResult[], shareId?: string) => {
      if (shareId) window.history.pushState({}, '', `/?r=${shareId}`);
      handleSearch(prompt, fandom as Fandom, cached);
    },
    [handleSearch]
  );

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border-strong bg-surface/90 px-4 backdrop-blur-md sm:px-6">
        <button onClick={handleGoHome} className="flex items-baseline gap-2" aria-label="Semantic Archive home">
          <span className="font-serif text-xl font-semibold leading-none text-ink">Semantic Archive</span>
          <HangingCupSign />
          {appState !== 'empty' && currentFandom && (
            <span className="ml-1 hidden font-mono text-xs text-ink-3 sm:inline">/ {currentFandom}</span>
          )}
        </button>

        {appState !== 'empty' && (
          <div className="mx-6 hidden max-w-lg flex-1 sm:block">
            <PromptSearchBar
              onSearch={handleSearch}
              isSearching={isSearching}
              compact
              initialPrompt={currentQuery}
              initialFandom={currentFandom}
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link href="/blog" className="hidden font-mono text-xs text-ink-2 transition-colors hover:text-ink sm:inline">
            /blog
          </Link>
          <ThemeToggle />
          <AuthButton />
          {isLoggedIn && <SettingsButton />}
          <button
            onClick={() => setShowHistory(true)}
            className="rounded-md p-2 text-ink-2 transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-ink"
            aria-label="Search history"
            title="Search history"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1">
        {appState === 'empty' && (
          <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-6 py-14">
            <section className="mb-8 animate-fade-up text-center">
              <span className="mb-4 inline-block rounded-full border border-border bg-accent-soft px-3 py-1 font-mono text-[11px] text-accent-text">
                brewed by one person · still steeping
              </span>
              <HeroTitle />
              <div className="mt-4">
                <RotatingCravings />
              </div>
            </section>

            <section className="relative w-full max-w-content animate-fade-up" style={{ animationDelay: '60ms' }}>
              <PromptSearchBar
                onSearch={handleSearch}
                isSearching={isSearching}
                initialPrompt={currentQuery}
                initialFandom={currentFandom}
              />

              {authPrompt && (
                <div className="mt-4 rounded-md border border-accent bg-accent-soft px-4 py-3 text-center text-sm text-accent-text">
                  Sign in with Google (top right) to run a search. It is free during the beta.
                </div>
              )}

              <div className="mt-8">
                <StatsTicker />
              </div>
              <FandomMarquee />

              {history.length > 0 && (
                <div className="mx-auto mt-10 max-w-md rounded-md border border-border bg-surface p-5 shadow-soft">
                  <p className="mb-3 font-serif text-lg text-ink">Your recent searches</p>
                  <div className="flex flex-col">
                    {history.slice(0, 5).map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => handleHistorySearch(entry.prompt, entry.fandom, entry.cachedResults, entry.shareId)}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors duration-150 ease-out hover:bg-surface-2"
                      >
                        <span className="truncate text-sm text-ink-2">{entry.prompt}</span>
                        <span className="ml-auto shrink-0 font-mono text-xs text-ink-3">{entry.fandom}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {(appState === 'loading' || appState === 'results') && (
          <div>
            <div className="sticky top-14 z-30 border-b border-border bg-surface px-4 py-3 sm:hidden">
              <PromptSearchBar
                onSearch={handleSearch}
                isSearching={isSearching}
                compact
                initialPrompt={currentQuery}
                initialFandom={currentFandom}
              />
            </div>

            {error && (
              <div className="mx-auto mt-4 max-w-results rounded-md border border-danger-border bg-danger-bg px-6 py-3 text-sm text-danger">
                <strong className="font-semibold">Search error:</strong> {error}
                {error.includes('Backend') && (
                  <span className="ml-1">
                    Showing mock data instead.{' '}
                    <button
                      className="underline underline-offset-2"
                      onClick={() => {
                        import('@/lib/mock-data').then(({ MOCK_RESULTS }) => {
                          handleSearch(currentQuery, currentFandom, MOCK_RESULTS);
                        });
                      }}
                    >
                      Load demo results
                    </button>
                  </span>
                )}
              </div>
            )}

            {isSearching && results.length === 0 && <ArchitectureBeam />}

            <div className="mx-auto max-w-results px-4 py-6 sm:px-6">
              {results.length > 0 && (
                <>
                  <ResultsView results={results} isRanked={isRanked} />

                  {!isSearching && (
                    <div className="mt-4">
                      <ExportButton results={results} query={currentQuery} />
                    </div>
                  )}
                </>
              )}

              {!isSearching && results.length === 0 && !error && (
                <div className="py-12 text-center">
                  <p className="mb-3 text-sm text-ink-2">
                    Nothing brewed yet. The kettle may still be warming up.
                  </p>
                  <button
                    onClick={() => {
                      import('@/lib/mock-data').then(({ MOCK_RESULTS }) => {
                        handleSearch(currentQuery, currentFandom, MOCK_RESULTS);
                      });
                    }}
                    className="rounded-md bg-surface-2 px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 ease-out hover:bg-border"
                  >
                    Load demo results
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {appState === 'empty' && (
        <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 py-6 font-mono text-[11px] text-ink-3">
          <span>built in a college dorm</span>
          <span aria-hidden className="text-accent-text">◆</span>
          <span>semantic search via Gemini + Claude</span>
          <span aria-hidden className="text-accent-text">◆</span>
          <span>free during beta</span>
          <span aria-hidden className="text-accent-text">◆</span>
          <span>not affiliated with AO3/FFN/Wattpad</span>
        </footer>
      )}

      {showHistory && (
        <SearchHistory
          history={history}
          onSearch={handleHistorySearch}
          onClear={clearHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}

