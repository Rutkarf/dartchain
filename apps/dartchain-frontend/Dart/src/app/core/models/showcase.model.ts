export type NewsSource = 'CHAIN' | 'EDITORIAL';

export type NewsActionType =
  | 'NONE'
  | 'VIEW_BLOCK'
  | 'VIEW_PENDING'
  | 'OPEN_PENDING'
  | 'OPEN_PEERS'
  | 'OPEN_FAUCET'
  | 'OPEN_SWAP'
  | 'OPEN_WALLET';

export type NewsDensity = 'compact' | 'comfort';

export interface NewsItem {
  id: string;
  category: string;
  title: string;
  summary: string;
  body: string;
  publishedAt: string;
  relativeTime: string;
  source: NewsSource;
  actionType: NewsActionType;
  actionTarget: string | null;
  featured: boolean;
}

export interface NewsFeedResponse {
  headline: string;
  lastTransaction: string;
  featuredId: string | null;
  items: NewsItem[];
  categories: string[];
  liveActivity: string;
  lastRefreshedAt: string;
  totalCount: number;
  hasMore: boolean;
}

export interface R4v3TokenQuote {
  symbol: string;
  priceVsR4v3: string;
  change: string;
  positive: boolean;
}

export interface R4v3SwapStats {
  swapNewsCount: number;
  lastSwapSummary: string;
}

export interface R4v3ShowcaseResponse {
  panel: {
    symbol: string;
    pair: string;
    value: string;
    change: string;
    positive: boolean;
    points: number[];
  };
  news: NewsFeedResponse;
  launchTokens: R4v3TokenQuote[];
  swapStats: R4v3SwapStats;
  ratesLatencyMs: number;
  lastRefreshedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId?: string;
  author: string;
  text: string;
  sentAt: string;
  fontKey?: string;
  fontSize?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontColor?: string;
  highlightColor?: string;
  textAlign?: string;
  styleKey?: string;
  self?: boolean;
}

export interface ChatHistoryResponse {
  roomId: string;
  messages: ChatMessage[];
}

export interface PostChatMessageRequest {
  author: string;
  text: string;
  clientId?: string;
  roomId?: string;
  fontKey?: string;
  fontSize?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontColor?: string;
  highlightColor?: string;
  textAlign?: string;
  styleKey?: string;
}

export type ChartRange = '1h' | '24h' | '7d' | '30d' | '90d' | '365d';

export interface ChartPoint {
  t: number;
  v: number;
}

export interface ChartResponse {
  pair: string;
  range: string;
  currentPrice: string;
  changePercent: number;
  positive: boolean;
  high: string;
  low: string;
  volume: string;
  points: ChartPoint[];
}

export type LaunchStatus = 'LIVE' | 'SOON' | 'ENDED';

export interface LaunchProject {
  id: string;
  name: string;
  symbol: string;
  status: LaunchStatus;
  raised: string;
  target?: string;
  logoUrl?: string | null;
}

export interface CreateLaunchProjectRequest {
  name: string;
  symbol: string;
  targetAmount?: number | null;
  description?: string | null;
  logoUrl?: string | null;
  chain?: string | null;
  totalSupply?: number | null;
  decimals?: number | null;
  website?: string | null;
  whitepaperUrl?: string | null;
  twitter?: string | null;
  telegram?: string | null;
  discord?: string | null;
  hardCap?: number | null;
  liquidityPercent?: number | null;
  launchDate?: string | null;
  contractAddress?: string | null;
}
