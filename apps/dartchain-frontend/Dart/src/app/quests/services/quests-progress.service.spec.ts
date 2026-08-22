import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { QuestsProgressService } from '@quests/services/quests-progress.service';
import { WalletSessionService } from '@wallet/services/wallet-session.service';

describe('QuestsProgressService', () => {
  let service: QuestsProgressService;
  let httpMock: HttpTestingController;
  let walletSession: WalletSessionService;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(QuestsProgressService);
    httpMock = TestBed.inject(HttpTestingController);
    walletSession = TestBed.inject(WalletSessionService);

    for (const request of httpMock.match(() => true)) {
      if (request.request.url.includes('/api/showcase/launch/projects')) {
        request.flush([
          { id: '1', name: 'Lab', symbol: 'LAB1', status: 'LIVE', raised: '1k' },
        ]);
      }
    }
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    vi.useRealTimers();
  });

  it('recordFaucetClaim syncs from server when authenticated', async () => {
    localStorage.setItem('dartchain_auth_token', 'token');
    const refreshSpy = vi.spyOn(walletSession, 'requestBalanceRefresh');

    const pending = service.recordFaucetClaim();
    const stateRequest = httpMock.expectOne('/api/quests/state');
    stateRequest.flush({
      dayKey: '2026-01-01',
      tasks: {},
      exploredBlockIndices: [],
      missionClaimed: false,
      weeklyClaimed: false,
      totalXp: 0,
      pendingMts: 0,
    });

    await pending;
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('recordSwap ignores standard token pairs', async () => {
    const refreshSpy = vi.spyOn(walletSession, 'requestBalanceRefresh');

    await service.recordSwap('BTC', 'R4V3');

    expect(refreshSpy).not.toHaveBeenCalled();
    httpMock.expectNone('/api/quests/progress');
  });

  it('notify clears feedback after timeout', () => {
    service.notify('Hello', 'success');
    expect(service.feedback()?.message).toBe('Hello');

    vi.advanceTimersByTime(2800);
    expect(service.feedback()).toBeNull();
  });
});
