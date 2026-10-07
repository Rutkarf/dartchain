import { OSM_STREET_MITER_LIMIT } from './ground-osm.config';

export interface XzPoint {
  x: number;
  z: number;
}

function segmentUnit(a: XzPoint, b: XzPoint): XzPoint | null {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return null;
  return { x: dx / len, z: dz / len };
}

function leftNormal(tangent: XzPoint): XzPoint {
  return { x: -tangent.z, z: tangent.x };
}

function miterOffset(
  prev: XzPoint,
  curr: XzPoint,
  next: XzPoint,
  halfWidth: number
): { left: XzPoint; right: XzPoint } {
  const t1 = segmentUnit(prev, curr);
  const t2 = segmentUnit(curr, next);
  if (!t1 && !t2) {
    return { left: curr, right: curr };
  }
  if (!t1 && t2) {
    const n = leftNormal(t2);
    return {
      left: { x: curr.x + n.x * halfWidth, z: curr.z + n.z * halfWidth },
      right: { x: curr.x - n.x * halfWidth, z: curr.z - n.z * halfWidth },
    };
  }
  if (t1 && !t2) {
    const n = leftNormal(t1);
    return {
      left: { x: curr.x + n.x * halfWidth, z: curr.z + n.z * halfWidth },
      right: { x: curr.x - n.x * halfWidth, z: curr.z - n.z * halfWidth },
    };
  }

  const n1 = leftNormal(t1!);
  const n2 = leftNormal(t2!);
  let mx = n1.x + n2.x;
  let mz = n1.z + n2.z;
  const ml = Math.hypot(mx, mz);
  if (ml < 1e-6) {
    mx = n1.x;
    mz = n1.z;
  } else {
    mx /= ml;
    mz /= ml;
  }

  const dot = Math.max(0.15, mx * n1.x + mz * n1.z);
  let scale = halfWidth / dot;
  scale = Math.min(scale, halfWidth * OSM_STREET_MITER_LIMIT);

  return {
    left: { x: curr.x + mx * scale, z: curr.z + mz * scale },
    right: { x: curr.x - mx * scale, z: curr.z - mz * scale },
  };
}

/**
 * Buffer open polyline in XZ (mètres monde).
 * Retourne un anneau fermé CCW : rive gauche → rive droite inversée.
 */
export function bufferOpenPolylineXZ(
  points: readonly XzPoint[],
  halfWidth: number
): XzPoint[] | null {
  if (points.length < 2 || halfWidth <= 0) return null;

  const left: XzPoint[] = [];
  const right: XzPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const curr = points[i];
    const next = points[Math.min(points.length - 1, i + 1)];
    const { left: l, right: r } = miterOffset(prev, curr, next, halfWidth);
    left.push(l);
    right.push(r);
  }

  return [...left, ...right.reverse()];
}

export function polylineLengthMeters(points: readonly XzPoint[]): number {
  let sum = 0;
  for (let i = 0; i < points.length - 1; i++) {
    sum += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z);
  }
  return sum;
}

export function ringAreaMetersSq(ring: readonly XzPoint[]): number {
  if (ring.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    area += a.x * b.z - b.x * a.z;
  }
  return Math.abs(area * 0.5);
}
