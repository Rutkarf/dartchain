import { BottomDockTab } from '../services/dock-navigation.service';
import { ShowcaseTab } from './showcase-tab.model';

/** Marker CSS partagé pour les barres repliées (showcase + dock). */
export const COLLAPSED_SUMMARY_BAR_CLASS = 'collapsed-summary-bar';

export interface CollapsedSummaryTabConfig {
  id: string;
  title: string;
  summarySelector: string;
  metrics: readonly string[];
}

export const SHOWCASE_COLLAPSED_SUMMARY_TABS: Readonly<
  Record<ShowcaseTab, CollapsedSummaryTabConfig>
> = {
  tours: {
    id: 'tours',
    title: 'TOUS',
    summarySelector: 'app-showcase-news-summary',
    metrics: ['unread', 'preview', 'liveActivity', 'relativeTime'],
  },
  r4v3: {
    id: 'r4v3',
    title: 'R4V3',
    summarySelector: 'app-showcase-r4v3-summary',
    metrics: ['price', 'trend', 'volume', 'unread'],
  },
  reseau: {
    id: 'reseau',
    title: 'RÉSEAU',
    summarySelector: 'app-showcase-terminal-summary',
    metrics: ['sync', 'blocks', 'peers', 'pendingTx'],
  },
  rv23: {
    id: 'rv23',
    title: 'CHAT',
    summarySelector: 'app-showcase-chat-summary',
    metrics: ['connected', 'unread', 'lastMessage'],
  },
  peers: {
    id: 'peers',
    title: 'PEERS',
    summarySelector: 'app-showcase-terminal-summary',
    metrics: ['connected', 'total', 'latestEndpoint'],
  },
  dao: {
    id: 'dao',
    title: 'LAUNCH',
    summarySelector: 'app-showcase-launch-summary',
    metrics: ['phase', 'projects', 'progress'],
  },
  daonews: {
    id: 'daonews',
    title: 'D.A.O',
    summarySelector: 'app-showcase-dao-summary',
    metrics: ['activeDaos', 'proposals', 'votes', 'relativeTime'],
  },
};

export const DOCK_COLLAPSED_SUMMARY_TABS: Readonly<
  Record<BottomDockTab, CollapsedSummaryTabConfig | null>
> = {
  wallet: {
    id: 'wallet',
    title: 'WALLET',
    summarySelector: 'app-dock-wallet-summary',
    metrics: ['balance', 'address', 'status'],
  },
  faucet: {
    id: 'faucet',
    title: 'FAUCET',
    summarySelector: 'app-dock-faucet-summary',
    metrics: ['eligible', 'cooldown', 'lastClaim'],
  },
  transactions: {
    id: 'transactions',
    title: 'TRANSACTION',
    summarySelector: 'app-dock-transactions-summary',
    metrics: ['pendingCount', 'latestTx', 'composerTip'],
  },
  chain: {
    id: 'chain',
    title: 'CHAIN',
    summarySelector: 'app-dock-chain-summary',
    metrics: ['tipBlock', 'blockCount', 'sync'],
  },
  market: {
    id: 'market',
    title: 'MARCHE',
    summarySelector: 'app-dock-market-summary',
    metrics: ['price', 'change', 'volume'],
  },
  quests: {
    id: 'quests',
    title: 'QUÊTES',
    summarySelector: 'app-dock-quests-summary',
    metrics: ['active', 'claimable', 'missionProgress'],
  },
  peers: {
    id: 'peers',
    title: 'PEERS',
    summarySelector: 'app-dock-peers-summary',
    metrics: ['connected', 'total', 'activity'],
  },
  admin: null,
};

export const CHART_COLLAPSED_SUMMARY: CollapsedSummaryTabConfig = {
  id: 'chart',
  title: 'GRAPHIQUE',
  summarySelector: 'app-showcase-chart-summary',
  metrics: ['pair', 'price', 'delta', 'range', 'volume', 'high', 'low', 'updatedAt'],
};

export const EXCHANGE_COLLAPSED_SUMMARY: CollapsedSummaryTabConfig = {
  id: 'exchange',
  title: 'SWAP',
  summarySelector: 'app-exchange-panel .collapsed-summary-bar',
  metrics: ['fromToken', 'toToken', 'amount', 'estimate', 'rate', 'balance', 'swapAction'],
};
