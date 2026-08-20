import { MARSEILLE_LANDMARK_BUILDINGS } from '../geo-reference.config';
import { projectGeoToMarseilleWorld } from '../placements/ground-floor-anchor.util';
import type { FacadeCategory, MarseilleBuildingTwin } from './marseille-building-twin.model';

const FACADE_BY_ID: Record<string, FacadeCategory> = {
  'mirror-adjacent-building-01': 'ground-storefront',
  'mirror-adjacent-building-02': 'ground-storefront',
  'harbor-west-building': 'harbor-arcade',
  'harbor-east-building': 'landmark',
};

/**
 * Catalogue jumeau des 4 héros — dérivé des footprints OSM, pas un nouveau mesh.
 */
export function createLandmarkTwinCatalog(): MarseilleBuildingTwin[] {
  return MARSEILLE_LANDMARK_BUILDINGS.map((building) => {
    const points = building.footprint.slice(0, -1);
    const world = points.map((point) =>
      projectGeoToMarseilleWorld(point.latitude, point.longitude, 0)
    );
    const anchor = world.reduce(
      (sum, point) => ({ x: sum.x + point.x, y: 0, z: sum.z + point.z }),
      { x: 0, y: 0, z: 0 }
    );
    const n = world.length || 1;
    return {
      id: building.id,
      identityLabel: building.label ?? building.id,
      footprintSource: 'PROJECTED',
      heightSource: 'APPROXIMATE',
      heightMeters: building.heightMeters,
      roofShape: 'flat',
      facadeCategory: FACADE_BY_ID[building.id] ?? 'unknown',
      worldAnchor: { x: anchor.x / n, y: 0, z: anchor.z / n },
      cyberpunkVariant: 'none',
      lod: 'full',
      licenceProvenance: `ODbL ${building.sourceId}`,
    };
  });
}
