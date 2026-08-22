import type { GeoBuilding } from './geo-reference.config';

export const DEFAULT_BUILDING_HEIGHT = 9;
export const FLOOR_HEIGHT_M = 3.2;
export const LEGACY_FLOOR_HEIGHT_M = 3.1;
export const MAX_BUILDING_HEIGHT = 160;
export const MIN_BUILDING_HEIGHT = 4;

export type BuildingHeightSource =
  | 'height'
  | 'est_height'
  | 'levels'
  | 'hardcoded'
  | 'type'
  | 'default';

export interface ResolvedBuildingHeight {
  heightMeters: number;
  heightSource: BuildingHeightSource;
  levels?: number;
}

export const BUILDING_TYPE_HEIGHTS: Record<string, number> = {
  house: 6,
  detached: 7,
  semidetached_house: 7,
  terrace: 8,
  bungalow: 4.5,
  cabin: 4,
  static_caravan: 3.5,
  garage: 3,
  garages: 3,
  shed: 3,
  hut: 3,
  carport: 3,
  roof: 3.5,
  kiosk: 3.5,
  retail: 8,
  commercial: 12,
  office: 18,
  industrial: 10,
  warehouse: 9,
  school: 12,
  university: 14,
  hospital: 16,
  hotel: 20,
  apartments: 18,
  residential: 14,
  yes: 10,
  church: 16,
  cathedral: 28,
  mosque: 14,
  synagogue: 12,
  chapel: 8,
  public: 12,
  civic: 14,
  train_station: 14,
  transportation: 10,
  stadium: 22,
  sports_hall: 12,
  supermarket: 8,
  church_hall: 8,
};

export function clampBuildingHeight(meters: number): number {
  return Math.min(MAX_BUILDING_HEIGHT, Math.max(MIN_BUILDING_HEIGHT, meters));
}

/** Résolution hauteur depuis tags OSM Overpass. */
export function resolveBuildingHeightFromTags(
  tags: Record<string, string>
): ResolvedBuildingHeight {
  const directHeight = Number.parseFloat(tags['height'] ?? '');
  if (Number.isFinite(directHeight) && directHeight > 0) {
    return {
      heightMeters: clampBuildingHeight(directHeight),
      heightSource: 'height',
    };
  }

  const estHeight = Number.parseFloat(tags['est_height'] ?? '');
  if (Number.isFinite(estHeight) && estHeight > 0) {
    return {
      heightMeters: clampBuildingHeight(estHeight),
      heightSource: 'est_height',
    };
  }

  const levels = Number.parseFloat(tags['building:levels'] ?? '');
  const minLevel = Number.parseFloat(tags['building:min_level'] ?? '0');
  if (Number.isFinite(levels) && levels > 0) {
    const effectiveLevels = levels - (Number.isFinite(minLevel) ? Math.max(0, minLevel) : 0);
    return {
      heightMeters: clampBuildingHeight(Math.max(effectiveLevels, 1) * FLOOR_HEIGHT_M),
      heightSource: 'levels',
      levels: Math.max(effectiveLevels, 1),
    };
  }

  const buildingType = (tags['building'] ?? 'yes').toLowerCase();
  const typed = BUILDING_TYPE_HEIGHTS[buildingType];
  if (typed != null) {
    return {
      heightMeters: clampBuildingHeight(typed),
      heightSource: 'type',
    };
  }

  return {
    heightMeters: DEFAULT_BUILDING_HEIGHT,
    heightSource: 'default',
  };
}

/** Hauteur pour GeoBuilding catalogue / landmarks — tags OSM optionnels. */
export function resolveGeoBuildingHeight(
  building: GeoBuilding,
  tags?: Record<string, string>
): ResolvedBuildingHeight {
  if (tags && Object.keys(tags).length > 0) {
    const fromTags = resolveBuildingHeightFromTags(tags);
    if (fromTags.heightSource !== 'default' && fromTags.heightSource !== 'type') {
      return fromTags;
    }
  }

  if (building.heightMeters != null && building.heightMeters > 0) {
    return {
      heightMeters: clampBuildingHeight(building.heightMeters),
      heightSource: 'hardcoded',
      levels: building.levels,
    };
  }

  if (building.levels != null && building.levels > 0) {
    return {
      heightMeters: clampBuildingHeight(building.levels * LEGACY_FLOOR_HEIGHT_M),
      heightSource: 'levels',
      levels: building.levels,
    };
  }

  if (tags) {
    return resolveBuildingHeightFromTags(tags);
  }

  return {
    heightMeters: clampBuildingHeight(12),
    heightSource: 'default',
  };
}
