import {
  METERS_PER_DEGREE_LATITUDE,
  metersPerDegreeLongitude,
} from '../geo-projection.constants';
import {
  GEO_REFERENCE_CONFIG,
  type GeoFootprintPoint,
} from '../geo-reference.config';
import { toWorldCoordinate, type WorldCoordinate } from './coordinate-system';
import { PLACEMENTS_LAYER_CONFIG } from './placement-layer.config';

/** Hauteur RDC du panneau / hit-volume (m) — inchangée vs fixtures historiques. */
export const GROUND_FLOOR_ANCHOR_HEIGHT_METERS = 1.2;

export interface WorldXz {
  x: number;
  z: number;
}

export interface GroundFloorAnchorOptions {
  heightMeters?: number;
  /** Pousse l’ancre hors du mur (m). Défaut : demi-épaisseur du hit-volume. */
  outwardOffsetMeters?: number;
}

export interface GroundFloorAnchor {
  world: WorldCoordinate;
  facingRad: number;
  edgeLengthMeters: number;
  outward: WorldXz;
}

export type GeoToWorldFn = (
  latitude: number,
  longitude: number,
  altitude?: number
) => { x: number; y?: number; z: number };

/**
 * Projection équirectangulaire figée `marseille-local-v1` (origine Ombrière).
 * Identique à GeoCoordinateService tant que l’origine runtime n’est pas déplacée.
 */
export function projectGeoToMarseilleWorld(
  latitude: number,
  longitude: number,
  altitude = 0
): { x: number; y: number; z: number } {
  const scale = GEO_REFERENCE_CONFIG.metersPerWorldUnit;
  const metersLon = metersPerDegreeLongitude(GEO_REFERENCE_CONFIG.originLatitude);
  return {
    x: (longitude - GEO_REFERENCE_CONFIG.originLongitude) * metersLon * scale,
    y: (altitude - GEO_REFERENCE_CONFIG.originAltitude) * scale,
    z:
      -(latitude - GEO_REFERENCE_CONFIG.originLatitude) *
      METERS_PER_DEGREE_LATITUDE *
      scale,
  };
}

export function projectMarseilleWorldToGeo(
  x: number,
  y: number,
  z: number
): { latitude: number; longitude: number; altitude: number } {
  const scale = GEO_REFERENCE_CONFIG.metersPerWorldUnit || 1;
  const metersLon = metersPerDegreeLongitude(GEO_REFERENCE_CONFIG.originLatitude);
  return {
    latitude:
      GEO_REFERENCE_CONFIG.originLatitude -
      z / (METERS_PER_DEGREE_LATITUDE * scale),
    longitude:
      GEO_REFERENCE_CONFIG.originLongitude + x / (metersLon * scale),
    altitude: y / scale + GEO_REFERENCE_CONFIG.originAltitude,
  };
}

/**
 * Ancre RDC = milieu de l’arête de footprint dont le milieu est le plus
 * éloigné de x=0 (même convention que les vitrines décoratives OSM :
 * façade est si le bâtiment est à l’est, ouest s’il est à l’ouest).
 */
export function groundFloorAnchorFromWorldRing(
  ringIn: readonly WorldXz[],
  options: GroundFloorAnchorOptions = {}
): GroundFloorAnchor | null {
  const ring = uniqueRing(ringIn);
  if (ring.length < 3) return null;

  const center = ringCentroid(ring);
  const side = center.x >= 0 ? 1 : -1;
  let best: {
    mid: WorldXz;
    outward: WorldXz;
    length: number;
    score: number;
  } | null = null;

  for (let index = 0; index < ring.length; index++) {
    const a = ring[index];
    const b = ring[(index + 1) % ring.length];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 1e-3) continue;

    const mid = { x: (a.x + b.x) * 0.5, z: (a.z + b.z) * 0.5 };
    let ox = mid.x - center.x;
    let oz = mid.z - center.z;
    const outwardLen = Math.hypot(ox, oz);
    if (outwardLen < 1e-6) continue;
    ox /= outwardLen;
    oz /= outwardLen;

    const score = mid.x * side + length * 1e-6;
    if (!best || score > best.score) {
      best = { mid, outward: { x: ox, z: oz }, length, score };
    }
  }

  if (!best) return null;

  const offset =
    options.outwardOffsetMeters ?? PLACEMENTS_LAYER_CONFIG.hitDepth * 0.5;
  const height = options.heightMeters ?? GROUND_FLOOR_ANCHOR_HEIGHT_METERS;
  const x = best.mid.x + best.outward.x * offset;
  const z = best.mid.z + best.outward.z * offset;

  return {
    world: toWorldCoordinate(x, height, z),
    facingRad: Math.atan2(-best.outward.x, -best.outward.z),
    edgeLengthMeters: best.length,
    outward: best.outward,
  };
}

export function groundFloorAnchorFromGeoFootprint(
  footprint: readonly GeoFootprintPoint[],
  geoToWorld: GeoToWorldFn = projectGeoToMarseilleWorld,
  options: GroundFloorAnchorOptions = {}
): GroundFloorAnchor | null {
  const ring = footprint.map((point) => {
    const world = geoToWorld(point.latitude, point.longitude, 0);
    return { x: world.x, z: world.z };
  });
  return groundFloorAnchorFromWorldRing(ring, options);
}

function uniqueRing(points: readonly WorldXz[]): WorldXz[] {
  if (points.length < 2) return [...points];
  const first = points[0];
  const last = points[points.length - 1];
  const closed = Math.hypot(first.x - last.x, first.z - last.z) < 1e-6;
  return closed ? points.slice(0, -1) : [...points];
}

function ringCentroid(ring: readonly WorldXz[]): WorldXz {
  const center = { x: 0, z: 0 };
  for (const point of ring) {
    center.x += point.x;
    center.z += point.z;
  }
  const n = ring.length || 1;
  center.x /= n;
  center.z /= n;
  return center;
}
