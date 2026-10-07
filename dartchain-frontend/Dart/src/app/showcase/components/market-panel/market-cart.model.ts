import { MarketOfferKind } from './market-panel.constants';

export interface MarketCartItem {
  exchangeToken: string;
  displaySymbol: string;
  name: string;
  offerKind: MarketOfferKind;
  quantity: number;
  /** Prix unitaire en R4V3 (utility ≈ CHF). */
  unitPriceR4v3: number;
  accent?: string;
  /** Ajouté via Favoris (wishlist dans le panier). */
  favorite?: boolean;
}

export interface MarketCartSnapshot {
  items: MarketCartItem[];
  updatedAt: number;
}

export interface MarketCartApiItem {
  exchangeToken: string;
  displaySymbol: string;
  name: string;
  offerKind: string;
  quantity: number;
  unitPriceR4v3: number;
}

export interface MarketCartApiResponse {
  items: MarketCartApiItem[];
  itemCount: number;
  totalR4v3: number;
}

export interface MarketCheckoutRequest {
  walletAddress: string;
  /** Si présent : checkout immédiat de ces lignes (buy now). Sinon : panier serveur. */
  items?: MarketCartApiItem[];
}

export interface MarketCheckoutLineResult {
  exchangeToken: string;
  quantity: number;
  amountInR4v3: number;
  amountOut: number;
  ok: boolean;
  message?: string;
}

export interface MarketCheckoutResponse {
  orderId: string;
  status: 'PAID' | 'FAILED' | 'PENDING';
  totalR4v3: number;
  lines: MarketCheckoutLineResult[];
  message: string;
}

export const MARKET_CART_STORAGE_KEY = 'dart_market_cart_v1';
