'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SearchHistoryEntry } from '@/lib/schema/types';

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const { getDB } = await import('@/lib/storage/db');
      const db = getDB();
      const entries = await db.searchHistory.orderBy('timestamp').reverse().limit(50).toArray();
      setHistory(entries);
    } catch {
      // IndexedDB not available
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const addEntry = useCallback(async (entry: Omit<SearchHistoryEntry, 'id'>) => {
    try {
      const { getDB } = await import('@/lib/storage/db');
      const db = getDB();
      await db.searchHistory.add(entry);
      await loadHistory();
    } catch {
      // Silently fail
    }
  }, [loadHistory]);

  const clearHistory = useCallback(async () => {
    try {
      const { getDB } = await import('@/lib/storage/db');
      const db = getDB();
      await db.searchHistory.clear();
      setHistory([]);
    } catch {
      // Silently fail
    }
  }, []);

  const getByShareId = useCallback(async (shareId: string): Promise<SearchHistoryEntry | undefined> => {
    try {
      const { getDB } = await import('@/lib/storage/db');
      const db = getDB();
      return await db.searchHistory.where('shareId').equals(shareId).first();
    } catch {
      return undefined;
    }
  }, []);

  const getCachedEntry = useCallback(async (prompt: string, fandom: string): Promise<SearchHistoryEntry | undefined> => {
    try {
      const { getDB } = await import('@/lib/storage/db');
      const db = getDB();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const entry = await db.searchHistory
        .where('prompt')
        .equals(prompt)
        .filter((e) => e.fandom === fandom && e.timestamp > oneDayAgo && !!e.cachedResults)
        .first();
      return entry;
    } catch {
      return undefined;
    }
  }, []);

  return { history, isLoaded, addEntry, clearHistory, getCachedEntry, getByShareId };
}
