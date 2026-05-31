import { MarketAssetConfig } from './market-panel.constants';

export interface MarketAssetRow {
  config: MarketAssetConfig;
  price: string;
  changePercent: number;
  positive: boolean;
  volume: string;
  favorite: boolean;
}

export interface MarketFeaturedChart {
  price: string;
  changePercent: number;
  positive: boolean;
  prices: number[];
}
