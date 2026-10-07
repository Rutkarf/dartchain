import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PeerDetailDrawerComponent } from './peer-detail-drawer';
import { LocaleService } from '../../core/i18n/locale.service';
import { PeerRowView } from '../peer-panel/peer-panel.model';

describe('PeerDetailDrawerComponent', () => {
  let fixture: ComponentFixture<PeerDetailDrawerComponent>;
  let component: PeerDetailDrawerComponent;

  const peer: PeerRowView = {
    url: 'ws://127.0.0.1:8082/ws/peers',
    status: 'CONNECTED',
    message: 'ok',
    nodeName: 'Node A',
    endpoint: 'ws://127.0.0.1:8082/ws/peers',
    latencyMs: 42,
    latencyLabel: '42 ms',
    latencyEstimated: false,
    syncPercent: 100,
    syncLabel: '100%',
    syncEstimated: false,
    activityPoints: [1, 2, 3],
    activityEstimated: false,
    chainHeight: 12,
    localChainHeight: 12,
    lastSyncAt: '2026-08-22T12:00:00.000Z',
    isFavorite: false,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeerDetailDrawerComponent],
      providers: [LocaleService],
    }).compileComponents();

    fixture = TestBed.createComponent(PeerDetailDrawerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('peer', peer);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('maps status labels through locale', () => {
    expect(component.statusLabel('CONNECTED')).toBeTruthy();
    expect(component.statusLabel('ERROR')).toBeTruthy();
  });

  it('formats last sync for valid ISO timestamps', () => {
    expect(component.formatLastSync(peer.lastSyncAt)).not.toBe('—');
    expect(component.formatLastSync(null)).toBe('—');
    expect(component.formatLastSync('not-a-date')).toBe('not-a-date');
  });

  it('formats chain height as local / remote', () => {
    expect(component.chainHeightLabel(peer)).toBe('12 / 12');
    expect(
      component.chainHeightLabel({ ...peer, chainHeight: null, localChainHeight: null }),
    ).toBe('—');
  });

  it('emits close on escape when open', () => {
    const closeSpy = vi.fn();
    fixture.componentInstance.close.subscribe(closeSpy);

    component.onEscape();

    expect(closeSpy).toHaveBeenCalled();
  });
});
