import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandCryptoSelectionService } from '../../core/services/brand-crypto-selection.service';
import { ShowcaseNavigationService } from '../../core/services/showcase-navigation.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';
import { ExchangePanelComponent } from './exchange-panel';

describe('ExchangePanelComponent', () => {
  let component: ExchangePanelComponent;
  let fixture: ComponentFixture<ExchangePanelComponent>;
  let httpMock: HttpTestingController;
  let walletSession: WalletSessionService;
  let nav: ShowcaseNavigationService;
  let brandCrypto: BrandCryptoSelectionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExchangePanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ExchangePanelComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    walletSession = TestBed.inject(WalletSessionService);
    nav = TestBed.inject(ShowcaseNavigationService);
    brandCrypto = TestBed.inject(BrandCryptoSelectionService);
    fixture.detectChanges();
    flushBackgroundHttp();
  });

  afterEach(() => {
    walletSession.clearWallet();
    flushBackgroundHttp();
    flushExchangePanelRequests();
    httpMock.verify();
  });

  function flushBackgroundHttp(): void {
    httpMock
      .match((request) => request.url.includes('/showcase/launch/projects'))
      .forEach((request) => request.flush([]));

    httpMock
      .match((request) => request.url.includes('/crypto-rates/chart'))
      .forEach((request) =>
        request.flush({
          symbol: 'R4V3',
          range: '24h',
          currency: 'usd',
          low: '100',
          high: '110',
          points: [{ t: 1, v: 0.5 }],
        })
      );
  }

  function flushExchangePanelRequests(
    overrides: Partial<{
      fromBalance: number;
      toBalance: number;
      rate: number;
    }> = {}
  ): void {
    httpMock
      .match(
        (request) =>
          request.url.includes('/exchange-panel') && request.method === 'GET'
      )
      .forEach((request) =>
        request.flush({
          fromToken: 'R4V3',
          toToken: 'PXD',
          availableTokens: ['R4V3', 'PXD', 'NVFI', 'LAB3', 'ORB'],
          fromBalance: overrides.fromBalance ?? 0,
          toBalance: overrides.toBalance ?? 0,
          rate: overrides.rate ?? 20,
          testnet: true,
        })
      );
  }

  function flushPanel(
    overrides: Partial<{
      fromBalance: number;
      toBalance: number;
      rate: number;
    }> = {}
  ): void {
    const pending = httpMock.match((request) =>
      request.url.includes('/exchange-panel') && request.method === 'GET'
    );
    expect(pending.length).toBeGreaterThan(0);
    pending.forEach((req) =>
      req.flush({
        fromToken: 'R4V3',
        toToken: 'PXD',
        availableTokens: ['R4V3', 'PXD', 'NVFI', 'LAB3', 'ORB'],
        fromBalance: overrides.fromBalance ?? 0,
        toBalance: overrides.toBalance ?? 0,
        rate: overrides.rate ?? 20,
        testnet: true,
      })
    );
  }

  it('should create', () => {
    flushPanel();
    expect(component).toBeTruthy();
  });

  it('shows create wallet label when no wallet', () => {
    flushPanel();
    expect((component as any).swapButtonLabel()).toBe('+ Wallet');
  });

  it('computes estimated To amount from rate', () => {
    flushPanel({ rate: 20, fromBalance: 10 });
    component['amountValue'].set('0.5');
    expect((component as any).estimatedTo()).toBe(10);
    expect((component as any).formattedEstimatedTo()).toContain('10');
  });

  it('opens wallet dock when clicking create wallet', () => {
    flushPanel();
    const spy = vi.spyOn(nav, 'dispatchNewsAction');
    component['onSwapClick']();
    expect(spy).toHaveBeenCalledWith('OPEN_WALLET');
  });

  it('syncs launch token when rate panel requests exchange symbol', () => {
    flushPanel();
    brandCrypto.selectForExchange('PXD');
    fixture.detectChanges();
    flushPanel({ fromBalance: 100 });
    expect((component as any).fromToken()).toBe('R4V3');
    expect((component as any).toToken()).toBe('PXD');
  });

  it('selects launch chip as destination only', () => {
    flushPanel();
    component['selectLaunchChip']('PXD');
    flushPanel();
    expect((component as any).fromToken()).toBe('R4V3');
    expect((component as any).toToken()).toBe('PXD');
    component['selectLaunchChip']('PXD');
    flushPanel();
    expect((component as any).fromToken()).toBe('R4V3');
    expect((component as any).toToken()).toBe('PXD');
  });

  it('executes swap and refreshes ecosystem', () => {
    walletSession.setWallet({
      address: 'abc123456789',
      publicKey: 'pub',
      privateKey: 'priv',
    });
    fixture.detectChanges();
    flushPanel({ fromBalance: 10, rate: 20 });
    flushExchangePanelRequests({ fromBalance: 10, rate: 20 });

    const refreshSpy = vi.spyOn(walletSession, 'requestBalanceRefresh');
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    component['fromBalance'].set(10);
    component['amountValue'].set('1');
    component['amountForm'].controls.amount.setValue('1');
    fixture.detectChanges();

    expect((component as any).walletAddress()).toBe('abc123456789');
    expect((component as any).parsedAmount()).toBe(1);

    component['executeSwap']();

    const swapReq = httpMock.expectOne((request) =>
      request.url.includes('/exchange-panel/swap')
    );
    swapReq.flush({
      fromToken: 'R4V3',
      toToken: 'PXD',
      rate: 20,
      amountIn: 1,
      amountOut: 20,
      fromBalance: 9,
      toBalance: 20,
      message: 'Swap testnet réussi',
    });

    expect(refreshSpy).toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalled();
    expect((component as any).showSuccessToast()).toBe(true);
  });
});
