import { WORLD_SCALE } from '../map-configuration';
import { VIEUX_PORT_CORE_BUILDING_RADIUS } from '../geo-reference.config';

export type MarseilleDistrictId = 'vieux-port-core' | 'unknown';

export interface MarseilleDistrictTile {
  id: string;
  district: MarseilleDistrictId;
  gridX: number;
  gridZ: number;
  loadPriority: number;
}

/** Stratégie : ne jamais charger Marseille entière. Chunks existants 128 m. */
export const MARSEILLE_TILE_STRATEGY = {
  chunkSizeMeters: WORLD_SCALE.chunkSizeMeters,
  maxLoadedDistrictTiles: WORLD_SCALE.maxLoadedChunks,
  expandBeyondCore: false,
} as const;

export function districtForWorld(x: number, z: number): MarseilleDistrictId {
  const radius = Math.hypot(x, z);
  return radius <= VIEUX_PORT_CORE_BUILDING_RADIUS ? 'vieux-port-core' : 'unknown';
}
