import { PeerView } from '@blockchain/services/blockchain-api.service';
import {
  buildActivityPoints,
  buildNetworkStats,
  buildPeerRowView,
  derivePeerLatencyMs,
  derivePeerSyncPercent,
} from './peer-panel.util';

describe('peer-panel.util (Phase U)', () => {
  const connectedPeer: PeerView = {
    url: 'ws://127.0.0.1:8080/ws/peers',
    status: 'CONNECTED',
    message: 'Connecté',
  };

  it('prefers server latency over legacy derivation', () => {
    const row = buildPeerRowView(
      { ...connectedPeer, latencyMs: 42 },
      new Set()
    );

    expect(row.latencyMs).toBe(42);
    expect(row.latencyLabel).toBe('42 ms');
  });

  it('falls back to legacy latency when server value is absent', () => {
    const row = buildPeerRowView(connectedPeer, new Set());
    const legacy = derivePeerLatencyMs(connectedPeer.url, connectedPeer.status);

    expect(row.latencyMs).toBe(legacy);
  });

  it('prefers server syncPercent over legacy derivation', () => {
    const row = buildPeerRowView(
      { ...connectedPeer, syncPercent: 73 },
      new Set()
    );

    expect(row.syncPercent).toBe(73);
    expect(row.syncLabel).toBe('73%');
  });

  it('falls back to legacy syncPercent when server value is absent', () => {
    const row = buildPeerRowView(connectedPeer, new Set());

    expect(row.syncPercent).toBe(derivePeerSyncPercent('CONNECTED'));
  });

  it('prefers server activityPoints over legacy derivation', () => {
    const points = [10, 12, 14, 16, 18, 20, 22, 24] as const;
    const row = buildPeerRowView(
      { ...connectedPeer, activityPoints: points },
      new Set()
    );

    expect(row.activityPoints).toEqual(points);
  });

  it('falls back to legacy activityPoints when server value is absent', () => {
    const row = buildPeerRowView(connectedPeer, new Set());
    const legacy = buildActivityPoints(connectedPeer.url, connectedPeer.status);

    expect(row.activityPoints).toEqual(legacy);
  });

  it('uses server network stats when provided', () => {
    const stats = buildNetworkStats(
      [{ ...connectedPeer, latencyMs: 30 }],
      2,
      null,
      30,
      88
    );

    expect(stats.avgLatencyMs).toBe(30);
    expect(stats.networkLoadPercent).toBe(88);
    // Liste peers = source of truth (ne pas gonfler à 2 via statsTotal)
    expect(stats.networkPeers).toBe(1);
  });

  it('falls back to statsTotal only when peer list is empty', () => {
    const stats = buildNetworkStats([], 3, null, null, null);
    expect(stats.networkPeers).toBe(3);
  });
});
