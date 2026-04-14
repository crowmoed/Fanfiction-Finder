'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Fandom, FicResult } from '@/lib/schema/types';
import { useSearch } from '@/hooks/useSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useAuth } from '@/hooks/useAuth';

import SearchBar from '@/components/SearchBar';
import StatusIndicator from '@/components/StatusIndicator';
import ResultsTable from '@/components/ResultsTable';
import ResultsCard from '@/components/ResultsCard';
import ExportButton from '@/components/ExportButton';
import SearchHistory from '@/components/SearchHistory';
import AuthButton from '@/components/AuthButton';
import AccountBadge from '@/components/AccountBadge';
import SettingsButton from '@/components/SettingsButton';
import RateLimitBanner from '@/components/RateLimitBanner';
import RateLimitBlock from '@/components/RateLimitBlock';

type AppState = 'empty' | 'loading' | 'results';

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>('empty');
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentFandom, setCurrentFandom] = useState<Fandom>('');
  const [showHistory, setShowHistory] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  const { search, results, pipelineStatus, isSearching, isRanked, error } = useSearch();
  const { history, addEntry, clearHistory, getCachedEntry } = useSearchHistory();
  const isMobile = useIsMobile();
  const { user, isLoggedIn, getAuthHeader } = useAuth();

  // Handle Stripe redirect — strip the ?upgrade=success param once rehydration is done.
  // useAuth's mount-effect already refetches /auth/me, so no manual reload is needed;
  // doing one mid-rehydration was racing setUser and leaving the UI signed out.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Track state transitions
  useEffect(() => {
    if (isSearching) {
      setAppState('loading');
    } else if (results.length > 0) {
      setAppState('results');
    }
  }, [isSearching, results.length]);

  const [authPrompt, setAuthPrompt] = useState(false);

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
    async (prompt: string, fandom: Fandom, cachedResults?: FicResult[]) => {
      if (!isLoggedIn) {
        setAuthPrompt(true);
        return;
      }
      setAuthPrompt(false);
      setCurrentQuery(prompt);
      setCurrentFandom(fandom);
      setAppState('loading');

      // Check for cached results if not already provided
      if (!cachedResults) {
        const cached = await getCachedEntry(prompt, fandom);
        cachedResults = cached?.cachedResults;
      }

      await search(prompt, fandom, cachedResults, getAuthHeader());
    },
    [search, getCachedEntry, isLoggedIn, getAuthHeader]
  );

  // Save to history when search completes. Guarded by a ref so a single
  // completed search saves exactly once, even if results or deps change afterward.
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
  }, [isSearching, isRanked, results, currentQuery, currentFandom, addEntry]);

  const handleHistorySearch = useCallback(
    (prompt: string, fandom: string, cached?: FicResult[]) => {
      handleSearch(prompt, fandom as Fandom, cached);
    },
    [handleSearch]
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ─── Sticky Header ──────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 h-14 flex items-center justify-between px-6"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderBottom: `1.5px solid var(--border-ink)`,
        }}
      >
        <button
          onClick={() => setAppState('empty')}
          className="flex items-baseline gap-2 group"
          aria-label="FanFiction Finder home"
        >
          <span
            className="font-serif text-2xl leading-none italic"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
          >
            Fanfic Finder
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
            v0.1
          </span>
          {appState !== 'empty' && (
            <span className="text-xs font-mono ml-2" style={{ color: 'var(--text-tertiary)' }}>
              / {currentFandom}
            </span>
          )}
        </button>

        {/* Header search bar (compact) — shown in loading/results */}
        {appState !== 'empty' && (
          <div className="flex-1 max-w-lg mx-6 hidden sm:block">
            <SearchBar
              onSearch={handleSearch}
              isSearching={isSearching}
              compact
              initialPrompt={currentQuery}
              initialFandom={currentFandom}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          {isLoggedIn && (
            <AccountBadge
              tier={user?.tier === 'paid' ? 'paid' : 'free'}
              searchesUsed={user?.searches_used ?? 0}
              searchesMax={2}
            />
          )}
          <AuthButton />
          {isLoggedIn && <SettingsButton />}

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 rounded-lg transition-colors duration-150"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
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

      {/* ─── Main Content ───────────────────────────────────────────────── */}
      <main>
        {/* ── EMPTY STATE ─────────────────────────────────────────────── */}
        {appState === 'empty' && (
          <div
            className="flex flex-col items-center justify-center px-6"
            style={{ minHeight: 'calc(100vh - 56px)' }}
          >
            {/* Hero logo */}
            <div className="mb-10 text-center">
              <div
                className="inline-block mb-3 px-2 py-0.5 font-mono text-[11px] indie-sticker"
                style={{
                  backgroundColor: 'var(--accent-alt-light)',
                  color: 'var(--text-primary)',
                  border: '1.5px solid var(--text-primary)',
                }}
              >
                made by one person / still rough
              </div>
              <h1
                className="font-serif italic"
                style={{
                  fontSize: 'clamp(48px, 8vw, 82px)',
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  marginBottom: '10px',
                }}
              >
                Fanfic Finder
              </h1>
              <p
                className="text-base max-w-md mx-auto"
                style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}
              >
                Describe the fic you're craving in plain English —
                <em> found family, slow burn, 100k+, no MCD </em>
                — and I'll dig through AO3 and friends to find it.
              </p>
            </div>

            {/* Search bar */}
            <div className="w-full max-w-content">
              <SearchBar
                onSearch={handleSearch}
                isSearching={isSearching}
                initialFandom={currentFandom}
              />

              {/* Auth prompt */}
              {authPrompt && (
                <div
                  className="mt-4 px-4 py-3 rounded-lg text-sm text-center"
                  style={{
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FDE68A',
                  }}
                >
                  Please sign in with Google to search.
                </div>
              )}

              {/* Recent searches */}
              {history.length > 0 && (
                <div className="mt-10">
                  <p className="text-xs font-mono mb-3 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    — recent searches
                  </p>
                  <div className="flex flex-col gap-1">
                    {history.slice(0, 5).map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => handleHistorySearch(entry.prompt, entry.fandom, entry.cachedResults)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors duration-150 w-full"
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                          {entry.prompt}
                        </span>
                        <span className="text-xs shrink-0 ml-auto font-mono" style={{ color: 'var(--text-tertiary)' }}>
                          {entry.fandom}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LOADING + RESULTS STATES ─────────────────────────────────── */}
        {(appState === 'loading' || appState === 'results') && (
          <div>
            {/* Compact search on mobile */}
            <div className="sm:hidden px-4 py-3 border-b sticky top-14 z-30" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
              <SearchBar
                onSearch={handleSearch}
                isSearching={isSearching}
                compact
                initialPrompt={currentQuery}
                initialFandom={currentFandom}
              />
            </div>

            {/* Pipeline status */}
            <div
              className="border-b"
              style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}
            >
              <div className="mx-auto px-6 py-1" style={{ maxWidth: '1200px' }}>
                <StatusIndicator status={pipelineStatus} />
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div
                className="mx-auto px-6 py-3 text-sm rounded-lg mt-4"
                style={{
                  maxWidth: '1200px',
                  backgroundColor: '#FEF2F2',
                  color: '#B91C1C',
                  border: '1px solid #FECACA',
                }}
              >
                <strong>Search error:</strong> {error}
                {error.includes('Backend') && (
                  <span className="ml-1">
                    — showing mock data instead.{' '}
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

            {/* Results area */}
            <div className="mx-auto px-4 sm:px-6 py-6" style={{ maxWidth: '1200px' }}>
              {isLoggedIn && user?.tier === 'free' && (user?.searches_used ?? 0) >= 2 ? (
                <RateLimitBlock onUpgrade={handleUpgrade} />
              ) : (
                <>
                  {isLoggedIn &&
                    user?.tier === 'free' &&
                    (user?.searches_used ?? 0) > 0 &&
                    (user?.searches_used ?? 0) < 2 && (
                      <div className="mb-4">
                        <RateLimitBanner
                          searchesUsed={user?.searches_used ?? 0}
                          searchesMax={2}
                          onUpgrade={handleUpgrade}
                        />
                      </div>
                    )}

              {/* Mobile view toggle */}
              {isMobile && results.length > 0 && (
                <div className="flex justify-end mb-3 gap-2">
                  <button
                    onClick={() => setViewMode('table')}
                    className="px-3 py-1.5 rounded-md text-xs font-mono transition-colors"
                    style={{
                      backgroundColor: viewMode === 'table' ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: viewMode === 'table' ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('card')}
                    className="px-3 py-1.5 rounded-md text-xs font-mono transition-colors"
                    style={{
                      backgroundColor: viewMode === 'card' ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: viewMode === 'card' ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    Cards
                  </button>
                </div>
              )}

              {/* Loading shimmer when no results yet */}
              {isSearching && results.length === 0 && (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 rounded-lg shimmer-bar"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              )}

              {/* Card view (mobile) */}
              {results.length > 0 && (isMobile && viewMode === 'card') && (
                <div className="flex flex-col gap-3">
                  {results.map((fic, i) => (
                    <ResultsCard key={fic.id} fic={fic} rank={i + 1} />
                  ))}
                </div>
              )}

              {/* Table view */}
              {results.length > 0 && (!isMobile || viewMode === 'table') && (
                <ResultsTable
                  results={results}
                  isRanked={isRanked}
                  isMobile={isMobile}
                />
              )}

              {/* Export button */}
              {results.length > 0 && !isSearching && (
                <div className="mt-4">
                  <ExportButton results={results} query={currentQuery} />
                </div>
              )}

              {/* Demo mode button — shown when no results and not loading */}
              {!isSearching && results.length === 0 && !error && (
                <div className="text-center py-12">
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    No results yet. The backend may still be processing.
                  </p>
                  <button
                    onClick={() => {
                      import('@/lib/mock-data').then(({ MOCK_RESULTS }) => {
                        handleSearch(currentQuery, currentFandom, MOCK_RESULTS);
                      });
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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

      {/* ─── Colophon ───────────────────────────────────────────────────── */}
      {appState === 'empty' && (
        <footer
          className="px-6 py-6 font-mono text-[11px] flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span>* built in a college dorm</span>
          <span style={{ color: 'var(--accent)' }}>◆</span>
          <span>indexes ao3 · ffn · wattpad</span>
          <span style={{ color: 'var(--accent)' }}>◆</span>
          <span>not affiliated with any of them</span>
        </footer>
      )}

      {/* ─── Search History Panel ───────────────────────────────────────── */}
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
