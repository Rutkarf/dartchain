import { PeerStatus, PeerView } from '@blockchain/services/blockchain-api.service';
import { PeerFilter, PeerRowView } from './peer-panel.model';

export const PEER_FAVORITES_STORAGE_KEY = 'dart_peer_favorites_v1';
export const PEER_AUTO_REFRESH_MS = 45_000;

export const PEER_FILTER_IDS: readonly PeerFilter[] = ['all', 'connected', 'favorites'];

export function normalizePeerView(peer: PeerView): PeerView {
  return {
    url: peer.url.trim(),
    status: normalizePeerStatus(peer.status),
    message: (peer.message ?? '').toString(),
    latencyMs: peer.latencyMs,
    syncPercent: peer.syncPercent,
    activityPoints: peer.activityPoints,
    chainHeight: peer.chainHeight,
    localChainHeight: peer.localChainHeight,
    lastSyncAt: peer.lastSyncAt,
  };
}

export function normalizePeerStatus(status: unknown): PeerStatus {
  switch (status) {
    case 'CONNECTING':
    case 'CONNECTED':
    case 'DISCONNECTED':
    case 'ERROR':
      return status;
    default:
      return 'DISCONNECTED';
  }
}

export function deduplicatePeers(peers: readonly PeerView[]): PeerView[] {
  return peers.filter(
    (peer, index, array) => array.findIndex((candidate) => candidate.url === peer.url) === index
  );
}
