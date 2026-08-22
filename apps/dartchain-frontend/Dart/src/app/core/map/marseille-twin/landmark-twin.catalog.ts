import { MARSEILLE_LANDMARK_BUILDINGS } from '../geo-reference.config';
import { projectGeoToMarseilleWorld } from '../placements/ground-floor-anchor.util';
import {
  HERO_SKYLINE_LANDMARKS,
  heroSkylineWorldAnchor,
} from './landmark-hero.config';
import type { FacadeCategory, MarseilleBuildingTwin } from './marseille-building-twin.model';

const FACADE_BY_ID: Record<string, FacadeCategory> = {
  'mirror-adjacent-building-01': 'ground-storefront',
  'mirror-adjacent-building-02': 'ground-storefront',
  'harbor-west-building': 'harbor-arcade',
  'harbor-east-building': 'landmark',
};

const SKYLINE_FACADE: Record<string, FacadeCategory> = {
  'fort-saint-jean': 'landmark',
  'notre-dame-garde': 'landmark',
  mucem: 'landmark',
  'phare-joliette': 'landmark',
};

function twinFromGeoBuilding(
  building: (typeof MARSEILLE_LANDMARK_BUILDINGS)[number]
): MarseilleBuildingTwin {
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
}

/**
 * Catalogue jumeau — 4 héros OSM spawn + silhouettes skyline (Phase 10).
 */
export function createLandmarkTwinCatalog(): MarseilleBuildingTwin[] {
  const spawnHeroes = MARSEILLE_LANDMARK_BUILDINGS.map(twinFromGeoBuilding);

  const skylineHeroes: MarseilleBuildingTwin[] = HERO_SKYLINE_LANDMARKS.map((def) => {
    const anchor = heroSkylineWorldAnchor(def.id);
    return {
      id: def.id,
      identityLabel: def.label,
      footprintSource: 'PROJECTED',
      heightSource: 'APPROXIMATE',
      roofShape: 'flat',
      facadeCategory: SKYLINE_FACADE[def.id] ?? 'landmark',
      worldAnchor: { x: anchor.x, y: 0, z: anchor.z },
      cyberpunkVariant: 'none',
      lod: 'full',
      licenceProvenance: 'GPS silhouette — gameplay readability',
    };
  });

  return [...spawnHeroes, ...skylineHeroes];
}
