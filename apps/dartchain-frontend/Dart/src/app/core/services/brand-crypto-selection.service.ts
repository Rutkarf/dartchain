import { Injectable, inject, signal } from '@angular/core';

import {
  BRAND_DEFAULT_CRYPTO,
  BrandCryptoSymbol,
  RATE_PANEL_SYMBOLS,
  coinIdForSymbol,
} from '../constants/rate-panel-symbols';
import {
  EXCHANGE_LAUNCHPAD_FALLBACK_TOKENS,
  EXCHANGE_NATIVE_TOKEN,
} from '../constants/exchange-launchpad.constants';
import { RatePanelPreferencesService } from './rate-panel-preferences.service';

/** Tokens échangeables LaunchLab (fallback — liste réelle via API exchange-panel). */
export const EXCHANGE_FROM_TOKENS = EXCHANGE_LAUNCHPAD_FALLBACK_TOKENS;

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
  readonly exchangeFromToken = signal<string | null>(null);
  /** Paire swap explicite (market panel BUY/SELL, LaunchLab). */
  readonly exchangeTradeRequest = signal<{
    from: string;
    to: string;
  } | null>(null);
  /** Paire active dans le hub swap (sync bidirectionnelle dock marché). */
  readonly activeExchangePair = signal<{ from: string; to: string } | null>(null);

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
    const normalized = symbol.trim().toUpperCase();
    if (normalized) {
      this.exchangeFromToken.set(normalized);
    }
  }

  requestExchangeTrade(from: string, to: string): void {
    this.exchangeTradeRequest.set({
      from: from.trim().toUpperCase(),
      to: to.trim().toUpperCase(),
    });
  }

  publishActiveExchangePair(from: string, to: string): void {
    this.activeExchangePair.set({
      from: from.trim().toUpperCase(),
      to: to.trim().toUpperCase(),
    });
  }

  /** Après swap réussi : pré-sélectionner la paire sur le graphique. */
  selectSwapPair(fromToken: string, toToken: string): void {
    const chartSymbol =
      toToken === EXCHANGE_NATIVE_TOKEN ? fromToken : toToken;
    if ((RATE_PANEL_SYMBOLS as readonly string[]).includes(chartSymbol)) {
      this.select(chartSymbol);
    } else if (chartSymbol === EXCHANGE_NATIVE_TOKEN) {
      this.select(BRAND_DEFAULT_CRYPTO);
    } else if ((EXCHANGE_FROM_TOKENS as readonly string[]).includes(chartSymbol)) {
      this.select(BRAND_DEFAULT_CRYPTO);
    }
  }
}
