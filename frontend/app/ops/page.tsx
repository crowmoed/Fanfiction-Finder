'use client';

import { useEffect, useState, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FandomStat {
  fandom: string;
  ao3_count: number;
  ffn_count: number;
  total: number;
  last_indexed: string | null;
  avg_word_count: number | null;
  total_kudos: number;
}

interface AdminStats {
  total_fics: number;
  fandoms: FandomStat[];
  supported_fandoms: string[];
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): { label: string; urgent: boolean; warn: boolean } {
  if (!iso) return { label: 'Never indexed', urgent: true, warn: false };
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return { label: 'Today', urgent: false, warn: false };
  if (days === 1) return { label: '1 day ago', urgent: false, warn: false };
  if (days < 14) return { label: `${days} days ago`, urgent: false, warn: false };
  if (days < 45) return { label: `${days} days ago`, urgent: false, warn: true };
  return { label: `${days} days ago`, urgent: true, warn: false };
}

function getStatus(stat: FandomStat): { label: string; color: string } {
  if (stat.total === 0) return { label: 'Empty', color: 'text-red-400' };
  if (stat.total < 50) return { label: 'Sparse', color: 'text-orange-400' };
  const age = stat.last_indexed ? (Date.now() - new Date(stat.last_indexed).getTime()) / 86_400_000 : Infinity;
  if (age > 60) return { label: 'Stale', color: 'text-yellow-400' };
  if (stat.ao3_count === 0 || stat.ffn_count === 0) return { label: 'Partial', color: 'text-blue-400' };
  return { label: 'Good', color: 'text-green-400' };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function prioritySort(stats: FandomStat[], supported: string[]): FandomStat[] {
  // Merge in supported fandoms that have no DB rows yet
  const seen = new Set(stats.map((s) => s.fandom));
  const all = [
    ...stats,
    ...supported
      .filter((f) => !seen.has(f))
      .map(
        (f): FandomStat => ({
          fandom: f,
          ao3_count: 0,
          ffn_count: 0,
          total: 0,
          last_indexed: null,
          avg_word_count: null,
          total_kudos: 0,
        })
      ),
  ];

  const score = (s: FandomStat) => {
    if (s.total === 0) return 0;
    if (s.total < 50) return 1;
    const age = s.last_indexed ? (Date.now() - new Date(s.last_indexed).getTime()) / 86_400_000 : Infinity;
    if (age > 60) return 2;
    if (s.ao3_count === 0 || s.ffn_count === 0) return 3;
    return 4;
  };

  return all.sort((a, b) => score(a) - score(b));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OpsPage() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [sortCol, setSortCol] = useState<'fandom' | 'total' | 'ao3' | 'ffn' | 'last_indexed' | 'avg_words'>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      setData(json);
      setLastFetched(new Date());
    } catch {
      setData({ error: 'Failed to reach backend', total_fics: 0, fandoms: [], supported_fandoms: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-zinc-400 flex items-center justify-center font-mono text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-zinc-500 rounded-full animate-pulse" />
          Connecting to database...
        </div>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-red-400 flex items-center justify-center font-mono text-sm">
        <div>
          <div className="text-red-500 font-semibold mb-1">Backend unreachable</div>
          <div className="text-zinc-500">{data.error}</div>
          <button onClick={fetchStats} className="mt-4 text-zinc-400 hover:text-white underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const all = prioritySort(data?.fandoms ?? [], data?.supported_fandoms ?? []);

  const sorted = [...all].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortCol === 'fandom') return a.fandom.localeCompare(b.fandom) * dir;
    if (sortCol === 'total') return (a.total - b.total) * dir;
    if (sortCol === 'ao3') return (a.ao3_count - b.ao3_count) * dir;
    if (sortCol === 'ffn') return (a.ffn_count - b.ffn_count) * dir;
    if (sortCol === 'avg_words') return ((a.avg_word_count ?? 0) - (b.avg_word_count ?? 0)) * dir;
    if (sortCol === 'last_indexed') {
      const ta = a.last_indexed ? new Date(a.last_indexed).getTime() : 0;
      const tb = b.last_indexed ? new Date(b.last_indexed).getTime() : 0;
      return (ta - tb) * dir;
    }
    return 0;
  });

  const totalFics = data?.total_fics ?? 0;
  const indexedCount = all.filter((s) => s.total > 0).length;
  const emptyCount = all.filter((s) => s.total === 0).length;
  const needsAttention = all.filter((s) => getStatus(s).label !== 'Good').length;
  const totalSupported = data?.supported_fandoms?.length ?? 0;

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: typeof sortCol }) => {
    if (sortCol !== col) return <span className="opacity-20">↕</span>;
    return <span>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const Th = ({ col, children }: { col: typeof sortCol; children: React.ReactNode }) => (
    <th
      onClick={() => toggleSort(col)}
      className="px-3 py-2 text-left text-xs text-zinc-500 font-medium uppercase tracking-wider cursor-pointer select-none hover:text-zinc-300 whitespace-nowrap"
    >
      {children} <SortIcon col={col} />
    </th>
  );

  // Recommendations
  const recs: { fandom: string; action: string; reason: string }[] = [];
  all.forEach((s) => {
    const status = getStatus(s);
    if (status.label === 'Empty') recs.push({ fandom: s.fandom, action: 'python indexer.py', reason: 'No fics indexed yet' });
    else if (status.label === 'Sparse') recs.push({ fandom: s.fandom, action: 'python indexer.py', reason: `Only ${s.total} fics — needs more scraping` });
    else if (status.label === 'Stale') {
      const days = s.last_indexed ? Math.floor((Date.now() - new Date(s.last_indexed).getTime()) / 86_400_000) : 0;
      recs.push({ fandom: s.fandom, action: 'python indexer.py', reason: `Last indexed ${days} days ago — refresh recommended` });
    } else if (status.label === 'Partial') {
      const missing = s.ao3_count === 0 ? 'AO3' : 'FFN';
      recs.push({ fandom: s.fandom, action: 'python indexer.py', reason: `Missing ${missing} data` });
    }
  });

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-200 font-mono text-sm">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-zinc-500 text-xs">ficfinder /</span>{' '}
          <span className="text-zinc-200 font-semibold">ops dashboard</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-600">
          {lastFetched && <span>fetched {lastFetched.toLocaleTimeString()}</span>}
          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-3 py-1 border border-zinc-700 rounded text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition disabled:opacity-40"
          >
            {loading ? 'refreshing...' : '↺ refresh'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card label="Total Fics" value={fmt(totalFics)} sub="in database" />
          <Card label="Indexed" value={`${indexedCount}/${totalSupported}`} sub="fandoms with data" />
          <Card label="Empty" value={String(emptyCount)} sub="need initial index" alert={emptyCount > 0} />
          <Card label="Need Attention" value={String(needsAttention)} sub="empty / sparse / stale" alert={needsAttention > 0} />
          <Card
            label="Coverage"
            value={totalSupported > 0 ? `${Math.round((indexedCount / totalSupported) * 100)}%` : '—'}
            sub="fandoms indexed"
          />
        </div>

        {/* Recommendations */}
        {recs.length > 0 && (
          <section>
            <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">What to do next</h2>
            <div className="space-y-2">
              {recs.map((r, i) => (
                <div key={i} className="flex items-start gap-3 bg-zinc-900/60 border border-zinc-800 rounded px-4 py-3">
                  <span className="text-yellow-500 mt-0.5">!</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-zinc-200 font-semibold">{r.fandom}</span>
                    <span className="text-zinc-500 mx-2">—</span>
                    <span className="text-zinc-400">{r.reason}</span>
                  </div>
                  <code className="text-zinc-600 text-xs whitespace-nowrap shrink-0">
                    {r.action} &quot;{r.fandom}&quot;
                  </code>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Fandom Table */}
        <section>
          <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Fandom Index State</h2>
          <div className="overflow-x-auto rounded border border-zinc-800">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-900/80">
                <tr>
                  <Th col="fandom">Fandom</Th>
                  <th className="px-3 py-2 text-left text-xs text-zinc-500 font-medium uppercase tracking-wider whitespace-nowrap">Status</th>
                  <Th col="ao3">AO3</Th>
                  <Th col="ffn">FFN</Th>
                  <Th col="total">Total</Th>
                  <Th col="avg_words">Avg Words</Th>
                  <Th col="last_indexed">Last Indexed</Th>
                  <th className="px-3 py-2 text-left text-xs text-zinc-500 font-medium uppercase tracking-wider">Index Command</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => {
                  const { label: statusLabel, color: statusColor } = getStatus(s);
                  const age = timeAgo(s.last_indexed);
                  const isEven = i % 2 === 0;
                  return (
                    <tr
                      key={s.fandom}
                      className={`border-t border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${isEven ? 'bg-transparent' : 'bg-zinc-900/20'}`}
                    >
                      <td className="px-3 py-2.5 text-zinc-200 font-medium whitespace-nowrap">{s.fandom}</td>
                      <td className={`px-3 py-2.5 font-semibold ${statusColor} whitespace-nowrap`}>{statusLabel}</td>
                      <td className="px-3 py-2.5 text-zinc-300 tabular-nums">
                        {s.ao3_count > 0 ? fmt(s.ao3_count) : <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-300 tabular-nums">
                        {s.ffn_count > 0 ? fmt(s.ffn_count) : <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-200 font-semibold tabular-nums">
                        {s.total > 0 ? fmt(s.total) : <span className="text-zinc-600">0</span>}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400 tabular-nums">
                        {s.avg_word_count ? fmt(s.avg_word_count) : <span className="text-zinc-600">—</span>}
                      </td>
                      <td className={`px-3 py-2.5 whitespace-nowrap ${age.urgent ? 'text-red-400' : age.warn ? 'text-yellow-400' : 'text-zinc-400'}`}>
                        {age.label}
                      </td>
                      <td className="px-3 py-2.5">
                        <code className="text-zinc-600 text-xs">
                          python indexer.py &quot;{s.fandom}&quot;
                        </code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-600 mt-2">
            Sorted by urgency by default. Click column headers to re-sort.
          </p>
        </section>

        {/* Platform breakdown bar chart (visual) */}
        <section>
          <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Coverage Breakdown</h2>
          <div className="space-y-1.5">
            {sorted
              .filter((s) => s.total > 0)
              .sort((a, b) => b.total - a.total)
              .map((s) => {
                const maxTotal = Math.max(...all.map((x) => x.total), 1);
                const barW = Math.round((s.total / maxTotal) * 100);
                const ao3W = s.total > 0 ? Math.round((s.ao3_count / s.total) * barW) : 0;
                const ffnW = barW - ao3W;
                return (
                  <div key={s.fandom} className="flex items-center gap-3">
                    <div className="w-36 text-right text-zinc-400 text-xs truncate shrink-0">{s.fandom}</div>
                    <div className="flex-1 h-4 bg-zinc-900 rounded overflow-hidden flex">
                      <div
                        className="h-full bg-blue-700/80 rounded-l transition-all"
                        style={{ width: `${ao3W}%` }}
                        title={`AO3: ${s.ao3_count}`}
                      />
                      <div
                        className="h-full bg-purple-700/80 rounded-r transition-all"
                        style={{ width: `${ffnW}%` }}
                        title={`FFN: ${s.ffn_count}`}
                      />
                    </div>
                    <div className="text-zinc-500 text-xs tabular-nums w-12 text-right shrink-0">{fmt(s.total)}</div>
                  </div>
                );
              })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-zinc-600">
            <span><span className="inline-block w-3 h-3 bg-blue-700/80 rounded mr-1" />AO3</span>
            <span><span className="inline-block w-3 h-3 bg-purple-700/80 rounded mr-1" />FFN</span>
          </div>
        </section>

        {/* Footer */}
        <div className="text-xs text-zinc-700 border-t border-zinc-800 pt-4">
          Internal dashboard — not linked from the main app. Data is live from the database.
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ label, value, sub, alert }: { label: string; value: string; sub: string; alert?: boolean }) {
  return (
    <div className={`rounded border px-4 py-3 ${alert ? 'border-red-900/50 bg-red-950/20' : 'border-zinc-800 bg-zinc-900/40'}`}>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${alert ? 'text-red-400' : 'text-zinc-100'}`}>{value}</div>
      <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>
    </div>
  );
}
