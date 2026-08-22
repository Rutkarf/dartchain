import { ChartRange } from '@core/models/showcase.model';
import { LaunchProject } from '@core/models/showcase.model';
import { MarketAssetConfig, MarketFilter, MarketSortMode } from './market-panel.constants';

export type MarketMomentum = 'hot' | 'warm' | 'neutral' | 'cool';

export interface MarketAssetMetrics {
  volumeLabel: string;
  liquidityLabel: string;
  marketCapLabel: string;
  momentum: MarketMomentum;
  momentumLabel: string;
  holdersLabel: string;
  tokenAgeLabel: string;
  recentActivityLabel: string;
  progressPercent: number | null;
  creatorLabel: string;
  statusLabel: string;
  logoUrl?: string | null;
  description?: string | null;
  launchDate?: string | null;
}

export interface MarketAssetRow {
  config: MarketAssetConfig;
  price: string;
  changePercent: number;
  positive: boolean;
  volume: string;
  favorite: boolean;
  priceUnavailable?: boolean;
  walletBalance?: number;
  rate?: number | null;
  metrics: MarketAssetMetrics;
  launchProject?: LaunchProject | null;
  /** Timestamp de création / lancement pour tri chronologique */
  createdAtMs: number;
}

export type MarketAssetRowCore = Omit<MarketAssetRow, 'metrics' | 'launchProject' | 'createdAtMs'>;

export interface MarketFeaturedChart {
  price: string;
  changePercent: number;
  positive: boolean;
  prices: number[];
}

export interface MarketRecentTrade {
  id: string;
  fromToken: string;
  toToken: string;
  amountIn: number;
  amountOut: number;
  at: number;
  txHash?: string;
}

export interface MarketPriceAlert {
  token: string;
  thresholdPercent: number;
  enabled: boolean;
}

export interface MarketQuickTradeContext {
  config: MarketAssetConfig;
  side: 'buy' | 'sell';
  fromToken: string;
  toToken: string;
  fromBalance: number;
  rate: number;
  amountPreset: number;
}

export interface MarketSwapCompleteDetail {
  fromToken: string;
  toToken: string;
  amountIn: number;
  amountOut: number;
  txHash?: string;
}

export interface MarketSessionState {
  featuredToken?: string;
  chartRange?: ChartRange;
  filter?: MarketFilter;
  sort?: MarketSortMode;
  historyExpanded?: boolean;
  alertThreshold?: number;
  searchQuery?: string;
  liveFilter?: boolean;
}
