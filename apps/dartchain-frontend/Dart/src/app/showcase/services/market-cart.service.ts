import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '@auth/services/auth.service';
import { WalletSessionService } from '@wallet/services/wallet-session.service';
import {
  MARKET_CART_STORAGE_KEY,
  MarketCartApiItem,
  MarketCartApiResponse,
  MarketCartItem,
  MarketCartSnapshot,
  MarketCheckoutRequest,
  MarketCheckoutResponse,
} from '../components/market-panel/market-cart.model';
import { MarketAssetRow } from '../components/market-panel/market-panel.model';

@Injectable({ providedIn: 'root' })
export class MarketCartService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly wallet = inject(WalletSessionService);
  private readonly apiUrl = environment.apiUrl;
  private syncedUserId: string | null = null;

  private readonly itemsSignal = signal<MarketCartItem[]>(this.readLocal());
  readonly open = signal(false);
  readonly busy = signal(false);
  readonly lastMessage = signal<string | null>(null);

  readonly items = this.itemsSignal.asReadonly();
  readonly itemCount = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.quantity, 0)
  );
  readonly totalR4v3 = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.quantity * item.unitPriceR4v3, 0)
  );

  constructor() {
    effect(() => {
      const authed = this.auth.isAuthenticated();
      const userId = this.auth.user()?.id ?? null;
      if (!authed || !userId) {
        this.syncedUserId = null;
        return;
      }
      if (this.syncedUserId === userId) {
        return;
      }
      this.syncedUserId = userId;
      untracked(() => this.syncAfterLogin());
    });
  }

  /** Appelé après login réussi. */
  syncAfterLogin(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }
    const local = this.itemsSignal();
    if (local.length === 0) {
      this.pullRemote();
      return;
    }
    this.busy.set(true);
    this.http
      .put<MarketCartApiResponse>(`${this.apiUrl}/market/cart`, {
        items: local.map((item) => this.toApiItem(item)),
      })
      .pipe(catchError(() => of(null)))
      .subscribe((cart) => {
        this.busy.set(false);
        if (cart) {
          this.applyRemote(cart);
        } else {
          this.pullRemote();
        }
      });
  }

  pullRemote(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }
    this.http
      .get<MarketCartApiResponse>(`${this.apiUrl}/market/cart`)
      .pipe(catchError(() => of(null)))
      .subscribe((cart) => {
        if (cart) {
          this.applyRemote(cart);
        }
      });
  }

  openDrawer(): void {
    this.open.set(true);
    if (this.auth.isAuthenticated()) {
      this.pullRemote();
    }
  }

  closeDrawer(): void {
    this.open.set(false);
  }

  toggleDrawer(): void {
    if (this.open()) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  unitPriceFromRow(row: MarketAssetRow): number {
    const rate = row.rate;
    if (rate != null && rate > 0) {
      return 1 / rate;
    }
    const parsed = this.parsePriceNumber(row.price);
    if (parsed != null && parsed > 0) {
      return parsed;
    }
    return 0.05;
  }

  addFromRow(
    row: MarketAssetRow,
    quantity = 1,
    options?: { favorite?: boolean }
  ): void {
    if (row.config.native) {
      this.lastMessage.set('R4V3 est la monnaie du hub');
      return;
    }
    const qty = Math.max(1, Math.floor(quantity));
    const unit = this.unitPriceFromRow(row);
    const asFavorite = !!options?.favorite;
    const next = [...this.itemsSignal()];
    const index = next.findIndex((item) => item.exchangeToken === row.config.exchangeToken);
    if (index >= 0) {
      next[index] = {
        ...next[index],
        quantity: next[index].quantity + qty,
        unitPriceR4v3: unit,
        favorite: asFavorite || next[index].favorite,
      };
    } else {
      next.push({
        exchangeToken: row.config.exchangeToken,
        displaySymbol: row.config.displaySymbol,
        name: row.config.name,
        offerKind: row.config.offerKind,
        quantity: qty,
        unitPriceR4v3: unit,
        accent: row.config.accent,
        favorite: asFavorite || undefined,
      });
    }
    this.commit(next);
    this.lastMessage.set(
      asFavorite
        ? `${row.config.displaySymbol} ajouté aux favoris (panier)`
        : `${row.config.displaySymbol} ajouté au panier`
    );
    this.pushRemoteIfAuth();
  }

  setQuantity(token: string, quantity: number): void {
    const qty = Math.floor(quantity);
    let next = [...this.itemsSignal()];
    if (qty <= 0) {
      next = next.filter((item) => item.exchangeToken !== token);
    } else {
      next = next.map((item) =>
        item.exchangeToken === token ? { ...item, quantity: qty } : item
      );
    }
    this.commit(next);
    this.pushRemoteIfAuth();
  }

  remove(token: string): void {
    this.commit(this.itemsSignal().filter((item) => item.exchangeToken !== token));
    this.pushRemoteIfAuth();
  }

  clearLocal(): void {
    this.commit([]);
  }

  checkout(options?: { items?: MarketCartItem[] }): void {
    const address = this.wallet.address();
    if (!this.auth.isAuthenticated()) {
      this.auth.openDrawer('login');
      this.lastMessage.set('Connexion requise pour payer');
      return;
    }
    if (!address) {
      window.dispatchEvent(new CustomEvent('dock-open-panel', { detail: { panel: 'wallet' } }));
      this.lastMessage.set('Créez un wallet pour payer');
      return;
    }

    const source = options?.items ?? this.itemsSignal();
    if (source.length === 0) {
      this.lastMessage.set('Panier vide');
      return;
    }

    const body: MarketCheckoutRequest = {
      walletAddress: address,
      items: source.map((item) => this.toApiItem(item)),
    };

    this.busy.set(true);
    this.http
      .post<MarketCheckoutResponse>(`${this.apiUrl}/market/checkout`, body)
      .pipe(
        tap(() => this.wallet.requestBalanceRefresh()),
        catchError((err) => {
          const message =
            err?.error?.message || err?.message || 'Checkout impossible — solde ou connexion';
          this.lastMessage.set(String(message));
          return of(null);
        })
      )
      .subscribe((result) => {
        this.busy.set(false);
        if (!result) {
          return;
        }
        this.lastMessage.set(result.message);
        if (result.status === 'PAID') {
          if (!options?.items) {
            this.commit([]);
            this.pushRemoteIfAuth(true);
          } else {
            // Buy-now : retire seulement les tokens achetés
            const bought = new Set(source.map((i) => i.exchangeToken));
            this.commit(this.itemsSignal().filter((i) => !bought.has(i.exchangeToken)));
            this.pushRemoteIfAuth();
          }
          this.closeDrawer();
        }
      });
  }

  private pushRemoteIfAuth(clear = false): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }
    const payload = {
      items: clear ? [] : this.itemsSignal().map((item) => this.toApiItem(item)),
    };
    this.http
      .put<MarketCartApiResponse>(`${this.apiUrl}/market/cart`, payload)
      .pipe(catchError(() => of(null)))
      .subscribe((cart) => {
        if (cart) {
          this.applyRemote(cart);
        }
      });
  }

  private applyRemote(cart: MarketCartApiResponse): void {
    const items: MarketCartItem[] = (cart.items ?? []).map((item) => ({
      exchangeToken: item.exchangeToken,
      displaySymbol: item.displaySymbol,
      name: item.name,
      offerKind: (item.offerKind as MarketCartItem['offerKind']) || 'asset',
      quantity: item.quantity,
      unitPriceR4v3: item.unitPriceR4v3,
    }));
    this.commit(items);
  }

  private toApiItem(item: MarketCartItem): MarketCartApiItem {
    return {
      exchangeToken: item.exchangeToken,
      displaySymbol: item.displaySymbol,
      name: item.name,
      offerKind: item.offerKind,
      quantity: item.quantity,
      unitPriceR4v3: item.unitPriceR4v3,
    };
  }

  private commit(items: MarketCartItem[]): void {
    this.itemsSignal.set(items);
    this.writeLocal(items);
  }

  private readLocal(): MarketCartItem[] {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(MARKET_CART_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as MarketCartSnapshot;
      return Array.isArray(parsed.items) ? parsed.items : [];
    } catch {
      return [];
    }
  }

  private writeLocal(items: MarketCartItem[]): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const snapshot: MarketCartSnapshot = { items, updatedAt: Date.now() };
      window.localStorage.setItem(MARKET_CART_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* ignore */
    }
  }

  private parsePriceNumber(price: string): number | null {
    const normalized = (price || '').replace(/[^\d,.-]/g, '').replace(',', '.');
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) ? value : null;
  }
}
