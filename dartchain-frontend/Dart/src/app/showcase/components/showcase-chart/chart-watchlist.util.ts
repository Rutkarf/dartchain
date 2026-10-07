import { ChartSearchResult } from './chart-token-search.model';

const WATCHLIST_KEY = 'dart-chart-watchlist';
const MAX_WATCHLIST = 5;

export function readChartWatchlist(): ChartSearchResult[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ChartSearchResult[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_WATCHLIST) : [];
  } catch {
    return [];
  }
}

export function writeChartWatchlist(entries: ChartSearchResult[]): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(entries.slice(0, MAX_WATCHLIST)));
}

export function upsertChartWatchlist(entry: ChartSearchResult): ChartSearchResult[] {
  const normalized = {
    ...entry,
    symbol: entry.symbol.trim().toUpperCase(),
    id: entry.id.trim(),
  };

  const current = readChartWatchlist().filter((item) => item.id !== normalized.id);
  const next = [normalized, ...current].slice(0, MAX_WATCHLIST);
  writeChartWatchlist(next);
  return next;
}

export function removeFromChartWatchlist(id: string): ChartSearchResult[] {
  const next = readChartWatchlist().filter((item) => item.id !== id);
  writeChartWatchlist(next);
  return next;
}
