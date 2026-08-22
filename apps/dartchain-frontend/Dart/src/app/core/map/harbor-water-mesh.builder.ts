import * as THREE from 'three';

import { MARSEILLE_HARBOR_WATER } from './map-configuration';
import { HARBOR_WATER_DEEP_VISUAL, HARBOR_WATER_SHADER_CONFIG } from './harbor-water.config';
import type { HarborWaterShaderMaterial } from './harbor-water.shader';

export interface HarborWaterPolygonDef {
  id: string;
  ring: ReadonlyArray<{ x: number; z: number }>;
  /** Distance normalisée bord → centre (m). */
  maxDepthSpan: number;
}

export interface HarborWaterMeshBuildResult {
  surface: THREE.Mesh;
  deepBed: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  deepGeometry: THREE.BufferGeometry;
}

function pointToSegmentDistance(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-8) return Math.hypot(px - ax, pz - az);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
  const nx = ax + t * dx;
  const nz = az + t * dz;
  return Math.hypot(px - nx, pz - nz);
}

/** Distance au bord du polygone — 0 = rive, augmente vers l'intérieur. */
export function shoreDistanceMeters(
  x: number,
  z: number,
  ring: ReadonlyArray<{ x: number; z: number }>
): number {
  if (ring.length < 2) return 0;
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    min = Math.min(min, pointToSegmentDistance(x, z, a.x, a.z, b.x, b.z));
  }
  return min;
}

export function normalizedShoreDepth(
  x: number,
  z: number,
  ring: ReadonlyArray<{ x: number; z: number }>,
  maxDepthSpan: number
): number {
  const span = Math.max(8, maxDepthSpan);
  return THREE.MathUtils.clamp(shoreDistanceMeters(x, z, ring) / span, 0, 1);
}

function insetRing(
  ring: ReadonlyArray<{ x: number; z: number }>,
  insetRatio: number
): { x: number; z: number }[] {
  const cx = ring.reduce((s, p) => s + p.x, 0) / ring.length;
  const cz = ring.reduce((s, p) => s + p.z, 0) / ring.length;
  return ring.map((p) => ({
    x: cx + (p.x - cx) * insetRatio,
    z: cz + (p.z - cz) * insetRatio,
  }));
}

function applyShoreDepthAttribute(
  geometry: THREE.BufferGeometry,
  ring: ReadonlyArray<{ x: number; z: number }>,
  maxDepthSpan: number
): void {
  const pos = geometry.getAttribute('position');
  const depths = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    depths[i] = normalizedShoreDepth(x, z, ring, maxDepthSpan);
  }
  geometry.setAttribute('aShoreDepth', new THREE.BufferAttribute(depths, 1));
}

/** Polygones eau Vieux-Port — fallback layout (remplaçable OSM Phase 2). */
export function defaultHarborWaterPolygons(
  harbor: typeof MARSEILLE_HARBOR_WATER = MARSEILLE_HARBOR_WATER
): HarborWaterPolygonDef[] {
  const channelHalf = 102;
  return [
    {
      id: 'basin-west',
      ring: [
        { x: harbor.basinMinX, z: harbor.basinMinZ },
        { x: harbor.basinMaxX, z: harbor.basinMinZ },
        { x: harbor.basinMaxX, z: harbor.basinMaxZ },
        { x: harbor.basinMinX, z: harbor.basinMaxZ },
      ],
      maxDepthSpan: HARBOR_WATER_DEEP_VISUAL.basinMaxDepthSpan,
    },
    {
      id: 'south-channel',
      ring: [
        { x: -channelHalf, z: harbor.waterMinZ },
        { x: channelHalf, z: harbor.waterMinZ },
        { x: channelHalf, z: harbor.waterMaxZ },
        { x: -channelHalf, z: harbor.waterMaxZ },
      ],
      maxDepthSpan: HARBOR_WATER_DEEP_VISUAL.channelMaxDepthSpan,
    },
    {
      id: 'mirror-apron',
      ring: [
        { x: -27, z: harbor.waterMinZ + 2 },
        { x: 27, z: harbor.waterMinZ + 2 },
        { x: 27, z: harbor.waterMinZ + 30 },
        { x: -27, z: harbor.waterMinZ + 30 },
      ],
      maxDepthSpan: 28,
    },
  ];
}

export function buildHarborWaterSurfaceMesh(
  def: HarborWaterPolygonDef,
  material: HarborWaterShaderMaterial,
  deepMaterial: THREE.Material,
  waterY: number,
  deepY: number,
  subdivisions: number = HARBOR_WATER_SHADER_CONFIG.subdivisions
): HarborWaterMeshBuildResult {
  const shapePoints = def.ring.map((p) => new THREE.Vector2(p.x, -p.z));
  const shape = new THREE.Shape(shapePoints);
  const geometry = new THREE.ShapeGeometry(shape, subdivisions);
  geometry.rotateX(-Math.PI / 2);
  applyShoreDepthAttribute(geometry, def.ring, def.maxDepthSpan);
  geometry.computeVertexNormals();

  const surface = new THREE.Mesh(geometry, material);
  surface.name = `marseille-water-surface-${def.id}`;
  surface.position.y = waterY;
  surface.renderOrder = 10;
  surface.frustumCulled = false;

  const inset = insetRing(def.ring, 1 - HARBOR_WATER_DEEP_VISUAL.deepBedInset);
  const deepShape = new THREE.Shape(inset.map((p) => new THREE.Vector2(p.x, -p.z)));
  const deepGeometry = new THREE.ShapeGeometry(deepShape, Math.max(12, subdivisions >> 1));
  deepGeometry.rotateX(-Math.PI / 2);

  const deepBed = new THREE.Mesh(deepGeometry, deepMaterial);
  deepBed.name = `marseille-water-deep-${def.id}`;
  deepBed.position.y = deepY;
  deepBed.renderOrder = 5;
  deepBed.frustumCulled = false;

  return { surface, deepBed, geometry, deepGeometry };
}

export function ringCentroid(ring: ReadonlyArray<{ x: number; z: number }>): { x: number; z: number } {
  const n = ring.length || 1;
  return {
    x: ring.reduce((s, p) => s + p.x, 0) / n,
    z: ring.reduce((s, p) => s + p.z, 0) / n,
  };
}

/** Convertit un way OSM fermé (lat/lon) en polygone monde si ≥ 4 sommets. */
export function osmRingToHarborPolygon(
  id: string,
  points: ReadonlyArray<{ latitude: number; longitude: number }>,
  geoToWorld: (lat: number, lon: number) => { x: number; z: number },
  maxDepthSpan = 80
): HarborWaterPolygonDef | null {
  if (points.length < 4) return null;
  const ring = points.map((p) => {
    const w = geoToWorld(p.latitude, p.longitude);
    return { x: w.x, z: w.z };
  });
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (Math.hypot(first.x - last.x, first.z - last.z) > 0.05) {
    ring.push({ x: first.x, z: first.z });
  }
  return { id, ring, maxDepthSpan };
}
