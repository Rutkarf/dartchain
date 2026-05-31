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
  });

  afterEach(() => {
    httpMock.verify();
  });

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
        fromToken: 'BTC',
        toToken: 'R4V3',
        availableTokens: ['R4V3', 'BTC'],
        fromBalance: overrides.fromBalance ?? 0,
        toBalance: overrides.toBalance ?? 0,
        rate: overrides.rate ?? 48000,
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
    expect((component as any).swapButtonLabel()).toBe('Wallet');
  });

  it('computes estimated To amount from rate', () => {
    flushPanel({ rate: 100, fromBalance: 1 });
    component['amountValue'].set('0.5');
    expect((component as any).estimatedTo()).toBe(50);
    expect((component as any).formattedEstimatedTo()).toContain('50');
  });

  it('opens wallet dock when clicking create wallet', () => {
    flushPanel();
    const spy = vi.spyOn(nav, 'dispatchNewsAction');
    component['onSwapClick']();
    expect(spy).toHaveBeenCalledWith('OPEN_WALLET');
  });

  it('syncs from token when rate panel requests exchange symbol', () => {
    flushPanel();
    brandCrypto.selectForExchange('ETH');
    fixture.detectChanges();
    flushPanel({ fromBalance: 0.1 });
    expect((component as any).fromToken()).toBe('ETH');
  });

  it('flips token pair', () => {
    flushPanel();
    component['flipPair']();
    expect((component as any).fromToken()).toBe('R4V3');
    expect((component as any).toToken()).toBe('BTC');
  });

  it('executes swap and refreshes ecosystem', () => {
    walletSession.setWallet({
      address: 'abc123456789',
      publicKey: 'pub',
      privateKey: 'priv',
    });
    fixture.detectChanges();
    flushPanel({ fromBalance: 0.001, rate: 50000 });

    const refreshSpy = vi.spyOn(walletSession, 'requestBalanceRefresh');
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    component['fromBalance'].set(0.001);
    component['amountValue'].set('0.001');
    component['amountForm'].controls.amount.setValue('0.001');
    fixture.detectChanges();

    expect((component as any).walletAddress()).toBe('abc123456789');
    expect((component as any).parsedAmount()).toBe(0.001);

    component['executeSwap']();

    const swapReq = httpMock.expectOne((request) =>
      request.url.includes('/exchange-panel/swap')
    );
    swapReq.flush({
      fromToken: 'BTC',
      toToken: 'R4V3',
      rate: 50000,
      amountIn: 0.001,
      amountOut: 50,
      fromBalance: 0,
      toBalance: 50,
      message: 'Swap testnet réussi',
    });

    expect(refreshSpy).toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalled();
    expect((component as any).showSuccessToast()).toBe(true);
  });
});
