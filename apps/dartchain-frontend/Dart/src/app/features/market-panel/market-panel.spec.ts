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

const mockMetrics = {
  volumeLabel: 'LaunchLab',
  liquidityLabel: '25k R4V3',
  marketCapLabel: '12k / 50k',
  momentum: 'warm' as const,
  momentumLabel: 'Momentum',
  holdersLabel: '420',
  tokenAgeLabel: '14j',
  recentActivityLabel: 'Calme',
  progressPercent: 24,
  creatorLabel: 'LaunchLab · R4V3',
  statusLabel: 'LIVE',
};

function mockRow(overrides: Partial<MarketAssetRow> = {}): MarketAssetRow {
  return {
    config: MARKET_ASSETS[1],
    price: '0,05 €',
    changePercent: 1.2,
    positive: true,
    volume: 'LaunchLab',
    favorite: true,
    createdAtMs: Date.now(),
    metrics: mockMetrics,
    ...overrides,
  };
}

describe('MarketPanelComponent', () => {
  let fixture: ComponentFixture<MarketPanelComponent>;
  let marketService: {
    loadAssetRows: ReturnType<typeof vi.fn>;
    loadFeaturedChart: ReturnType<typeof vi.fn>;
    readFavorites: ReturnType<typeof vi.fn>;
    writeFavorites: ReturnType<typeof vi.fn>;
    readSession: ReturnType<typeof vi.fn>;
    writeSession: ReturnType<typeof vi.fn>;
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
    pausePolling: ReturnType<typeof vi.fn>;
    resumePolling: ReturnType<typeof vi.fn>;
    freshnessLabel: ReturnType<typeof vi.fn>;
    getAlertThreshold: ReturnType<typeof vi.fn>;
    updateAlertThreshold: ReturnType<typeof vi.fn>;
    lastUpdatedAt: ReturnType<typeof signal<number>>;
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
      readSession: vi.fn(() => ({})),
      writeSession: vi.fn(),
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
      pausePolling: vi.fn(),
      resumePolling: vi.fn(),
      freshnessLabel: vi.fn(() => null),
      getAlertThreshold: vi.fn(() => 5),
      updateAlertThreshold: vi.fn(),
      lastUpdatedAt: signal(0),
      rateLimitCountdownLabel: vi.fn(() => null),
      rows: signal<MarketAssetRow[]>([mockRow()]),
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

  it('should create and render compact market toolbar', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.market-panel__search-input')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.market-panel__menu-btn')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('TOUS');
    expect(fixture.nativeElement.textContent).not.toContain('TRAD');
  });

  it('should initialize market data service', () => {
    expect(marketData.init).toHaveBeenCalled();
    expect(marketData.refreshAll).toHaveBeenCalledWith(true);
  });

  it('should open token drawer when a card is clicked', () => {
    const card = fixture.nativeElement.querySelector('.market-panel__row') as HTMLElement;
    card.click();
    fixture.detectChanges();
    expect(fixture.componentInstance['drawerRow']()?.config.exchangeToken).toBe('PXD');
    expect(fixture.nativeElement.querySelector('.market-token-drawer')).toBeTruthy();
  });

  it('should toggle history panel without hiding asset list', () => {
    expect(fixture.componentInstance['historyExpanded']()).toBe(false);
    fixture.componentInstance['toggleHistory']();
    fixture.detectChanges();
    expect(fixture.componentInstance['historyExpanded']()).toBe(true);
    expect(fixture.nativeElement.querySelector('.market-panel__list')).toBeTruthy();
  });

  it('should pin R4V3 first and sort others by creation date', () => {
    const r4v3 = mockRow({
      config: MARKET_ASSETS[0],
      createdAtMs: 1,
    });
    const older = mockRow({
      config: MARKET_ASSETS[1],
      createdAtMs: 100,
    });
    const newer = mockRow({
      config: MARKET_ASSETS[2],
      createdAtMs: 200,
    });
    marketData.rows.set([older, newer, r4v3]);
    fixture.detectChanges();

    const sorted = fixture.componentInstance['sortedRows']();
    expect(sorted[0]?.config.native).toBe(true);
    expect(sorted[1]?.config.exchangeToken).toBe('NVFI');
    expect(sorted[2]?.config.exchangeToken).toBe('PXD');
  });

  it('should sync featured asset when hub pair changes', () => {
    const brand = TestBed.inject(BrandCryptoSelectionService);
    brand.publishActiveExchangePair('R4V3', 'NVFI');
    fixture.detectChanges();
    expect(fixture.componentInstance['featuredAsset']().exchangeToken).toBe('NVFI');
  });
});
