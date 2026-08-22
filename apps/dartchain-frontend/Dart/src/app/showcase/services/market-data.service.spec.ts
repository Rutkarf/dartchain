import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { MarketDataService } from '@showcase/services/market-data.service';
import { MarketPanelService } from '@showcase/components/market-panel/market-panel.service';
import { MARKET_ASSETS } from '@showcase/components/market-panel/market-panel.constants';

describe('MarketDataService', () => {
  let service: MarketDataService;
  let marketPanelService: {
    loadAssetRows: ReturnType<typeof vi.fn>;
    loadFeaturedChart: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    marketPanelService = {
      loadAssetRows: vi.fn(() =>
        of([
          {
            config: MARKET_ASSETS[0],
            price: '0,12 €',
            changePercent: 2,
            positive: true,
            volume: '1M',
            favorite: false,
          },
        ])
      ),
      loadFeaturedChart: vi.fn(() =>
        of({
          price: '0,12 €',
          changePercent: 2,
          positive: true,
          prices: [1, 2, 3],
        })
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        MarketDataService,
        { provide: MarketPanelService, useValue: marketPanelService },
      ],
    });

    service = TestBed.inject(MarketDataService);
    service.configureContext(new Set(), '', MARKET_ASSETS[0], '24h');
  });

  afterEach(() => {
    service.destroy();
  });

  it('should refresh rows from market panel service', async () => {
    await service.refreshRows(true);
    expect(marketPanelService.loadAssetRows).toHaveBeenCalled();
    expect(service.rows().length).toBe(1);
    expect(service.error()).toBeNull();
  });

  it('should apply rate limit backoff on 429', async () => {
    marketPanelService.loadAssetRows.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 429 }))
    );

    await service.refreshRows(true);
    expect(service.rateLimitedUntil()).toBeGreaterThan(Date.now());
    expect(service.error()).toContain('Trop de requêtes');
  });

  it('should persist recent trades from swap event', () => {
    service.init();
    window.dispatchEvent(
      new CustomEvent('market-swap-complete', {
        detail: {
          fromToken: 'R4V3',
          toToken: 'PXD',
          amountIn: 10,
          amountOut: 200,
        },
      })
    );

    expect(service.recentTrades().length).toBe(1);
    expect(service.recentTrades()[0].toToken).toBe('PXD');
  });
});
