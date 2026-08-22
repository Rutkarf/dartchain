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
  latencyEstimated: boolean;
  syncPercent: number;
  syncLabel: string;
  syncEstimated: boolean;
  activityPoints: readonly number[];
  activityEstimated: boolean;
  chainHeight: number | null;
  localChainHeight: number | null;
  lastSyncAt: string | null;
  isFavorite: boolean;
}

export interface PeerNetworkStats {
  networkPeers: number;
  avgLatencyMs: number | null;
  networkLoadPercent: number;
}
