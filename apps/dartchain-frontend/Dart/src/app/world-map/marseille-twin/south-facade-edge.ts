import type { GeoFootprintPoint } from '../geo-reference.config';
import { projectGeoToMarseilleWorld } from '../placements/ground-floor-anchor.util';

export interface PlanarEdge {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  midX: number;
  midZ: number;
  lengthMeters: number;
}

/** Sud = +Z. Arête dont le milieu a le Z le plus grand. */
export function southFacadeEdgeFromFootprint(
  footprint: readonly GeoFootprintPoint[]
): PlanarEdge | null {
  const ring = uniqueRing(
    footprint.map((point) => {
      const world = projectGeoToMarseilleWorld(point.latitude, point.longitude, 0);
      return { x: world.x, z: world.z };
    })
  );
  if (ring.length < 2) return null;
  let best: PlanarEdge | null = null;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (!a || !b) continue;
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 0.5) continue;
    const midX = (a.x + b.x) * 0.5;
    const midZ = (a.z + b.z) * 0.5;
    if (!best || midZ > best.midZ) {
      best = { ax: a.x, az: a.z, bx: b.x, bz: b.z, midX, midZ, lengthMeters: length };
    }
  }
  return best;
}

export function footprintCentroidWorld(
  footprint: readonly GeoFootprintPoint[]
): { x: number; z: number } {
  const ring = uniqueRing(
    footprint.map((point) => {
      const world = projectGeoToMarseilleWorld(point.latitude, point.longitude, 0);
      return { x: world.x, z: world.z };
    })
  );
  const sum = ring.reduce((acc, point) => ({ x: acc.x + point.x, z: acc.z + point.z }), {
    x: 0,
    z: 0,
  });
  const n = ring.length || 1;
  return { x: sum.x / n, z: sum.z / n };
}

function uniqueRing(points: Array<{ x: number; z: number }>): Array<{ x: number; z: number }> {
  if (points.length < 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return points;
  if (Math.hypot(first.x - last.x, first.z - last.z) < 1e-6) {
    return points.slice(0, -1);
  }
  return points;
}
