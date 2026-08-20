import { MARSEILLE_LANDMARK_BUILDINGS } from '../geo-reference.config';
import { VIEUX_PORT_SPAWN_FACADES } from '../vieux-port-spawn-facades.util';
import { projectGeoToMarseilleWorld } from '../placements/ground-floor-anchor.util';
import { footprintCentroidWorld } from './south-facade-edge';

/**
 * Écart AABB spawn shopsEast vs centroïde OSM way/67704902.
 * Ne déplace pas la rangée boutiques décorative.
 */
export function shopsEastOsmDeltaMeters(): {
  spawnCenter: { x: number; z: number };
  osmCentroid: { x: number; z: number };
  deltaMeters: number;
} {
  const spec = VIEUX_PORT_SPAWN_FACADES.shopsEast;
  const spawnCenter = projectGeoToMarseilleWorld(spec.centerLat, spec.centerLon, 0);
  const landmark = MARSEILLE_LANDMARK_BUILDINGS.find(
    (item) => item.sourceId === 'osm-way-67704902'
  );
  const osmCentroid = landmark
    ? footprintCentroidWorld(landmark.footprint)
    : { x: spawnCenter.x, z: spawnCenter.z };
  return {
    spawnCenter: { x: spawnCenter.x, z: spawnCenter.z },
    osmCentroid,
    deltaMeters: Math.hypot(spawnCenter.x - osmCentroid.x, spawnCenter.z - osmCentroid.z),
  };
}
