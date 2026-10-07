import * as THREE from 'three';

import type { GeoCoordinateService } from '../geo-coordinate.service';
import { WIGLE_VISUAL_CONFIG } from './wigle-visual.config';
import type {
  BuildingDataAssociation,
  BuildingReference,
  WIGLEObservation,
  WigleConfidence,
} from './wigle.types';

export interface GeoCoordinateConverter {
  geoToWorld(latitude: number, longitude: number, altitude?: number): THREE.Vector3;
}

export function geoServiceAsConverter(geo: GeoCoordinateService): GeoCoordinateConverter {
  return {
    geoToWorld: (latitude, longitude, altitude) =>
      geo.geoToWorld(latitude, longitude, altitude ?? 0),
  };
}

function isInsideFootprint(x: number, z: number, building: BuildingReference): boolean {
  return x >= building.minX && x <= building.maxX && z >= building.minZ && z <= building.maxZ;
}

function distanceToBuilding(x: number, z: number, building: BuildingReference): number {
  const nearestX = THREE.MathUtils.clamp(x, building.minX, building.maxX);
  const nearestZ = THREE.MathUtils.clamp(z, building.minZ, building.maxZ);
  const dx = x - nearestX;
  const dz = z - nearestZ;
  return Math.sqrt(dx * dx + dz * dz);
}

function confidenceFromDistance(
  distance: number,
  associationType: BuildingDataAssociation['associationType']
): WigleConfidence {
  if (associationType === 'inside-footprint') {
    return distance <= 3 ? 'high' : 'medium';
  }
  if (associationType === 'nearest-building') {
    if (distance <= 8) return 'medium';
    return 'low';
  }
  return 'low';
}

export function associateWIGLEObservationToBuilding(
  observation: WIGLEObservation,
  buildings: BuildingReference[],
  coordinateConverter: GeoCoordinateConverter
): BuildingDataAssociation {
  const worldPosition = coordinateConverter.geoToWorld(
    observation.latitudeApprox,
    observation.longitudeApprox,
    observation.altitudeApprox ?? 0
  );

  let containing: BuildingReference | undefined;
  for (const building of buildings) {
    if (isInsideFootprint(worldPosition.x, worldPosition.z, building)) {
      containing = building;
      break;
    }
  }

  if (containing) {
    const distance = worldPosition.distanceTo(
      new THREE.Vector3(containing.center.x, worldPosition.y, containing.center.z)
    );
    return {
      observationId: observation.id,
      buildingId: containing.id,
      worldPosition: { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z },
      distanceToBuilding: distance,
      confidence: confidenceFromDistance(distance, 'inside-footprint'),
      associationType: 'inside-footprint',
    };
  }

  let nearest: BuildingReference | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const building of buildings) {
    const distance = distanceToBuilding(worldPosition.x, worldPosition.z, building);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = building;
    }
  }

  const threshold = WIGLE_VISUAL_CONFIG.nearestBuildingThresholdMeters;
  if (nearest && nearestDistance <= threshold) {
    return {
      observationId: observation.id,
      buildingId: nearest.id,
      worldPosition: { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z },
      distanceToBuilding: nearestDistance,
      confidence: confidenceFromDistance(nearestDistance, 'nearest-building'),
      associationType: 'nearest-building',
    };
  }

  return {
    observationId: observation.id,
    worldPosition: { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z },
    distanceToBuilding: nearestDistance === Number.POSITIVE_INFINITY ? undefined : nearestDistance,
    confidence: 'low',
    associationType: 'unmatched',
  };
}

export function densityTierFromCount(count: number): 'low' | 'medium' | 'high' | 'unknown' {
  if (count <= 0) return 'unknown';
  if (count <= 2) return 'low';
  if (count <= 5) return 'medium';
  return 'high';
}

export function colorForDensityTier(tier: ReturnType<typeof densityTierFromCount>): number {
  switch (tier) {
    case 'low':
      return WIGLE_VISUAL_CONFIG.lowDensity;
    case 'medium':
      return WIGLE_VISUAL_CONFIG.mediumDensity;
    case 'high':
      return WIGLE_VISUAL_CONFIG.highDensity;
    default:
      return WIGLE_VISUAL_CONFIG.unknown;
  }
}
