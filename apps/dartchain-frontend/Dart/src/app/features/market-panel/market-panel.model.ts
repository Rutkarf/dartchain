import { MarketAssetConfig } from './market-panel.constants';

export interface MarketAssetRow {
  config: MarketAssetConfig;
  price: string;
  changePercent: number;
  positive: boolean;
  volume: string;
  favorite: boolean;
  priceUnavailable?: boolean;
}

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
}
