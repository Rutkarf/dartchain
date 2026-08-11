import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { AuthService } from '../../core/services/auth.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { PeersDataService } from '../../core/services/peers-data.service';
import { PeerPanelComponent } from './peer-panel';

describe('PeerPanelComponent', () => {
  let fixture: ComponentFixture<PeerPanelComponent>;
  let api: {
    getPeers: ReturnType<typeof vi.fn>;
    getPeerStats: ReturnType<typeof vi.fn>;
    getHealth: ReturnType<typeof vi.fn>;
    addPeer: ReturnType<typeof vi.fn>;
    reconnectPeer: ReturnType<typeof vi.fn>;
    disconnectPeer: ReturnType<typeof vi.fn>;
    connectLiveUpdates: ReturnType<typeof vi.fn>;
  };
  let auth: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    promptLogin: ReturnType<typeof vi.fn>;
  };
  let peersData: {
    init: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    scheduleRefresh: ReturnType<typeof vi.fn>;
    refreshAll: ReturnType<typeof vi.fn>;
    rateLimitCountdownLabel: ReturnType<typeof vi.fn>;
    peers: ReturnType<typeof signal>;
    statsTotal: ReturnType<typeof signal>;
    measuredLatencyMs: ReturnType<typeof signal>;
    serverAvgLatencyMs: ReturnType<typeof signal>;
    serverNetworkLoadPercent: ReturnType<typeof signal>;
    loading: ReturnType<typeof signal>;
    error: ReturnType<typeof signal>;
  };

  beforeEach(async () => {
    api = {
      getPeers: vi.fn(),
      getPeerStats: vi.fn(),
      getHealth: vi.fn(),
      addPeer: vi.fn(),
      reconnectPeer: vi.fn(),
      disconnectPeer: vi.fn(() =>
        of({
          ok: true,
          peer: 'ws://localhost:8080/ws/peers',
          status: 'DISCONNECTED',
        })
      ),
      connectLiveUpdates: vi.fn(() => of()),
    };

    auth = {
      isAuthenticated: vi.fn(() => true),
      promptLogin: vi.fn(() => true),
    };

    peersData = {
      init: vi.fn(),
      destroy: vi.fn(),
      scheduleRefresh: vi.fn(),
      refreshAll: vi.fn(async () => undefined),
      rateLimitCountdownLabel: vi.fn(() => null),
      peers: signal([
        {
          url: 'ws://localhost:8080/ws/peers',
          status: 'CONNECTED',
          message: '',
        },
      ]),
      statsTotal: signal(1),
      measuredLatencyMs: signal(12),
      serverAvgLatencyMs: signal(42),
      serverNetworkLoadPercent: signal(55),
      loading: signal(false),
      error: signal<'load' | 'stats' | 'rate-limit' | null>(null),
    };

    await TestBed.configureTestingModule({
      imports: [PeerPanelComponent],
      providers: [
        LocaleService,
        { provide: BlockchainApiService, useValue: api },
        { provide: AuthService, useValue: auth },
        { provide: PeersDataService, useValue: peersData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PeerPanelComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and initialize peers data service', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(peersData.init).toHaveBeenCalled();
  });

  it('renders compact header without title and always-visible connect row', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.peer-panel__title')).toBeNull();
    expect(element.querySelector('.peer-panel__connect')).toBeTruthy();
    expect(element.querySelector('.peer-panel__connect-input')).toBeTruthy();
    expect(element.querySelector('.peer-panel__connect-add')).toBeNull();
    expect(element.querySelector('.peer-panel__connect-btn')).toBeTruthy();
    expect(element.textContent).toContain('1/1');
    expect(element.querySelector('.peer-panel.ds-surface')).toBeTruthy();
  });

  it('connects or reconnects peer via Connecter button', () => {
    api.reconnectPeer.mockReturnValue(
      of({
        ok: true,
        peer: 'ws://localhost:8080/ws/peers',
        status: 'CONNECTED',
      })
    );

    const form = (fixture.nativeElement as HTMLElement).querySelector(
      '.peer-panel__connect'
    ) as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(api.reconnectPeer).toHaveBeenCalledWith('ws://localhost:8080/ws/peers');
  });

  it('adds a new peer url via Connecter', () => {
    api.addPeer.mockReturnValue(
      of({
        ok: true,
        peer: 'wss://peer.example/ws',
        status: 'CONNECTING',
      })
    );
    fixture.componentInstance['peerInput'].set('wss://peer.example/ws');
    fixture.detectChanges();

    const form = (fixture.nativeElement as HTMLElement).querySelector(
      '.peer-panel__connect'
    ) as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(api.addPeer).toHaveBeenCalledWith('wss://peer.example/ws');
  });

  it('shows error banner when peers data service reports load error', () => {
    peersData.error.set('load');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Impossible de charger les peers');
  });

  it('filters favorites from integrated search bar', () => {
    peersData.peers.set([
      { url: 'ws://a.test/ws', status: 'CONNECTED', message: '' },
      { url: 'ws://b.test/ws', status: 'DISCONNECTED', message: '' },
    ]);
    fixture.detectChanges();

    const favButton = (fixture.nativeElement as HTMLElement).querySelector(
      '.peer-panel__search-fav'
    ) as HTMLButtonElement;
    fixture.componentInstance['favorites'].set(new Set(['ws://a.test/ws']));
    favButton.click();
    fixture.detectChanges();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('.peer-panel__row');
    expect(rows.length).toBe(1);
  });

  it('opens peer detail drawer on row click', () => {
    const mainButton = (fixture.nativeElement as HTMLElement).querySelector(
      '.peer-panel__row-main'
    ) as HTMLButtonElement;
    mainButton?.click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.drawer')).toBeTruthy();
  });

  it('disconnects peer via action button', () => {
    const disconnectButton = (fixture.nativeElement as HTMLElement).querySelector(
      '.peer-panel__action--disconnect'
    ) as HTMLButtonElement;
    disconnectButton?.click();
    fixture.detectChanges();

    expect(api.disconnectPeer).toHaveBeenCalledWith('ws://localhost:8080/ws/peers');
  });
});
