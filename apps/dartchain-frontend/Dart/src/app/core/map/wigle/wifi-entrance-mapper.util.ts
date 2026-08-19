import type { WigleGeoPoint } from './wigle-point.types';
import type { BuildingReference } from './wigle.types';
import { attachEntranceToBuilding, buildingDisplayPosition } from './building-entrance.util';
import { WIGLE_GEO_CONFIG, WIGLE_VISUAL_CONFIG } from './wigle-visual.config';

export type GroundHeightResolver = (worldX: number, worldZ: number) => number;

function isInsideBuilding(x: number, z: number, building: BuildingReference): boolean {
  return x >= building.minX && x <= building.maxX && z >= building.minZ && z <= building.maxZ;
}

function distanceToBuildingBounds(x: number, z: number, building: BuildingReference): number {
  const nearestX = Math.max(building.minX, Math.min(x, building.maxX));
  const nearestZ = Math.max(building.minZ, Math.min(z, building.maxZ));
  const dx = x - nearestX;
  const dz = z - nearestZ;
  return Math.sqrt(dx * dx + dz * dz);
}

function findBuildingForPoint(
  point: WigleGeoPoint,
  buildings: BuildingReference[]
): BuildingReference | undefined {
  if (point.buildingId) {
    return buildings.find((b) => b.id === point.buildingId);
  }

  for (const building of buildings) {
    if (isInsideBuilding(point.worldX, point.worldZ, building)) {
      return building;
    }
  }

  let nearest: BuildingReference | undefined;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (const building of buildings) {
    const distance = distanceToBuildingBounds(point.worldX, point.worldZ, building);
    if (distance < nearestDist) {
      nearestDist = distance;
      nearest = building;
    }
  }

  if (nearest && nearestDist <= WIGLE_VISUAL_CONFIG.nearestBuildingThresholdMeters) {
    return nearest;
  }
  return undefined;
}

/**
 * Place chaque point réseau à la porte d'entrée du bâtiment associé (WiFi à l'accès).
 */
export function mapGeoPointsToBuildingEntrances(
  points: WigleGeoPoint[],
  buildings: BuildingReference[],
  resolveGroundY?: GroundHeightResolver | null
): WigleGeoPoint[] {
  if (buildings.length === 0) {
    return points;
  }

  const refs = buildings.map((b) => attachEntranceToBuilding(b));

  return points.map((point) => {
    const building = findBuildingForPoint(point, refs);
    if (!building) {
      return point;
    }

    const door = buildingDisplayPosition(building);
    let worldY = point.worldY;
    if (resolveGroundY) {
      const surface = resolveGroundY(door.x, door.z);
      if (Number.isFinite(surface)) {
        worldY = surface + WIGLE_GEO_CONFIG.groundOffsetY;
      }
    }

    return {
      ...point,
      worldX: door.x,
      worldY,
      worldZ: door.z,
      buildingId: building.id,
      buildingLabel: building.label,
      mappedAtEntrance: true,
    };
  });
}
