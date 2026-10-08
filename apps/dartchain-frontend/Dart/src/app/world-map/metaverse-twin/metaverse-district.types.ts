import { WORLD_SCALE } from '../map-configuration';
import { VIEUX_PORT_CORE_BUILDING_RADIUS } from '../geo-reference.config';

export type MetaverseDistrictId = 'vieux-port-core' | 'unknown';

export interface MetaverseDistrictTile {
  id: string;
  district: MetaverseDistrictId;
  gridX: number;
  gridZ: number;
  loadPriority: number;
}

/** Stratégie : ne jamais charger Metaverse entière. Chunks existants 128 m. */
export const METAVERSE_TILE_STRATEGY = {
  chunkSizeMeters: WORLD_SCALE.chunkSizeMeters,
  maxLoadedDistrictTiles: WORLD_SCALE.maxLoadedChunks,
  expandBeyondCore: false,
} as const;

export function districtForWorld(x: number, z: number): MetaverseDistrictId {
  const radius = Math.hypot(x, z);
  return radius <= VIEUX_PORT_CORE_BUILDING_RADIUS ? 'vieux-port-core' : 'unknown';
}
