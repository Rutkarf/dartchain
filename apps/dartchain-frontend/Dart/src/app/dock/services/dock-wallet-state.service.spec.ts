import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DockWalletStateService } from './dock-wallet-state.service';
import { WalletSessionService } from '@wallet/services/wallet-session.service';

describe('DockWalletStateService', () => {
  let service: DockWalletStateService;
  let httpMock: HttpTestingController;
  let walletSession: WalletSessionService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(DockWalletStateService);
    httpMock = TestBed.inject(HttpTestingController);
    walletSession = TestBed.inject(WalletSessionService);
  });

  afterEach(() => {
    walletSession.clearWallet();
    httpMock.match(() => true).forEach((request) => {
      try {
        request.flush(request.request.method === 'GET' ? {} : {});
      } catch {
        // already handled
      }
    });
    httpMock.verify();
  });

  it('stays disconnected without a wallet', () => {
    expect(service.phase()).toBe('disconnected');
    expect(service.headline()).toContain('Créer ou importer');
  });

  it('loads balance when a wallet address is set', async () => {
    walletSession.setWallet({
      address: 'dart1abc',
      publicKey: 'pub',
      privateKey: 'priv',
    });

    const pending = service.load();
    const request = httpMock.expectOne('/api/blockchain/balance/dart1abc');
    request.flush({ balance: '12.5' });
    await pending;

    expect(service.phase()).toBe('ready');
    expect(service.balance()).toBe('12.5');
    expect(service.headline()).toContain('12,50000000000000000000000000 R4V3');
  });

  it('marks error when balance fetch fails', async () => {
    walletSession.setWallet({
      address: 'dart1fail',
      publicKey: 'pub',
      privateKey: 'priv',
    });

    const pending = service.load();
    const request = httpMock.expectOne('/api/blockchain/balance/dart1fail');
    request.flush('fail', { status: 500, statusText: 'Server Error' });
    await pending;

    expect(service.phase()).toBe('error');
    expect(service.balance()).toBeNull();
  });
});
