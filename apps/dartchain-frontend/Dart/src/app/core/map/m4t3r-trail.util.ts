import * as THREE from 'three';

import { M4T3R_DENSITY_CONFIG, TRAIL_CONFIG, COLLECT_TRAIL_VISUAL_CONFIG } from './map-configuration';

export type M4T3RVisualVariant = 'thin-leaf' | 'vertical-chip' | 'metal-fragment' | 'neon-shard';

const VARIANTS: M4T3RVisualVariant[] = [
  'thin-leaf',
  'vertical-chip',
  'metal-fragment',
  'neon-shard',
];

export function clusterId(gridX: number, gridZ: number): string {
  return `m4t3r-cluster:${gridX}:${gridZ}`;
}

export function logicalCellId(gridX: number, gridZ: number): string {
  return `m4t3r-cell:${gridX}:${gridZ}`;
}

export function getDeterministicVariant(cellId: string): M4T3RVisualVariant {
  let hash = 0;
  for (let i = 0; i < cellId.length; i++) {
    hash = (hash * 31 + cellId.charCodeAt(i)) | 0;
  }
  return VARIANTS[Math.abs(hash) % VARIANTS.length];
}

export function worldToCluster(world: number): number {
  return Math.floor(world / M4T3R_DENSITY_CONFIG.visualClusterSize);
}

/** Centre monde XZ d'un cluster visuel `m4t3r-cluster:gx:gz`. */
export function clusterWorldCenter(clusterKey: string): { x: number; z: number } | null {
  const parts = clusterKey.split(':');
  if (parts.length < 3 || parts[0] !== 'm4t3r-cluster') return null;
  const gx = Number(parts[1]);
  const gz = Number(parts[2]);
  if (!Number.isFinite(gx) || !Number.isFinite(gz)) return null;
  const size = M4T3R_DENSITY_CONFIG.visualClusterSize;
  return { x: (gx + 0.5) * size, z: (gz + 0.5) * size };
}

/**
 * Points le long d'un segment de déplacement pour le glow visuel de collecte.
 * Largeur calée sur TRAIL_CONFIG.width.
 */
export function sampleCollectTrailVisualPoints(
  previousPosition: THREE.Vector3,
  currentPosition: THREE.Vector3,
  spacing = COLLECT_TRAIL_VISUAL_CONFIG.segmentSampleSpacing
): Array<{ x: number; z: number; yaw: number }> {
  const dx = currentPosition.x - previousPosition.x;
  const dz = currentPosition.z - previousPosition.z;
  const dist = Math.hypot(dx, dz);
  const yaw = dist > 1e-5 ? Math.atan2(dx, dz) : 0;
  if (dist < 1e-5) {
    return [{ x: currentPosition.x, z: currentPosition.z, yaw }];
  }
  const samples = Math.max(1, Math.ceil(dist / spacing));
  const points: Array<{ x: number; z: number; yaw: number }> = [];
  for (let s = 0; s <= samples; s++) {
    const t = s / samples;
    points.push({
      x: previousPosition.x + dx * t,
      z: previousPosition.z + dz * t,
      yaw,
    });
  }
  return points;
}

/**
 * Cellules logiques 1 cm le long du segment, sans allouer un Mesh.
 * Largeur de traînée appliquée perpendiculairement.
 */
export function getCellsAlongMovement(
  previousPosition: THREE.Vector3,
  currentPosition: THREE.Vector3,
  cellSize: number
): string[] {
  const dx = currentPosition.x - previousPosition.x;
  const dz = currentPosition.z - previousPosition.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-5) {
    return [logicalCellId(Math.floor(currentPosition.x / cellSize), Math.floor(currentPosition.z / cellSize))];
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  const samples = Math.max(1, Math.ceil(dist / TRAIL_CONFIG.sampleDistance));
  const nx = -dz / dist;
  const nz = dx / dist;
  const half = TRAIL_CONFIG.width * 0.5;
  const across = Math.max(1, Math.ceil(TRAIL_CONFIG.width / cellSize));
  for (let s = 0; s <= samples && ids.length < TRAIL_CONFIG.maxCellsPerUpdate; s++) {
    const t = s / samples;
    const x = previousPosition.x + dx * t;
    const z = previousPosition.z + dz * t;
    for (let a = 0; a <= across && ids.length < TRAIL_CONFIG.maxCellsPerUpdate; a++) {
      const u = across === 0 ? 0 : a / across;
      const ox = (u - 0.5) * 2 * half;
      const px = x + nx * ox;
      const pz = z + nz * ox;
      const id = logicalCellId(Math.floor(px / cellSize), Math.floor(pz / cellSize));
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }
  return ids;
}

export function clustersAlongMovement(
  previousPosition: THREE.Vector3,
  currentPosition: THREE.Vector3
): string[] {
  const size = M4T3R_DENSITY_CONFIG.visualClusterSize;
  return [
    ...new Set(
      getCellsAlongMovement(previousPosition, currentPosition, size).map((id) => {
        const parts = id.split(':');
        return clusterId(Number(parts[1]), Number(parts[2]));
      })
    ),
  ];
}

export function getPlayerHeadWorldPosition(
  player: THREE.Object3D,
  target = new THREE.Vector3()
): THREE.Vector3 {
  let head: THREE.Object3D | undefined;
  player.traverse((node) => {
    if (head) return;
    if (/head/i.test(node.name)) {
      head = node;
    }
  });
  if (head) {
    head.getWorldPosition(target);
    return target;
  }
  const box = new THREE.Box3().setFromObject(player);
  if (box.isEmpty()) {
    return target.copy(player.position).setY(player.position.y + 1.8);
  }
  target.set((box.min.x + box.max.x) * 0.5, box.max.y, (box.min.z + box.max.z) * 0.5);
  return target;
}

export function placeM4T3RAboveGround(
  token: THREE.Object3D,
  worldPosition: THREE.Vector3,
  groundHeight = M4T3R_DENSITY_CONFIG.groundY
): void {
  token.position.set(
    worldPosition.x,
    groundHeight,
    worldPosition.z
  );
}
