import type { FicResult } from '@/lib/schema/types';
import { queryToSlug, formatFilenameDate } from './format';

type ExportFormat = 'xlsx' | 'csv';

/**
 * Converts FicResult array into a flat row object for export.
 */
function toRow(fic: FicResult, index: number) {
  return {
    Rank: index + 1,
    Title: fic.title,
    Author: fic.author,
    Platform: fic.platform.toUpperCase(),
    URL: fic.url,
    Rating: fic.rating,
    'Word Count': fic.wordCount,
    Chapters: fic.chapters,
    Status: fic.status === 'complete' ? 'Complete' : 'In Progress',
    Tags: fic.tags.join(', '),
    Summary: fic.summary,
    'Match Score': fic.matchScore ?? '',
    'Match Reason': fic.matchReason ?? '',
    'Last Updated': fic.updatedAt,
    Kudos: fic.stats.kudos ?? '',
    Hits: fic.stats.hits ?? '',
    Favorites: fic.stats.favs ?? '',
    Follows: fic.stats.follows ?? '',
  };
}

export async function exportResults(
  results: FicResult[],
  query: string,
  format: ExportFormat = 'xlsx'
): Promise<void> {
  const { utils, writeFile } = await import('xlsx');

  const rows = results.map((fic, i) => toRow(fic, i));
  const ws = utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r] || '').length)),
  }));
  ws['!cols'] = colWidths;

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Results');

  const slug = queryToSlug(query);
  const datePart = formatFilenameDate();
  const filename = `ficfinder-${slug}-${datePart}.${format}`;

  writeFile(wb, filename, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
}
