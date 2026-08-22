import { worldToCanebiereAlong } from './accurate-city-buildings.data';
import { VIEUX_PORT_CORE_BUILDING_RADIUS } from './geo-reference.config';
import { OSM_CONTENT_PARITY } from './osm-content-parity.config';

/** 0 = spawn, 3 = périphérie — plus bas = inséré en premier. */
export type OsmContentPriorityTier = 0 | 1 | 2 | 3;

export function osmContentPriorityTier(centerX: number, centerZ: number): OsmContentPriorityTier {
  const dist = Math.hypot(centerX, centerZ);
  if (dist <= OSM_CONTENT_PARITY.spawnPriorityRadiusM) return 0;

  const along = Math.abs(worldToCanebiereAlong(centerX, centerZ));
  if (along <= OSM_CONTENT_PARITY.canebiereHalfWidthM) return 1;

  const coreRadius = Math.max(
    OSM_CONTENT_PARITY.vieuxPortCoreRadiusM,
    VIEUX_PORT_CORE_BUILDING_RADIUS
  );
  if (dist <= coreRadius) return 2;

  return 3;
}

export interface OsmPrioritySortable {
  center: { x: number; z: number };
  distSq?: number;
}

/** Phase 23 — spawn → Canebière → Vieux-Port → reste, puis distance au spawn. */
export function sortOsmEntriesByContentPriority<T extends OsmPrioritySortable>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const pa = osmContentPriorityTier(a.center.x, a.center.z);
    const pb = osmContentPriorityTier(b.center.x, b.center.z);
    if (pa !== pb) return pa - pb;
    const da = a.distSq ?? a.center.x * a.center.x + a.center.z * a.center.z;
    const db = b.distSq ?? b.center.x * b.center.x + b.center.z * b.center.z;
    return da - db;
  });
}
