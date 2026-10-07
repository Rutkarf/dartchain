import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { BlockchainApiService } from '@blockchain/services/blockchain-api.service';
import { PeersDataService } from '@peers/services/peers-data.service';

describe('PeersDataService', () => {
  let service: PeersDataService;
  let api: {
    getPeers: ReturnType<typeof vi.fn>;
    getPeerStats: ReturnType<typeof vi.fn>;
    getHealth: ReturnType<typeof vi.fn>;
    connectLiveUpdates: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      getPeers: vi.fn(() =>
        of([
          {
            url: 'ws://localhost:8080/ws/peers',
            status: 'CONNECTED',
            message: '',
          },
        ])
      ),
      getPeerStats: vi.fn(() =>
        of({
          total: 1,
          active: 1,
          avgLatencyMs: 42,
          networkLoadPercent: 55,
        })
      ),
      getHealth: vi.fn(() => of({ ok: true, service: 'dartchain' })),
      connectLiveUpdates: vi.fn(() => of()),
    };

    TestBed.configureTestingModule({
      providers: [PeersDataService, { provide: BlockchainApiService, useValue: api }],
    });

    service = TestBed.inject(PeersDataService);
  });

  it('loads peers and stats on refreshAll', async () => {
    await service.refreshAll(true);

    expect(api.getPeers).toHaveBeenCalled();
    expect(api.getPeerStats).toHaveBeenCalled();
    expect(service.peers().length).toBe(1);
    expect(service.statsTotal()).toBe(1);
    expect(service.error()).toBeNull();
  });

  it('sets load error when peers request fails', async () => {
    api.getPeers.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));

    await service.refreshAll(true);

    expect(service.error()).toBe('load');
  });

  it('sets rate-limit error on 429', async () => {
    api.getPeers.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 429 })));

    await service.refreshAll(true);

    expect(service.error()).toBe('rate-limit');
    expect(service.rateLimitCountdownLabel()).toMatch(/\d+s/);
  });

  it('applies peers from live snapshot payload', () => {
    service.applyPeersFromLiveUpdate([
      { url: 'ws://a.test/ws', status: 'ERROR', message: 'down' },
    ]);

    expect(service.peers()[0]?.url).toBe('ws://a.test/ws');
    expect(service.peers()[0]?.status).toBe('ERROR');
  });
});
