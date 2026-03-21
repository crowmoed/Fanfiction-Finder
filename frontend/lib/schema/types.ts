export interface FicResult {
  id: string;
  platform: 'ao3' | 'ffn';
  title: string;
  author: string;
  url: string;
  authorUrl: string;
  rating: 'G' | 'T' | 'M' | 'E';
  wordCount: number;
  chapters: string;
  status: 'complete' | 'in-progress';
  tags: string[];
  summary: string;
  stats: {
    kudos?: number;
    hits?: number;
    bookmarks?: number;
    reviews?: number;
    favs?: number;
    follows?: number;
  };
  matchScore: number | null;
  matchReason: string | null;
  updatedAt: string;
}

export interface PipelineStep {
  id: 'tag-map' | 'llm-parse' | 'ao3-fetch' | 'ffn-fetch' | 'ranking';
  label: string;
  status: 'pending' | 'active' | 'complete' | 'skipped' | 'error';
  errorMessage?: string;
}

export interface PipelineStatus {
  steps: PipelineStep[];
  resultCounts?: { ao3: number; ffn: number };
  elapsedMs?: number;
  summary?: string;
}

export interface SearchHistoryEntry {
  id?: number;
  prompt: string;
  fandom: string;
  parsedFilters: Record<string, unknown>;
  resultCount: number;
  ao3Count: number;
  ffnCount: number;
  timestamp: Date;
  cachedResults?: FicResult[];
}

export type SortField = 'matchScore' | 'wordCount' | 'title' | 'updatedAt';
export type PlatformFilter = 'all' | 'ao3' | 'ffn';
export type StatusFilter = 'all' | 'complete' | 'in-progress';
export type RatingFilter = 'all' | 'G' | 'T' | 'M' | 'E';
// min word count, max word count (undefined = no bound)
export type WordCountFilter = 'all' | 'under50k' | '50k-150k' | '150k-400k' | 'over400k';

export type SearchEvent =
  | { type: 'status'; step: string; status: 'active' | 'complete' | 'skipped' | 'error'; message?: string }
  | { type: 'results'; platform: 'ao3' | 'ffn'; results: FicResult[] }
  | { type: 'ranked'; results: FicResult[] }
  | { type: 'done'; totalMs: number }
  | { type: 'error'; message: string };

export const FANDOMS = [
  'Harry Potter',
  'Percy Jackson',
  'Twilight',
  'The Hunger Games',
  'Naruto',
  'Attack on Titan',
  'My Hero Academia',
  'Fullmetal Alchemist',
  'Death Note',
  'Supernatural',
  'Sherlock',
  'Doctor Who',
  'The 100',
  'Marvel',
  'Star Wars',
  'Undertale',
  'The Legend of Zelda',
  'Minecraft',
  'Avatar',
  'Steven Universe',
] as const;

export type Fandom = typeof FANDOMS[number];
