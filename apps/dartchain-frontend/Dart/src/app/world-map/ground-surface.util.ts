import {
  boxCenterYForTop,
  groundThickness,
  groundTopY,
  type GroundSurfaceKind,
} from './ground-surface.config';
import type { GroundCorridorDef, GroundPlateDef } from './ground-layout.data';
import {
  VIEUX_PORT_GROUND_CORRIDORS,
  VIEUX_PORT_GROUND_PLATES,
} from './ground-layout.data';

export interface GroundSurfaceHit {
  kind: GroundSurfaceKind;
  topY: number;
  centerY: number;
}

function pointInOrientedRect(
  x: number,
  z: number,
  centerX: number,
  centerZ: number,
  halfLocalX: number,
  halfLocalZ: number,
  rotationY: number
): boolean {
  const dx = x - centerX;
  const dz = z - centerZ;
  const cos = Math.cos(-rotationY);
  const sin = Math.sin(-rotationY);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  return Math.abs(localX) <= halfLocalX && Math.abs(localZ) <= halfLocalZ;
}

function classifyInCorridor(
  x: number,
  z: number,
  corridor: GroundCorridorDef
): GroundSurfaceKind | null {
  const halfRoad = corridor.roadWidth * 0.5;
  const halfSw = corridor.sidewalkWidth;
  const curbHalf = 0.21;
  const outerHalf = halfRoad + corridor.sidewalkWidth;

  if (
    !pointInOrientedRect(
      x,
      z,
      corridor.centerX,
      corridor.centerZ,
      outerHalf,
      corridor.length * 0.5,
      corridor.rotationY
    )
  ) {
    return null;
  }

  const dx = x - corridor.centerX;
  const dz = z - corridor.centerZ;
  const cos = Math.cos(-corridor.rotationY);
  const sin = Math.sin(-corridor.rotationY);
  const localX = dx * cos - dz * sin;

  const absX = Math.abs(localX);
  if (absX <= halfRoad) return 'road';
  if (absX <= halfRoad + curbHalf) return 'curb';
  if (absX <= outerHalf) return 'sidewalk';
  return null;
}

function classifyInPlate(x: number, z: number, plate: GroundPlateDef): GroundSurfaceKind | null {
  if (x >= plate.minX && x <= plate.maxX && z >= plate.minZ && z <= plate.maxZ) {
    return plate.kind;
  }
  return null;
}

export function classifyGroundSurface(
  x: number,
  z: number,
  corridors: readonly GroundCorridorDef[] = VIEUX_PORT_GROUND_CORRIDORS,
  plates: readonly GroundPlateDef[] = VIEUX_PORT_GROUND_PLATES
): GroundSurfaceKind {
  for (const plate of plates) {
    const kind = classifyInPlate(x, z, plate);
    if (kind) return kind;
  }

  for (const corridor of corridors) {
    const kind = classifyInCorridor(x, z, corridor);
    if (kind) return kind;
  }

  return 'default';
}

export function groundSurfaceHitAt(
  x: number,
  z: number,
  corridors?: readonly GroundCorridorDef[],
  plates?: readonly GroundPlateDef[]
): GroundSurfaceHit {
  const kind = classifyGroundSurface(x, z, corridors, plates);
  const topY = groundTopY(kind);
  const thickness = groundThickness(kind);
  return {
    kind,
    topY,
    centerY: boxCenterYForTop(topY, thickness),
  };
}

/** Profondeur route vs trottoir (m) — contrôle qualité Phase 1. */
export function roadSidewalkStepMeters(
  corridors: readonly GroundCorridorDef[] = VIEUX_PORT_GROUND_CORRIDORS
): number {
  if (corridors.length === 0) return 0;
  return groundTopY('sidewalk') - groundTopY('road');
}
