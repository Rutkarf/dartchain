import type { BuildingEntrance, BuildingReference } from './wigle.types';

const ENTRANCE_INSET = 0.16;

/** Porte d'entrée sur la face la plus longue, orientée vers l'extérieur (même heuristique que les façades). */
export function resolveEntranceFromBox(params: {
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  height: number;
}): BuildingEntrance {
  const useXFace = params.width >= params.depth;
  if (useXFace) {
    const signDir = params.centerX >= 0 ? 1 : -1;
    return {
      x: params.centerX + signDir * (params.width / 2 + ENTRANCE_INSET),
      y: Math.max(1.2, params.height * 0.08),
      z: params.centerZ,
      facingRad: signDir > 0 ? -Math.PI / 2 : Math.PI / 2,
    };
  }
  const signDir = params.centerZ >= 0 ? 1 : -1;
  return {
    x: params.centerX,
    y: Math.max(1.2, params.height * 0.08),
    z: params.centerZ + signDir * (params.depth / 2 + ENTRANCE_INSET),
    facingRad: signDir > 0 ? Math.PI : 0,
  };
}

export function resolveEntranceFromFootprint(
  worldPoints: Array<{ x: number; z: number }>,
  height: number
): BuildingEntrance {
  if (worldPoints.length === 0) {
    return { x: 0, y: 1.2, z: 0, facingRad: 0 };
  }
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  let sumX = 0;
  let sumZ = 0;
  for (const point of worldPoints) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
    sumX += point.x;
    sumZ += point.z;
  }
  const width = maxX - minX;
  const depth = maxZ - minZ;
  return resolveEntranceFromBox({
    centerX: sumX / worldPoints.length,
    centerZ: sumZ / worldPoints.length,
    width,
    depth,
    height,
  });
}

export function attachEntranceToBuilding(building: BuildingReference): BuildingReference {
  if (building.entrance) {
    return building;
  }
  const width = building.maxX - building.minX;
  const depth = building.maxZ - building.minZ;
  return {
    ...building,
    entrance: resolveEntranceFromBox({
      centerX: building.center.x,
      centerZ: building.center.z,
      width,
      depth,
      height: building.height,
    }),
  };
}

export function buildingDisplayPosition(building: BuildingReference): {
  x: number;
  y: number;
  z: number;
} {
  const entrance = building.entrance ?? attachEntranceToBuilding(building).entrance!;
  return { x: entrance.x, y: entrance.y, z: entrance.z };
}
