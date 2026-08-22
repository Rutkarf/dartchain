import { SPAWN_FACADE_OSM_ALIGN } from './spawn-facade-align.config';
import { shopsEastOsmDeltaMeters } from './spawn-facade-osm-delta';

/**
 * Double mesh connu : AABB shopsEast 26×18 vs landmark OSM way/67704902.
 * Ne pas réduire/déplacer l’AABB (volume gameplay / démarchage B2B).
 */
export const SPAWN_FACADE_DUAL_MESH = {
  aabbId: 'vieux-port-shops-east',
  osmLandmarkId: 'mirror-adjacent-building-02',
  osmSourceId: 'osm-way-67704902',
  knownOverlap: true,
  resolveByShrinkingAabb: false,
  alignEnabled: SPAWN_FACADE_OSM_ALIGN.enabled,
} as const;

export function spawnFacadeDualMeshStatus(): {
  knownOverlap: true;
  alignEnabled: false;
  centroidDeltaMeters: number;
} {
  return {
    knownOverlap: true,
    alignEnabled: SPAWN_FACADE_OSM_ALIGN.enabled,
    centroidDeltaMeters: shopsEastOsmDeltaMeters().deltaMeters,
  };
}
