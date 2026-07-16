import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { BrandCryptoSelectionService } from '../../core/services/brand-crypto-selection.service';
import { MarketDataService } from '../../core/services/market-data.service';
import { AuthService } from '../../core/services/auth.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';
import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { MarketPanelService } from './market-panel.service';
import { MarketPanelComponent } from './market-panel';
import { MARKET_ASSETS } from './market-panel.constants';
import { MarketAssetRow } from './market-panel.model';

describe('MarketPanelComponent', () => {
  let fixture: ComponentFixture<MarketPanelComponent>;
  let marketService: {
    loadAssetRows: ReturnType<typeof vi.fn>;
    loadFeaturedChart: ReturnType<typeof vi.fn>;
    readFavorites: ReturnType<typeof vi.fn>;
    writeFavorites: ReturnType<typeof vi.fn>;
  };
  let marketData: {
    init: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    configureContext: ReturnType<typeof vi.fn>;
    scheduleRefresh: ReturnType<typeof vi.fn>;
    refreshAll: ReturnType<typeof vi.fn>;
    togglePriceAlert: ReturnType<typeof vi.fn>;
    isAlertEnabled: ReturnType<typeof vi.fn>;
    clearAlertNotifications: ReturnType<typeof vi.fn>;
    rateLimitCountdownLabel: ReturnType<typeof vi.fn>;
    rows: ReturnType<typeof signal<MarketAssetRow[]>>;
    featuredChart: ReturnType<typeof signal>;
    loadingRows: ReturnType<typeof signal>;
    loadingChart: ReturnType<typeof signal>;
    error: ReturnType<typeof signal<string | null>>;
    recentTrades: ReturnType<typeof signal>;
    alertNotifications: ReturnType<typeof signal<string[]>>;
  };

  let walletAddressMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    marketService = {
      readFavorites: vi.fn(() => new Set(['PXD'])),
      loadAssetRows: vi.fn(),
      loadFeaturedChart: vi.fn(),
      writeFavorites: vi.fn(),
    };

    marketData = {
      init: vi.fn(),
      destroy: vi.fn(),
      configureContext: vi.fn(),
      scheduleRefresh: vi.fn(),
      refreshAll: vi.fn(async () => undefined),
      togglePriceAlert: vi.fn(),
      isAlertEnabled: vi.fn(() => false),
      clearAlertNotifications: vi.fn(),
      rateLimitCountdownLabel: vi.fn(() => null),
      rows: signal<MarketAssetRow[]>([
        {
          config: MARKET_ASSETS[1],
          price: '0,05 €',
          changePercent: 1.2,
          positive: true,
          volume: 'LaunchLab',
          favorite: true,
        },
      ]),
      featuredChart: signal({
        price: '0,12 €',
        changePercent: 1.2,
        positive: true,
        prices: [1, 2, 3],
      }),
      loadingRows: signal(false),
      loadingChart: signal(false),
      error: signal<string | null>(null),
      recentTrades: signal([]),
      alertNotifications: signal<string[]>([]),
    };

    walletAddressMock = vi.fn(() => '');

    await TestBed.configureTestingModule({
      imports: [MarketPanelComponent],
      providers: [
        provideHttpClient(),
        BrandCryptoSelectionService,
        {
          provide: BlockchainApiService,
          useValue: {
            getExchangePanel: vi.fn(() =>
              of({
                fromToken: 'R4V3',
                toToken: 'PXD',
                availableTokens: ['R4V3', 'PXD', 'NVFI', 'LAB3', 'ORB'],
                fromBalance: 0,
                toBalance: 0,
                rate: 20,
                testnet: true,
              })
            ),
            swapExchangeTokens: vi.fn(() =>
              of({
                fromToken: 'R4V3',
                toToken: 'PXD',
                rate: 20,
                amountIn: 1,
                amountOut: 20,
                fromBalance: 0,
                toBalance: 20,
                message: 'ok',
              })
            ),
          },
        },
        { provide: MarketPanelService, useValue: marketService },
        { provide: MarketDataService, useValue: marketData },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: vi.fn(() => false),
            openDrawer: vi.fn(),
          },
        },
        {
          provide: WalletSessionService,
          useValue: {
            address: walletAddressMock,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketPanelComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create and render market filters', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('TOUS');
    expect(fixture.nativeElement.textContent).toContain('R4V3');
    expect(fixture.nativeElement.textContent).toContain('FAV');
  });

  it('should initialize market data service', () => {
    expect(marketData.init).toHaveBeenCalled();
    expect(marketData.refreshAll).toHaveBeenCalledWith(true);
  });

  it('should block quick trade when wallet is missing', async () => {
    const row = marketData.rows()[0];
    await fixture.componentInstance['openQuickTrade'](row, 'buy');
    expect(fixture.componentInstance['tradeHint']()).toContain('Créez un wallet');
  });

  it('should toggle history panel', () => {
    expect(fixture.componentInstance['historyExpanded']()).toBe(false);
    fixture.componentInstance['toggleHistory']();
    fixture.detectChanges();
    expect(fixture.componentInstance['historyExpanded']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Liste');
  });

  it('should sync featured asset when hub pair changes', () => {
    const brand = TestBed.inject(BrandCryptoSelectionService);
    brand.publishActiveExchangePair('R4V3', 'NVFI');
    fixture.detectChanges();
    expect(fixture.componentInstance['featuredAsset']().exchangeToken).toBe('NVFI');
  });
});
