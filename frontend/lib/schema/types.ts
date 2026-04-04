export interface FicResult {
  id: string;
  platform: 'ao3' | 'ffn' | 'wattpad';
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
export type PlatformFilter = 'all' | 'ao3' | 'ffn' | 'wattpad';
export type StatusFilter = 'all' | 'complete' | 'in-progress';
export type RatingFilter = 'all' | 'G' | 'T' | 'M' | 'E';
export type WordCountFilter = 'all' | '10k+' | '20k+' | '40k+' | '75k+' | '100k+' | '200k+' | '400k+';
export type KudosFilter = 'all' | '100+' | '500+' | '1k+' | '5k+';

export type SearchEvent =
  | { type: 'status'; step: string; status: 'active' | 'complete' | 'skipped' | 'error'; message?: string }
  | { type: 'results'; platform: 'ao3' | 'ffn' | 'wattpad'; results: FicResult[] }
  | { type: 'ranked'; results: FicResult[] }
  | { type: 'done'; totalMs: number }
  | { type: 'error'; message: string };

export interface FandomInfo {
  name: string;
  collected: boolean;
}

export type Fandom = string;
