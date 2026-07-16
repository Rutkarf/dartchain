import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { BlockchainApiService } from './blockchain-api.service';

describe('BlockchainApiService', () => {
  let service: BlockchainApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(BlockchainApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads health endpoint', () => {
    service.getHealth().subscribe((health) => {
      expect(health.ok).toBe(true);
      expect(health.service).toBe('dartchain-backend');
    });

    const request = httpMock.expectOne('/api/health');
    expect(request.request.method).toBe('GET');
    request.flush({ ok: true, service: 'dartchain-backend' });
  });

  it('loads blockchain blocks via modern alias', () => {
    service.getBlocks().subscribe((blocks) => {
      expect(blocks.length).toBe(1);
      expect(blocks[0].index).toBe(0);
    });

    const request = httpMock.expectOne('/api/blocks');
    expect(request.request.method).toBe('GET');
    request.flush([{ index: 0, hash: 'genesis', transactions: [] }]);
  });

  it('verifies wallet address and public key', () => {
    service
      .verifyWallet({
        address: 'wallet-address',
        publicKey: 'public-key',
      })
      .subscribe((response) => {
        expect(response.valid).toBe(true);
        expect(response.signingModel).toBe('client-ecdsa');
      });

    const request = httpMock.expectOne('/api/wallets/verify');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      address: 'wallet-address',
      publicKey: 'public-key',
    });
    request.flush({
      valid: true,
      address: 'wallet-address',
      publicKey: 'public-key',
      signingModel: 'client-ecdsa',
    });
  });

  it('loads blockchain stats via canonical route', () => {
    service.getStats().subscribe((stats) => {
      expect(stats.totalBlocks).toBe(2);
    });

    const request = httpMock.expectOne('/api/blockchain/stats');
    expect(request.request.method).toBe('GET');
    request.flush({ totalBlocks: 2, latestHash: 'abc', chainSize: 10 });
  });

  it('loads pending transactions via canonical route', () => {
    service.getPendingTransactions().subscribe((pending) => {
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe('tx-1');
    });

    const request = httpMock.expectOne('/api/pending-transactions');
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 'tx-1', amount: 1 }]);
  });

  it('searches explorer results', () => {
    service.searchExplorer('0').subscribe((response) => {
      expect(response.query).toBe('0');
      expect(response.results.length).toBe(1);
      expect(response.results[0].kind).toBe('BLOCK');
    });

    const request = httpMock.expectOne((req) => req.url.includes('/api/explorer/search'));
    expect(request.request.method).toBe('GET');
    request.flush({
      query: '0',
      results: [{ kind: 'BLOCK', blockIndex: 0, label: 'Genesis', subtitle: 'Block #0' }],
    });
  });

  it('returns empty explorer search for blank query', () => {
    service.searchExplorer('   ').subscribe((response) => {
      expect(response.query).toBe('');
      expect(response.results).toEqual([]);
    });

    httpMock.expectNone('/api/explorer/search');
  });

  it('loads wallet balance', () => {
    service.getBalance('dart1abc').subscribe((response) => {
      expect(response.balance).toBe('9');
    });

    const request = httpMock.expectOne('/api/blockchain/balance/dart1abc');
    request.flush({ balance: '9' });
  });

  it('loads peers and falls back to empty list on error', () => {
    service.getPeers().subscribe((peers) => {
      expect(peers).toEqual([]);
    });

    const request = httpMock.expectOne('/api/peers');
    request.flush('fail', { status: 500, statusText: 'Server Error' });
  });

  it('loads peer stats', () => {
    service.getPeerStats().subscribe((stats) => {
      expect(stats.active).toBe(2);
      expect(stats.total).toBe(3);
    });

    const request = httpMock.expectOne('/api/peers/stats');
    request.flush({ active: 2, total: 3 });
  });

  it('loads banner with default fallback', () => {
    service.getBanner().subscribe((banner) => {
      expect(banner.message1).toBe('DartChain');
    });

    const request = httpMock.expectOne('/api/banner');
    request.flush('fail', { status: 500, statusText: 'Server Error' });
  });

  it('filters explorer blocks with query params', () => {
    service
      .filterExplorerBlocks({ wallet: 'w1', from: 0, to: 10, limit: 5 })
      .subscribe((response) => {
        expect(response.blocks).toEqual([]);
      });

    const request = httpMock.expectOne((req) => req.url.includes('/api/explorer/blocks'));
    expect(request.request.params.get('wallet')).toBe('w1');
    expect(request.request.params.get('from')).toBe('0');
    request.flush({ blocks: [], total: 0 });
  });

  it('pings arbitrary API paths', () => {
    service.pingEndpoint('/health').subscribe((ok) => {
      expect(ok).toBe(true);
    });

    const request = httpMock.expectOne('/api/health');
    request.flush({ ok: true });
  });

  it('loads exchange panel snapshot', () => {
    service
      .getExchangePanel({ walletAddress: 'w1', fromToken: 'BTC', toToken: 'R4V3' })
      .subscribe((panel) => {
        expect(panel.fromToken).toBe('BTC');
      });

    const request = httpMock.expectOne('/api/exchange-panel?walletAddress=w1&fromToken=BTC&toToken=R4V3');
    expect(request.request.params.get('fromToken')).toBe('BTC');
    request.flush({
      fromToken: 'BTC',
      toToken: 'R4V3',
      rate: '1',
      balance: '0',
      feePercent: 0,
    });
  });
});
