import { MARSEILLE_LANDMARK_BUILDINGS } from '../geo-reference.config';
import type { GeoSourceQuality } from './source-quality';

export interface FootprintCompatibilityRecord {
  buildingId: string;
  currentKind: 'osm-way-ring' | 'axis-aligned-rectangle';
  sourceQuality: GeoSourceQuality;
  uniqueVertexCount: number;
}

export function landmarkFootprintCompatibility(): FootprintCompatibilityRecord[] {
  return MARSEILLE_LANDMARK_BUILDINGS.map((building) => {
    const unique = building.footprint.slice(0, -1);
    const isRectangle = unique.length === 4;
    return {
      buildingId: building.id,
      currentKind: isRectangle ? 'axis-aligned-rectangle' : 'osm-way-ring',
      sourceQuality: 'PROJECTED',
      uniqueVertexCount: unique.length,
    };
  });
}
