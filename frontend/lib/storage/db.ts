import Dexie, { type Table } from 'dexie';
import type { FicResult, SearchHistoryEntry } from '@/lib/schema/types';

export type { SearchHistoryEntry };

export class FicFinderDB extends Dexie {
  searchHistory!: Table<SearchHistoryEntry>;

  constructor() {
    super('ficfinder');
    this.version(1).stores({
      searchHistory: '++id, prompt, fandom, timestamp',
    });
  }
}

// Lazily instantiate only on the client
let _db: FicFinderDB | null = null;

export function getDB(): FicFinderDB {
  if (typeof window === 'undefined') {
    throw new Error('DB can only be accessed on the client side');
  }
  if (!_db) {
    _db = new FicFinderDB();
  }
  return _db;
}
