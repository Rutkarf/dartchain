import { ChartRange } from '@showcase/models/showcase.model';
import { ExchangeFromToken } from '@navbar/services/brand-crypto-selection.service';

export type MarketOfferKind = 'nft' | 'service' | 'asset';

export type MarketFilter = 'all' | 'nft' | 'service' | 'asset' | 'fav' | 'live' | 'drop';

export type MarketSortMode = 'fav' | 'change' | 'price' | 'name';

/** Rail gauche showcase Marché — remplit la hauteur. */
export const MARKET_CATEGORY_RAIL: ReadonlyArray<{ id: MarketFilter; label: string }> = [
  { id: 'all', label: 'TOUT' },
  { id: 'nft', label: 'NFT' },
  { id: 'service', label: 'SERVICES' },
  { id: 'asset', label: 'ACTIFS' },
  { id: 'fav', label: 'FAV' },
  { id: 'live', label: 'LIVE' },
  { id: 'drop', label: 'DROPS' },
];

export interface MarketAssetConfig {
  /** Clé exchange Laboratoire / R4V3 */
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
  /** Rayon boutique : NFT physique, service numérique, actif */
  offerKind: MarketOfferKind;
  /** Badge court (DROP / SERVICE / NATIF / LIVE) */
  offerTag: string;
  /** Pitch produit pour vitrine + drawer */
  shortPitch: string;
  /** Signal stock / rareté */
  stockLabel: string;
}

export const MARKET_TIMEFRAMES: ReadonlyArray<{ range: ChartRange; label: string }> = [
  { range: '1h', label: '1H' },
  { range: '24h', label: '1D' },
  { range: '7d', label: '7D' },
  { range: '30d', label: '30D' },
];

export const MARKET_FILTER_OPTIONS = MARKET_CATEGORY_RAIL;

/** Catalogue Marché — hybride NFT physiques / services / actifs (branché exchange). */
export const MARKET_ASSETS: readonly MarketAssetConfig[] = [
  {
    exchangeToken: 'R4V3',
    displaySymbol: 'R4V3',
    name: 'R4V3 TOKEN',
    coinId: null,
    native: true,
    accent: '#8b9dad',
    iconLabel: 'R',
    unitLabel: 'm4t3r',
    offerKind: 'asset',
    offerTag: 'NATIF',
    shortPitch: 'Monnaie native du hub — pivot swap, graphique et accès Laboratoire.',
    stockLabel: 'UTILITY 1 R4V3:1CHF',
  },
  {
    exchangeToken: 'PXD',
    displaySymbol: 'PXD',
    name: 'Pixel Drop',
    coinId: null,
    accent: '#ede7d9',
    iconLabel: 'P',
    offerKind: 'nft',
    offerTag: 'DROP',
    shortPitch: 'Collection NFT physique Pixel — édition limitée, certificat on-chain + envoi.',
    stockLabel: '12 restants',
  },
  {
    exchangeToken: 'NVFI',
    displaySymbol: 'NVFI',
    name: 'NovaFi Desk',
    coinId: null,
    accent: '#8b9dad',
    iconLabel: 'N',
    offerKind: 'service',
    offerTag: 'SERVICE',
    shortPitch: 'Service numérique NovaFi — desk conseil, alertes et reporting marché.',
    stockLabel: 'Illimité',
  },
  {
    exchangeToken: 'LAB3',
    displaySymbol: 'LAB3',
    name: 'Lab #03 Object',
    coinId: null,
    accent: '#d5a021',
    iconLabel: '3',
    offerKind: 'nft',
    offerTag: 'DROP',
    shortPitch: 'Objet physique Lab #03 — série numérotée liée au jeton LAB3.',
    stockLabel: '8 restants',
  },
  {
    exchangeToken: 'ORB',
    displaySymbol: 'ORB',
    name: 'Orbit Relay',
    coinId: null,
    accent: '#8b9dad',
    iconLabel: 'O',
    offerKind: 'service',
    offerTag: 'SERVICE',
    shortPitch: 'Service numérique Orbit — relay API, webhooks et monitoring swap.',
    stockLabel: 'Illimité',
  },
];

export function marketOfferKindLabel(kind: MarketOfferKind): string {
  switch (kind) {
    case 'nft':
      return 'NFT';
    case 'service':
      return 'SVC';
    default:
      return 'ACT';
  }
}

export function isMarketFilter(value: string | undefined | null): value is MarketFilter {
  return (
    value === 'all' ||
    value === 'nft' ||
    value === 'service' ||
    value === 'asset' ||
    value === 'fav' ||
    value === 'live' ||
    value === 'drop'
  );
}

export const MARKET_FAVORITES_STORAGE_KEY = 'dart_market_favorites_v1';
export const MARKET_TRADES_STORAGE_KEY = 'dart_market_recent_trades_v1';
export const MARKET_ALERTS_STORAGE_KEY = 'dart_market_price_alerts_v1';
export const MARKET_SESSION_STORAGE_KEY = 'dart_market_session_v1';
export const MARKET_DEFAULT_ALERT_THRESHOLD = 5;
export const MARKET_ALERT_THRESHOLDS = [1, 3, 5, 10] as const;
export const MARKET_MAX_RECENT_TRADES = 20;
export const MARKET_AUTO_REFRESH_MS = 45_000;
