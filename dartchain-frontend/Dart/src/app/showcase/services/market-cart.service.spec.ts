import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MarketCartService } from './market-cart.service';
import { MARKET_CART_STORAGE_KEY } from '../components/market-panel/market-cart.model';
import { AuthService } from '@auth/services/auth.service';
import { WalletSessionService } from '@wallet/services/wallet-session.service';

describe('MarketCartService', () => {
  beforeEach(() => {
    localStorage.removeItem(MARKET_CART_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MarketCartService,
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => false,
            user: () => null,
            openDrawer: () => undefined,
          },
        },
        {
          provide: WalletSessionService,
          useValue: {
            address: () => null,
            requestBalanceRefresh: () => undefined,
          },
        },
      ],
    });
  });

  it('adds a non-native product to the local cart', () => {
    const cart = TestBed.inject(MarketCartService);
    cart.addFromRow(
      {
        config: {
          exchangeToken: 'PXD',
          displaySymbol: 'PXD',
          name: 'Pixel Drop',
          coinId: null,
          accent: '#ede7d9',
          iconLabel: 'P',
          offerKind: 'nft',
          offerTag: 'DROP',
          shortPitch: 'x',
          stockLabel: '12',
        },
        price: '0,05 €',
        changePercent: 0,
        positive: true,
        volume: '—',
        favorite: false,
        rate: 20,
        metrics: {
          volumeLabel: '—',
          liquidityLabel: '—',
          marketCapLabel: '—',
          momentum: 'cool',
          momentumLabel: 'Calme',
          holdersLabel: '24',
          tokenAgeLabel: '—',
          recentActivityLabel: '—',
          progressPercent: null,
          creatorLabel: 'DartChain',
          statusLabel: 'LIVE',
        },
        createdAtMs: Date.now(),
      } as never,
      2
    );

    expect(cart.itemCount()).toBe(2);
    expect(cart.totalR4v3()).toBeCloseTo(0.1, 5);
    expect(cart.items()[0].exchangeToken).toBe('PXD');
  });

  it('refuses to add native R4V3 as a cart line', () => {
    const cart = TestBed.inject(MarketCartService);
    cart.addFromRow(
      {
        config: {
          exchangeToken: 'R4V3',
          displaySymbol: 'R4V3',
          name: 'R4V3 token',
          coinId: null,
          native: true,
          accent: '#8b9dad',
          iconLabel: 'R',
          offerKind: 'asset',
          offerTag: 'NATIF',
          shortPitch: 'x',
          stockLabel: 'UTILITY 1 R4V3:1CHF',
        },
        price: '1,00 CHF',
        changePercent: 0,
        positive: true,
        volume: 'UTILITY 1 R4V3:1CHF',
        favorite: false,
        rate: 1,
        metrics: {
          volumeLabel: '—',
          liquidityLabel: '—',
          marketCapLabel: '—',
          momentum: 'cool',
          momentumLabel: 'Calme',
          holdersLabel: '24',
          tokenAgeLabel: '—',
          recentActivityLabel: '—',
          progressPercent: null,
          creatorLabel: 'DartChain',
          statusLabel: 'LIVE',
        },
        createdAtMs: Date.now(),
      } as never,
      1
    );

    expect(cart.itemCount()).toBe(0);
  });
});
