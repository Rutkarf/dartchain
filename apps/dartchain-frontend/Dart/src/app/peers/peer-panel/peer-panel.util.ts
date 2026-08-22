import { PeerStatus, PeerView } from '../../core/services/blockchain-api.service';
import { PeerNetworkStats, PeerRowView } from './peer-panel.model';

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function parsePeerEndpoint(url: string): { nodeName: string; endpoint: string } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname || 'unknown';
    const port = parsed.port || (parsed.protocol === 'wss:' ? '443' : '80');
    const endpoint = `${host}:${port}`;
    const suffix = String((hashString(url) % 99) + 1).padStart(2, '0');
    const nodeName = `R4V3-Node-${suffix}`;
    return { nodeName, endpoint };
  } catch {
    const trimmed = url.trim();
    const suffix = String((hashString(trimmed) % 99) + 1).padStart(2, '0');
    return {
      nodeName: `R4V3-Node-${suffix}`,
      endpoint: trimmed.length > 24 ? `${trimmed.slice(0, 24)}…` : trimmed,
    };
  }
}

/** Legacy fallback (Phase U conserve ce comportement si l'API ne fournit pas latencyMs). */
export function derivePeerLatencyMs(url: string, status: PeerStatus): number | null {
  if (status === 'DISCONNECTED' || status === 'ERROR') {
    return null;
  }

  if (status === 'CONNECTING') {
    return hashString(url) % 20 + 60;
  }

  return hashString(url) % 44 + 28;
}

/** Legacy fallback (Phase U conserve ce comportement si l'API ne fournit pas syncPercent). */
export function derivePeerSyncPercent(status: PeerStatus): number {
  switch (status) {
    case 'CONNECTED':
      return 100;
    case 'CONNECTING':
      return 88;
    case 'DISCONNECTED':
      return 72;
    case 'ERROR':
      return 65;
  }
}

/** Legacy fallback (Phase U conserve ce comportement si l'API ne fournit pas activityPoints). */
export function buildActivityPoints(url: string, status: PeerStatus): readonly number[] {
  const seed = hashString(`${url}:${status}`);
  const points: number[] = [];
  let value = (seed % 40) + 20;

  for (let index = 0; index < 8; index += 1) {
    const delta = ((seed >> index) % 17) - 8;
    value = Math.max(8, Math.min(36, value + delta));
    points.push(value);
  }

  return points;
}

function resolveLatencyMs(peer: PeerView): { value: number | null; estimated: boolean } {
  if (peer.latencyMs !== undefined && peer.latencyMs !== null) {
    return { value: peer.latencyMs, estimated: false };
  }

  return { value: derivePeerLatencyMs(peer.url, peer.status), estimated: true };
}

function resolveSyncPercent(peer: PeerView): { value: number; estimated: boolean } {
  if (peer.syncPercent !== undefined && peer.syncPercent !== null) {
    return { value: peer.syncPercent, estimated: false };
  }

  return { value: derivePeerSyncPercent(peer.status), estimated: true };
}

function resolveActivityPoints(peer: PeerView): { points: readonly number[]; estimated: boolean } {
  if (peer.activityPoints && peer.activityPoints.length > 0) {
    return { points: peer.activityPoints, estimated: false };
  }

  return { points: buildActivityPoints(peer.url, peer.status), estimated: true };
}

export function buildPeerRowView(
  peer: PeerView,
  favorites: ReadonlySet<string>
): PeerRowView {
  const { nodeName, endpoint } = parsePeerEndpoint(peer.url);
  const latency = resolveLatencyMs(peer);
  const sync = resolveSyncPercent(peer);
  const activity = resolveActivityPoints(peer);

  return {
    url: peer.url,
    status: peer.status,
    message: peer.message,
    nodeName,
    endpoint,
    latencyMs: latency.value,
    latencyLabel: latency.value === null ? '—' : `${latency.value} ms`,
    latencyEstimated: latency.estimated,
    syncPercent: sync.value,
    syncLabel: `${sync.value}%`,
    syncEstimated: sync.estimated,
    activityPoints: activity.points,
    activityEstimated: activity.estimated,
    chainHeight: peer.chainHeight ?? null,
    localChainHeight: peer.localChainHeight ?? null,
    lastSyncAt: peer.lastSyncAt ?? null,
    isFavorite: favorites.has(peer.url),
  };
}

export function buildNetworkStats(
  peers: readonly PeerView[],
  statsTotal: number | null,
  measuredLatencyMs: number | null,
  serverAvgLatencyMs?: number | null,
  serverNetworkLoadPercent?: number | null
): PeerNetworkStats {
  const connected = peers.filter((peer) => peer.status === 'CONNECTED');
  const latencies = connected
    .map((peer) => resolveLatencyMs(peer).value)
    .filter((value): value is number => value !== null);

  const avgLatencyMs =
    serverAvgLatencyMs !== undefined && serverAvgLatencyMs !== null
      ? serverAvgLatencyMs
      : latencies.length > 0
        ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
        : measuredLatencyMs;

  // Source of truth = peers enregistrés. Ne pas gonfler avec stats WS (sessions UI / loopback).
  const networkPeers = peers.length > 0 ? peers.length : Math.max(statsTotal ?? 0, 0);
  const computedLoadPercent =
    networkPeers === 0
      ? 0
      : Math.round((connected.length / networkPeers) * 100);

  const networkLoadPercent =
    serverNetworkLoadPercent !== undefined && serverNetworkLoadPercent !== null
      ? serverNetworkLoadPercent
      : Math.max(computedLoadPercent, connected.length > 0 ? 12 : 0);

  return {
    networkPeers,
    avgLatencyMs,
    networkLoadPercent,
  };
}

export function activityPolyline(points: readonly number[], width = 34, height = 14): string {
  if (!points.length) {
    return '';
  }

  const step = width / Math.max(points.length - 1, 1);
  return points
    .map((point, index) => {
      const x = (index * step).toFixed(1);
      const y = (height - point * 0.35).toFixed(1);
      return `${index === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
}

export function statusDisplayLabel(status: PeerStatus): string {
  switch (status) {
    case 'CONNECTED':
      return 'CONNECTED';
    case 'CONNECTING':
      return 'CONNECTING';
    case 'DISCONNECTED':
      return 'DISCONNECTED';
    case 'ERROR':
      return 'ERROR';
  }
}

export function statusToneClass(status: PeerStatus): string {
  switch (status) {
    case 'CONNECTED':
      return 'is-connected';
    case 'CONNECTING':
      return 'is-connecting';
    case 'ERROR':
      return 'is-error';
    case 'DISCONNECTED':
      return 'is-disconnected';
  }
}
