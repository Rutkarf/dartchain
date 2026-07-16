export const RATE_PANEL_SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'XRP',
  'ADA',
  'DOGE',
  'AVAX',
  'DOT',
  'LINK',
  'MATIC',
  'UNI',
  'TRX',
  'LTC',
  'ATOM',
  'SHIB',
] as const;

export type RatePanelSymbol = (typeof RATE_PANEL_SYMBOLS)[number];

/** Colonne gauche fixe (7 cryptos ; R4V3 est affiché une seule fois au-dessus des 2 colonnes). */
export const RATE_PANEL_LEFT_SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'XRP',
  'ADA',
  'DOGE',
] as const;

/** Colonne droite par défaut (7 cryptos, remplaçables via l’explorateur). */
export const RATE_PANEL_RIGHT_DEFAULT_SYMBOLS = [
  'AVAX',
  'DOT',
  'LINK',
  'MATIC',
  'UNI',
  'TRX',
  'LTC',
] as const;

export const RATE_PANEL_NATIVE_COIN_ID = 'native';

export const COINGECKO_COIN_IDS: Record<RatePanelSymbol, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  LINK: 'chainlink',
  MATIC: 'matic-network',
  UNI: 'uniswap',
  TRX: 'tron',
  LTC: 'litecoin',
  ATOM: 'cosmos',
  SHIB: 'shiba-inu',
};

export const RATE_PANEL_COLUMN_SIZE = 7;

export const BRAND_DEFAULT_CRYPTO = 'R4V3' as const;

export type BrandCryptoSymbol = typeof BRAND_DEFAULT_CRYPTO | RatePanelSymbol | string;

/** Paire API showcase/chart (`BASE-QUOTE`). */
export function chartPairForSymbol(symbol: BrandCryptoSymbol): string {
  return symbol === BRAND_DEFAULT_CRYPTO ? 'R4V3-EUR' : `${symbol}-R4V3`;
}

export function chartBaseSymbol(symbol: BrandCryptoSymbol): string {
  return symbol === BRAND_DEFAULT_CRYPTO ? 'R4V3' : symbol;
}

export function chartQuoteSymbol(_symbol: BrandCryptoSymbol): string {
  return BRAND_DEFAULT_CRYPTO;
}

export function coinIdForSymbol(symbol: string): string | undefined {
  const normalized = symbol.toUpperCase() as RatePanelSymbol;
  return COINGECKO_COIN_IDS[normalized];
}
