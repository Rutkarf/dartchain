import { Injectable, inject, signal } from '@angular/core';

import {
  BRAND_DEFAULT_CRYPTO,
  BrandCryptoSymbol,
  RATE_PANEL_SYMBOLS,
  coinIdForSymbol,
} from '../constants/rate-panel-symbols';
import { RatePanelPreferencesService } from './rate-panel-preferences.service';

/** Tokens supportés par le panneau exchange (aligné backend). */
export const EXCHANGE_FROM_TOKENS = [
  'R4V3',
  'BTC',
  'ETH',
  'SOL',
  'DOGE',
  'SHIB',
  'XRP',
  'DOT',
  'USDT',
  'AVAX',
] as const;

export type ExchangeFromToken = (typeof EXCHANGE_FROM_TOKENS)[number];

@Injectable({ providedIn: 'root' })
export class BrandCryptoSelectionService {
  private readonly ratePanelPrefs = inject(RatePanelPreferencesService);

  /** CoinGecko id pour le graphique (cryptos ajoutées via rate panel). */
  readonly selectedCoinId = signal<string | null>(null);

  readonly menuSymbols: readonly BrandCryptoSymbol[] = [
    BRAND_DEFAULT_CRYPTO,
    ...RATE_PANEL_SYMBOLS,
  ];

  readonly selected = signal<BrandCryptoSymbol>(BRAND_DEFAULT_CRYPTO);
  /** Demande de synchronisation du token From du swap (rate panel, graphique, etc.). */
  readonly exchangeFromToken = signal<ExchangeFromToken | null>(null);
  /** Paire swap explicite (market panel BUY/SELL). */
  readonly exchangeTradeRequest = signal<{
    from: ExchangeFromToken;
    to: ExchangeFromToken;
  } | null>(null);

  select(symbol: BrandCryptoSymbol, coinId?: string | null): void {
    this.selected.set(symbol);
    const resolved =
      coinId?.trim() ||
      this.ratePanelPrefs.coinIdForSymbol(String(symbol)) ||
      coinIdForSymbol(String(symbol)) ||
      null;
    this.selectedCoinId.set(resolved);
  }

  /** Clic rate panel : sélection + sync swap (graphique intégré au panneau). */
  selectFromRatePanel(symbol: string, coinId?: string | null): void {
    this.select(symbol, coinId);
    this.selectForExchange(symbol);
  }

  selectForExchange(symbol: string): void {
    const normalized = symbol.toUpperCase();
    if ((EXCHANGE_FROM_TOKENS as readonly string[]).includes(normalized)) {
      this.exchangeFromToken.set(normalized as ExchangeFromToken);
    }
  }

  requestExchangeTrade(from: ExchangeFromToken, to: ExchangeFromToken): void {
    this.exchangeTradeRequest.set({ from, to });
  }

  /** Après swap réussi : pré-sélectionner la paire sur le graphique. */
  selectSwapPair(fromToken: string, toToken: string): void {
    const chartSymbol = toToken === 'R4V3' ? fromToken : toToken;
    if ((RATE_PANEL_SYMBOLS as readonly string[]).includes(chartSymbol)) {
      this.select(chartSymbol);
    } else if (chartSymbol === 'R4V3') {
      this.select(BRAND_DEFAULT_CRYPTO);
    }
  }
}
