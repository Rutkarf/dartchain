import { ChartRange } from '../../core/models/showcase.model';
import { ExchangeFromToken } from '../../core/services/brand-crypto-selection.service';

export type MarketFilter = 'all' | 'r4v3' | 'fav';

export interface MarketAssetConfig {
  /** Clé exchange LaunchLab / R4V3 */
  exchangeToken: ExchangeFromToken;
  /** Symbole affiché */
  displaySymbol: string;
  name: string;
  coinId: string | null;
  native?: boolean;
  accent: string;
  iconLabel: string;
  /** Unité décimale affichée pour le natif */
  unitLabel?: string;
}

export const MARKET_TIMEFRAMES: ReadonlyArray<{ range: ChartRange; label: string }> = [
  { range: '1h', label: '1H' },
  { range: '24h', label: '1D' },
  { range: '7d', label: '7D' },
  { range: '30d', label: '30D' },
];

/** Actifs affichés dans le market panel — alignés LaunchLab (plus de BTC/ETH externes). */
export const MARKET_ASSETS: readonly MarketAssetConfig[] = [
  {
    exchangeToken: 'R4V3',
    displaySymbol: 'R4V3',
    name: 'R4V3 TOKEN',
    coinId: null,
    native: true,
    accent: '#00d9ff',
    iconLabel: 'R',
    unitLabel: 'm4t3r',
  },
  {
    exchangeToken: 'PXD',
    displaySymbol: 'PXD',
    name: 'Pixel DAO',
    coinId: null,
    accent: '#ff6bcb',
    iconLabel: 'P',
  },
  {
    exchangeToken: 'NVFI',
    displaySymbol: 'NVFI',
    name: 'NovaFi',
    coinId: null,
    accent: '#4ade80',
    iconLabel: 'N',
  },
  {
    exchangeToken: 'LAB3',
    displaySymbol: 'LAB3',
    name: 'Lab #03',
    coinId: null,
    accent: '#fbbf24',
    iconLabel: '3',
  },
  {
    exchangeToken: 'ORB',
    displaySymbol: 'ORB',
    name: 'Orbit Swap',
    coinId: null,
    accent: '#38bdf8',
    iconLabel: 'O',
  },
];

export const MARKET_FAVORITES_STORAGE_KEY = 'dart_market_favorites_v1';
export const MARKET_TRADES_STORAGE_KEY = 'dart_market_recent_trades_v1';
export const MARKET_ALERTS_STORAGE_KEY = 'dart_market_price_alerts_v1';
export const MARKET_DEFAULT_ALERT_THRESHOLD = 5;
export const MARKET_MAX_RECENT_TRADES = 3;
export const MARKET_AUTO_REFRESH_MS = 45_000;
