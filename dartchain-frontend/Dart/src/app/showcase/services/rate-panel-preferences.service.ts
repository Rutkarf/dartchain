import { Injectable, signal } from '@angular/core';

import {
  BRAND_DEFAULT_CRYPTO,
  COINGECKO_COIN_IDS,
  RATE_PANEL_COLUMN_SIZE,
  RATE_PANEL_RIGHT_DEFAULT_SYMBOLS,
  RatePanelSymbol,
} from '@core/constants/rate-panel-symbols';
import { RatePanelCoinEntry } from '@showcase/models/rate-panel-coin.model';

const STORAGE_KEY = 'r4v3-rate-panel-right';

function defaultRightCoins(): RatePanelCoinEntry[] {
  return RATE_PANEL_RIGHT_DEFAULT_SYMBOLS.map((symbol) => entryForDefaultSymbol(symbol));
}

function entryForDefaultSymbol(symbol: string): RatePanelCoinEntry {
  const normalized = symbol.toUpperCase() as RatePanelSymbol;
  return {
    coinId: COINGECKO_COIN_IDS[normalized],
    symbol: normalized,
  };
}

function withoutNativeCoin(coins: RatePanelCoinEntry[]): RatePanelCoinEntry[] {
  return coins.filter((coin) => coin.symbol !== BRAND_DEFAULT_CRYPTO);
}

@Injectable({ providedIn: 'root' })
export class RatePanelPreferencesService {
  readonly rightCoins = signal<RatePanelCoinEntry[]>(this.loadRightCoins());

  addToRightColumn(entry: RatePanelCoinEntry): boolean {
    const normalizedSymbol = entry.symbol.trim().toUpperCase();
    if (normalizedSymbol === BRAND_DEFAULT_CRYPTO) {
      return false;
    }

    const normalizedEntry: RatePanelCoinEntry = {
      coinId: entry.coinId.trim().toLowerCase(),
      symbol: normalizedSymbol,
      name: entry.name?.trim() || undefined,
    };

    if (!normalizedEntry.coinId || !normalizedEntry.symbol) {
      return false;
    }

    const current = withoutNativeCoin([...this.rightCoins()]);
    const existingIndex = current.findIndex((coin) => coin.symbol === normalizedEntry.symbol);

    if (existingIndex >= 0) {
      current.splice(existingIndex, 1);
    }

    current.push(normalizedEntry);

    while (current.length > RATE_PANEL_COLUMN_SIZE) {
      current.shift();
    }

    this.persist(current);
    return true;
  }

  coinIdForSymbol(symbol: string): string | undefined {
    const normalized = symbol.toUpperCase();
    const fromRight = this.rightCoins().find((coin) => coin.symbol === normalized);
    if (fromRight) {
      return fromRight.coinId;
    }

    return COINGECKO_COIN_IDS[normalized as RatePanelSymbol];
  }

  private loadRightCoins(): RatePanelCoinEntry[] {
    if (typeof localStorage === 'undefined') {
      return defaultRightCoins();
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaultRightCoins();
      }

      const parsed = JSON.parse(raw) as RatePanelCoinEntry[];
      if (!Array.isArray(parsed)) {
        return defaultRightCoins();
      }

      const sanitized = withoutNativeCoin(
        parsed
          .filter(
            (entry) =>
              entry &&
              typeof entry.coinId === 'string' &&
              typeof entry.symbol === 'string' &&
              entry.coinId.trim() &&
              entry.symbol.trim()
          )
          .map((entry) => ({
            coinId: entry.coinId.trim().toLowerCase(),
            symbol: entry.symbol.trim().toUpperCase(),
            name: entry.name?.trim() || undefined,
          }))
          .slice(0, RATE_PANEL_COLUMN_SIZE)
      );

      if (sanitized.length > 0) {
        return this.padRightCoins(sanitized);
      }

      return defaultRightCoins();
    } catch {
      return defaultRightCoins();
    }
  }

  private persist(coins: RatePanelCoinEntry[]): void {
    this.rightCoins.set(withoutNativeCoin(coins).slice(0, RATE_PANEL_COLUMN_SIZE));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.rightCoins()));
    }
  }

  private padRightCoins(coins: RatePanelCoinEntry[]): RatePanelCoinEntry[] {
    const padded = withoutNativeCoin([...coins]);
    const symbols = new Set(padded.map((coin) => coin.symbol));

    for (const symbol of RATE_PANEL_RIGHT_DEFAULT_SYMBOLS) {
      if (padded.length >= RATE_PANEL_COLUMN_SIZE) {
        break;
      }

      if (!symbols.has(symbol)) {
        padded.push(entryForDefaultSymbol(symbol));
        symbols.add(symbol);
      }
    }

    return padded.slice(0, RATE_PANEL_COLUMN_SIZE);
  }
}
