import type { GeoBuilding } from './geo-reference.config';
import type { OSMBuildingFootprint } from './osm-building.provider';
import { footprintCentroid } from './geo-building.util';
import type { GeoCoordinateService } from './geo-coordinate.service';

/** Erreur centroïde entre deux empreintes (m). */
export function footprintCentroidErrorMeters(
  a: ReadonlyArray<{ latitude: number; longitude: number }>,
  b: ReadonlyArray<{ latitude: number; longitude: number }>,
  geo: GeoCoordinateService
): number {
  const ca = footprintCentroid(a, geo);
  const cb = footprintCentroid(b, geo);
  return ca.distanceTo(cb);
}

export function enrichAuditWithReference(
  audit: {
    buildingId: string;
    worldPosition: { x: number; y: number; z: number };
    footprintErrorMeters?: number;
    heightErrorMeters?: number;
    heightMeters?: number;
  },
  reference: GeoBuilding,
  geo: GeoCoordinateService
): void {
  const refCenter = footprintCentroid(reference.footprint, geo);
  const wp = audit.worldPosition;
  audit.footprintErrorMeters = Math.hypot(wp.x - refCenter.x, wp.y - refCenter.y, wp.z - refCenter.z);
  const refHeight = reference.heightMeters ?? (reference.levels != null ? reference.levels * 3.1 : 12);
  const builtHeight = audit.heightMeters ?? refHeight;
  audit.heightErrorMeters = Math.abs(builtHeight - refHeight);
}

/** Cadastre / GeoJSON gagne sur OSM si même sourceId ou id. */
export function shouldSkipOsmForCadastre(
  osm: OSMBuildingFootprint,
  cadastralIds: ReadonlySet<string>,
  cadastralSourceIds: ReadonlySet<string>
): boolean {
  if (cadastralIds.has(osm.id)) return true;
  if (cadastralSourceIds.has(osm.id)) return true;
  return false;
}

export function indexCadastralBuildings(buildings: readonly GeoBuilding[]): {
  ids: Set<string>;
  sourceIds: Set<string>;
} {
  const ids = new Set<string>();
  const sourceIds = new Set<string>();
  for (const b of buildings) {
    ids.add(b.id);
    sourceIds.add(b.sourceId);
    if (b.sourceId.startsWith('osm-way-')) {
      sourceIds.add(b.sourceId);
    }
  }
  return { ids, sourceIds };
}

/** Priorité : landmark cadastre > catalogue accurate > OSM bulk. */
export function cadastreOverridesCatalogId(
  cadastral: GeoBuilding,
  catalogId: string
): boolean {
  if (cadastral.id === catalogId) return true;
  return cadastral.sourceId === catalogId;
}
