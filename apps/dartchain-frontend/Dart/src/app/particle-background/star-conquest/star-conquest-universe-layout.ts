import type { StarConquestPeerLayout } from './star-conquest-universe.types';
import { STAR_CONQUEST_SCALE } from './star-conquest-scale';

export interface PeerLayoutInput {
  seed: string;
  index: number;
  total: number;
  syncPercent?: number | null;
  latencyMs?: number | null;
  chainHeight?: number | null;
}

export interface PeerLayoutResult {
  x: number;
  y: number;
  z: number;
}

function hashFloat(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ((h >>> 0) % 10000) / 10000;
}

/** Position P2P selon l’univers actif — aucune coordonnée géo réelle. */
export function layoutPeerForUniverse(
  kind: StarConquestPeerLayout,
  input: PeerLayoutInput
): PeerLayoutResult {
  const s = STAR_CONQUEST_SCALE.layout;
  const h = hashFloat(input.seed);
  const h2 = hashFloat(input.seed + ':b');
  const sync = (input.syncPercent ?? 50) / 100;
  const lat = input.latencyMs ?? 80;

  switch (kind) {
    case 'orbital-rings': {
      const ring = Math.floor(h * 3);
      const radius = (18 + ring * 14 + (1 - sync) * 8) * s;
      const angle =
        (input.index / Math.max(input.total, 1)) * Math.PI * 2 + h * Math.PI * 2;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: -10 - ring * 6 - lat * 0.008,
      };
    }
    case 'spiral':
    case 'galaxy-spiral': {
      const t = input.index / Math.max(input.total, 1);
      const arms = 5;
      const arm = input.index % arms;
      const angle = t * Math.PI * 4 + (arm / arms) * Math.PI * 2 + h * 0.5;
      const radius = (12 + t * 42 + h2 * 6) * s;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.72,
        z: -14 - t * 28 - lat * 0.006,
      };
    }
    case 'grid': {
      const cols = Math.ceil(Math.sqrt(Math.max(input.total, 1)));
      const col = input.index % cols;
      const row = Math.floor(input.index / cols);
      const spacing = 16 * s;
      const ox = ((cols - 1) * spacing) / 2;
      const oy = ((Math.ceil(input.total / cols) - 1) * spacing) / 2;
      return {
        x: col * spacing - ox + (h - 0.5) * 4 * s,
        y: row * spacing - oy + (h2 - 0.5) * 4 * s,
        z: -8 - lat * 0.005,
      };
    }
    case 'timeline-z': {
      const angle = h * Math.PI * 2;
      const radius = (22 + h2 * 8) * s;
      const timeSlice = sync * 2 - 1;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.5,
        z: timeSlice * 35 - 12,
      };
    }
    case 'swarm-orbit': {
      const angle = (input.index / Math.max(input.total, 1)) * Math.PI * 2 + h * 4;
      const radius = (24 + Math.sin(h2 * Math.PI * 2) * 8) * s;
      return {
        x: Math.cos(angle) * radius + (h - 0.5) * 12 * s,
        y: Math.sin(angle) * radius + (h2 - 0.5) * 12 * s,
        z: -6 - lat * 0.01 + Math.sin(angle * 2) * 4,
      };
    }
    case 'nebula-cluster': {
      const cluster = Math.floor(h * 4);
      const cx = Math.cos(cluster * 1.2) * 30 * s;
      const cy = Math.sin(cluster * 0.9) * 22 * s;
      const spread = (8 + h2 * 10) * s;
      return {
        x: cx + (h - 0.5) * spread * 2,
        y: cy + (h2 - 0.5) * spread * 2,
        z: -16 - cluster * 4 - lat * 0.007,
      };
    }
    case 'ring':
    default: {
      const angle = h * Math.PI * 2;
      const radius = (28 + (h2 * 255) * 0.35) * s;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: -12 - lat * 0.01,
      };
    }
  }
}

/** Z offset quest selon statut (Timeline Conquête). */
export function questZFromStatus(
  status: string,
  baseZ: number
): number {
  switch (status) {
    case 'completed':
      return baseZ - 28;
    case 'future':
    case 'locked':
      return baseZ + 32;
    case 'active':
      return baseZ + 4;
    default:
      return baseZ;
  }
}
