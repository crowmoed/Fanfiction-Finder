'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Fandom, FicResult } from '@/lib/schema/types';
import { useSearch } from '@/hooks/useSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useAuth } from '@/hooks/useAuth';

import PromptSearchBar from '@/components/search/PromptSearchBar';
import ResultsTable from '@/components/results/ResultsTable';
import { ResultsBento } from '@/components/results/ResultsBento';
import { ViewToggle, usePersistedResultsView } from '@/components/results/ViewToggle';
import ExportButton from '@/components/ExportButton';
import SearchHistory from '@/components/SearchHistory';
import AuthButton from '@/components/AuthButton';
import AccountBadge from '@/components/AccountBadge';
import SettingsButton from '@/components/SettingsButton';
import RateLimitBanner from '@/components/RateLimitBanner';
import RateLimitBlock from '@/components/RateLimitBlock';
import { HeroTitle } from '@/components/hero/HeroTitle';
import { RotatingCravings } from '@/components/hero/RotatingCravings';
import { StatsTicker } from '@/components/proof/StatsTicker';
import { FandomMarquee } from '@/components/proof/FandomMarquee';
import { ArchitectureBeam } from '@/components/loading/ArchitectureBeam';

type AppState = 'empty' | 'loading' | 'results';

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>('empty');
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentFandom, setCurrentFandom] = useState<Fandom>('');
  const [showHistory, setShowHistory] = useState(false);
  const [authPrompt, setAuthPrompt] = useState(false);
  const [resultsView, setResultsView] = usePersistedResultsView();

  const { search, results, isSearching, isRanked, error } = useSearch();
  const { history, addEntry, clearHistory, getCachedEntry } = useSearchHistory();
  const isMobile = useIsMobile();
  const { user, isLoggedIn, getAuthHeader } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
    }
    const query = params.get('q');
    if (query) setCurrentQuery(query);
  }, []);

  useEffect(() => {
    if (isSearching) setAppState('loading');
    else if (results.length > 0) setAppState('results');
  }, [isSearching, results.length]);

  const handleUpgrade = async () => {
    try {
      const res = await fetch('/api/auth/checkout', {
        method: 'POST',
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error('Checkout failed');
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Upgrade error:', err);
    }
  };

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

      await search(prompt, nextFandom, cachedResults, getAuthHeader(), includeTags, excludeTags);
    },
    [getAuthHeader, getCachedEntry, isLoggedIn, search]
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
    addEntry({
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
  }, [addEntry, currentFandom, currentQuery, isRanked, isSearching, results]);

  const handleHistorySearch = useCallback(
    (prompt: string, fandom: string, cached?: FicResult[]) => {
      handleSearch(prompt, fandom as Fandom, cached);
    },
    [handleSearch]
  );

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
        <button
          onClick={() => setAppState('empty')}
          className="flex items-baseline gap-2"
          aria-label="FanFiction Finder home"
        >
          <span className="font-display text-2xl italic leading-none" style={{ color: 'var(--text-primary)' }}>
            Fanfic Finder
          </span>
          <span className="font-mono text-[10px]" style={{ color: 'var(--text-tertiary)' }}>v0.1</span>
          {appState !== 'empty' && (
            <span className="ml-2 hidden font-mono text-xs sm:inline" style={{ color: 'var(--text-tertiary)' }}>
              / {currentFandom}
            </span>
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

        <div className="flex items-center gap-3">
          <Link href="/blog" className="hidden font-mono text-xs sm:inline" style={{ color: 'var(--text-secondary)' }}>
            /blog
          </Link>
          {isLoggedIn && (
            <AccountBadge
              tier={user?.tier === 'paid' ? 'paid' : 'free'}
              searchesUsed={user?.searches_used ?? 0}
              searchesMax={2}
              onUpgrade={handleUpgrade}
            />
          )}
          <AuthButton />
          {isLoggedIn && <SettingsButton />}
          <button
            onClick={() => setShowHistory(true)}
            className="rounded-lg p-2"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Search history"
            title="Search history"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <main>
        {appState === 'empty' && (
          <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center px-6 py-14">
            <section className="mb-8 text-center">
              <div
                className="indie-sticker mb-4 inline-block px-2 py-0.5 font-mono text-[11px]"
                style={{
                  backgroundColor: 'var(--accent-alt-light)',
                  color: 'var(--text-primary)',
                  border: '1.5px solid var(--text-primary)',
                }}
              >
                made by one person / still rough
              </div>
              <HeroTitle />
              <div className="mt-4">
                <RotatingCravings />
              </div>
            </section>

            <section className="w-full max-w-content">
              <PromptSearchBar
                onSearch={handleSearch}
                isSearching={isSearching}
                initialPrompt={currentQuery}
                initialFandom={currentFandom}
              />

              {authPrompt && (
                <div className="mt-4 rounded-lg px-4 py-3 text-center text-sm" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                  Please sign in with Google to search.
                </div>
              )}

              <div className="mt-8">
                <StatsTicker />
              </div>
              <FandomMarquee />

              {history.length > 0 && (
                <div className="mt-8">
                  <p className="mb-3 font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    - recent searches
                  </p>
                  <div className="flex flex-col gap-1">
                    {history.slice(0, 5).map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => handleHistorySearch(entry.prompt, entry.fandom, entry.cachedResults)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <span className="truncate text-sm">{entry.prompt}</span>
                        <span className="ml-auto shrink-0 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{entry.fandom}</span>
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
            <div className="sticky top-14 z-30 border-b px-4 py-3 sm:hidden" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
              <PromptSearchBar
                onSearch={handleSearch}
                isSearching={isSearching}
                compact
                initialPrompt={currentQuery}
                initialFandom={currentFandom}
              />
            </div>

            {error && (
              <div className="mx-auto mt-4 rounded-lg px-6 py-3 text-sm" style={{ maxWidth: '1200px', backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                <strong>Search error:</strong> {error}
                {error.includes('Backend') && (
                  <span className="ml-1">
                    - showing mock data instead.{' '}
                    <button
                      className="underline"
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

            <div className="mx-auto px-4 py-6 sm:px-6" style={{ maxWidth: '1200px' }}>
              {isLoggedIn && user?.tier === 'free' && (user?.searches_used ?? 0) >= 2 ? (
                <RateLimitBlock onUpgrade={handleUpgrade} />
              ) : (
                <>
                  {isLoggedIn && user?.tier === 'free' && (user?.searches_used ?? 0) > 0 && (user?.searches_used ?? 0) < 2 && (
                    <div className="mb-4">
                      <RateLimitBanner searchesUsed={user?.searches_used ?? 0} searchesMax={2} onUpgrade={handleUpgrade} />
                    </div>
                  )}

                  {results.length > 0 && (
                    <>
                      <div className="sticky top-16 z-20 mb-4 flex justify-end">
                        <ViewToggle value={resultsView} onChange={setResultsView} />
                      </div>

                      {resultsView === 'bento' ? (
                        <ResultsBento results={results} />
                      ) : (
                        <ResultsTable results={results} isRanked={isRanked} isMobile={isMobile} />
                      )}

                      {!isSearching && (
                        <div className="mt-4">
                          <ExportButton results={results} query={currentQuery} />
                        </div>
                      )}
                    </>
                  )}

                  {!isSearching && results.length === 0 && !error && (
                    <div className="py-12 text-center">
                      <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        No results yet. The backend may still be processing.
                      </p>
                      <button
                        onClick={() => {
                          import('@/lib/mock-data').then(({ MOCK_RESULTS }) => {
                            handleSearch(currentQuery, currentFandom, MOCK_RESULTS);
                          });
                        }}
                        className="rounded-lg px-4 py-2 text-sm font-medium"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      >
                        Load demo results
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {appState === 'empty' && (
        <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 py-6 font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          <span>built in a college dorm</span>
          <span style={{ color: 'var(--accent)' }}>◆</span>
          <span>semantic search via gemini + claude</span>
          <span style={{ color: 'var(--accent)' }}>◆</span>
          <span>free during beta</span>
          <span style={{ color: 'var(--accent)' }}>◆</span>
          <span>not affiliated with ao3/ffn/wattpad</span>
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
