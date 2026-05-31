import { PeerFilter } from './peer-panel.model';

export const PEER_FAVORITES_STORAGE_KEY = 'dart_peer_favorites_v1';

export const PEER_FILTER_OPTIONS: ReadonlyArray<{ id: PeerFilter; label: string }> = [
  { id: 'all', label: 'ALL' },
  { id: 'connected', label: 'CONNECTED' },
  { id: 'favorites', label: 'FAVORITES' },
];
