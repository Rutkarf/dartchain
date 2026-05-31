import { PeerStatus } from '../../core/services/blockchain-api.service';

export type PeerFilter = 'all' | 'connected' | 'favorites';

export interface PeerRowView {
  url: string;
  status: PeerStatus;
  message: string;
  nodeName: string;
  endpoint: string;
  latencyMs: number | null;
  latencyLabel: string;
  syncPercent: number;
  syncLabel: string;
  activityPoints: readonly number[];
  isFavorite: boolean;
}

export interface PeerNetworkStats {
  networkPeers: number;
  avgLatencyMs: number | null;
  networkLoadPercent: number;
}
