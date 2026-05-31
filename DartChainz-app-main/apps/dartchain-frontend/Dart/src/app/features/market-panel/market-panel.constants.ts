import { ChartRange } from '../../core/models/showcase.model';
import { ExchangeFromToken } from '../../core/services/brand-crypto-selection.service';

export type MarketFilter = 'all' | 'mts' | 'fav';

export interface MarketAssetConfig {
  /** Clé exchange / API */
  exchangeToken: ExchangeFromToken;
  /** Symbole affiché (MTS = token natif R4V3) */
  displaySymbol: string;
  name: string;
  coinId: string | null;
  native?: boolean;
  accent: string;
  iconLabel: string;
}

export const MARKET_TIMEFRAMES: ReadonlyArray<{ range: ChartRange; label: string }> = [
  { range: '1h', label: '1H' },
  { range: '24h', label: '1D' },
  { range: '7d', label: '7D' },
  { range: '30d', label: '30D' },
];

export const MARKET_ASSETS: readonly MarketAssetConfig[] = [
  {
    exchangeToken: 'R4V3',
    displaySymbol: 'MTS',
    name: 'R4V3 TOKEN',
    coinId: null,
    native: true,
    accent: '#00d9ff',
    iconLabel: 'M',
  },
  {
    exchangeToken: 'ETH',
    displaySymbol: 'ETH',
    name: 'Ethereum',
    coinId: 'ethereum',
    accent: '#627eea',
    iconLabel: 'Ξ',
  },
  {
    exchangeToken: 'BTC',
    displaySymbol: 'BTC',
    name: 'Bitcoin',
    coinId: 'bitcoin',
    accent: '#f7931a',
    iconLabel: '₿',
  },
  {
    exchangeToken: 'SOL',
    displaySymbol: 'SOL',
    name: 'Solana',
    coinId: 'solana',
    accent: '#9945ff',
    iconLabel: 'S',
  },
  {
    exchangeToken: 'USDT',
    displaySymbol: 'USDT',
    name: 'Tether',
    coinId: 'tether',
    accent: '#26a17b',
    iconLabel: '₮',
  },
];

export const MARKET_FAVORITES_STORAGE_KEY = 'dart_market_favorites_v1';
