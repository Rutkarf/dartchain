import * as THREE from 'three';

import type { GeoCoordinateService } from './geo-coordinate.service';
import {
  GEO_REFERENCE_CONFIG,
  type BuildingPlacementAudit,
  type GeoBuilding,
  type GeoFootprintPoint,
  type GeoReferenceConfig,
} from './geo-reference.config';
import { isHarborWaterAt } from './vieux-port-layout.util';

export interface GeoBuildingMeshResult {
  group: THREE.Group;
  center: THREE.Vector3;
  collider: { minX: number; maxX: number; minZ: number; maxZ: number };
  audit: BuildingPlacementAudit;
}

export function geoFootprintToShapePoints(
  footprint: GeoFootprintPoint[],
  geo: GeoCoordinateService
): THREE.Vector2[] {
  return footprint.slice(0, -1).map((point) => {
    const world = geo.geoToWorld(point.latitude, point.longitude, 0);
    return new THREE.Vector2(world.x, -world.z);
  });
}

export function footprintCentroid(
  footprint: GeoFootprintPoint[],
  geo: GeoCoordinateService
): THREE.Vector3 {
  const points = footprint.slice(0, -1);
  const world = points.map((p) => geo.geoToWorld(p.latitude, p.longitude, 0));
  const center = new THREE.Vector3();
  for (const p of world) center.add(p);
  center.divideScalar(world.length || 1);
  return center;
}

export function footprintBounds(
  footprint: GeoFootprintPoint[],
  geo: GeoCoordinateService
): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const world = footprint.map((p) => geo.geoToWorld(p.latitude, p.longitude, 0));
  const xs = world.map((p) => p.x);
  const zs = world.map((p) => p.z);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

export function createBuildingFromGeoData(
  building: GeoBuilding,
  geo: GeoCoordinateService,
  materials: {
    wall: THREE.Material;
    roof?: THREE.Material;
  },
  geoReference: GeoReferenceConfig = GEO_REFERENCE_CONFIG
): GeoBuildingMeshResult | null {
  const shapePoints = geoFootprintToShapePoints(building.footprint, geo);
  if (shapePoints.length < 3) return null;

  const height =
    building.heightMeters ??
    (building.levels != null ? building.levels * 3.1 : 12);

  const center = footprintCentroid(building.footprint, geo);
  const bounds = footprintBounds(building.footprint, geo);
  const width = Math.max(2, bounds.maxX - bounds.minX);
  const depth = Math.max(2, bounds.maxZ - bounds.minZ);

  let wallMesh: THREE.Mesh;
  try {
    const shape = new THREE.Shape(shapePoints);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
    });
    geometry.rotateX(-Math.PI / 2);
    wallMesh = new THREE.Mesh(geometry, materials.wall);
  } catch {
    // Polygones OSM dégénérés → AABB fiable.
    const box = new THREE.BoxGeometry(width, height, depth);
    wallMesh = new THREE.Mesh(box, materials.wall);
    wallMesh.position.set(center.x, height * 0.5, center.z);
  }

  const group = new THREE.Group();
  group.name = building.id;
  group.userData = {
    sourceId: building.sourceId,
    source: building.source,
    confidence: building.confidence,
    geoBuilding: true,
  };

  wallMesh.name = building.id;
  wallMesh.castShadow = false;
  wallMesh.receiveShadow = false;
  group.add(wallMesh);

  if (materials.roof) {
    try {
      const roofGeo = new THREE.ShapeGeometry(new THREE.Shape(shapePoints));
      roofGeo.rotateX(-Math.PI / 2);
      const roof = new THREE.Mesh(roofGeo, materials.roof);
      roof.name = `${building.id}-roof`;
      roof.position.y = height + 0.08;
      group.add(roof);
    } catch {
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(width * 1.02, 0.45, depth * 1.02),
        materials.roof
      );
      roof.name = `${building.id}-roof`;
      roof.position.set(center.x, height + 0.22, center.z);
      group.add(roof);
    }
  }

  const sourceCentroid = building.footprint[0];

  const audit: BuildingPlacementAudit = {
    buildingId: building.id,
    sourcePosition: {
      latitude: sourceCentroid.latitude,
      longitude: sourceCentroid.longitude,
    },
    worldPosition: center.clone(),
    expectedWorldPosition: center.clone(),
    errorMeters: 0,
    intersectsRoad: false,
    intersectsWater: isHarborWaterAt(center.x, center.z),
    floating: center.y > 0.5,
    buried: center.y < -0.5,
    confidence: building.confidence,
    source: building.sourceId,
  };

  void geoReference;

  return { group, center, collider: bounds, audit };
}

/** Massing AABB depuis empreinte GPS — toujours visible (pas d’Extrude). */
export function createBoxBuildingFromGeoData(
  building: GeoBuilding,
  geo: GeoCoordinateService,
  materials: { wall: THREE.Material; roof?: THREE.Material }
): GeoBuildingMeshResult | null {
  if (building.footprint.length < 4) return null;

  const height =
    building.heightMeters ??
    (building.levels != null ? building.levels * 3.1 : 12);
  const center = footprintCentroid(building.footprint, geo);
  const bounds = footprintBounds(building.footprint, geo);
  const width = Math.max(3, bounds.maxX - bounds.minX);
  const depth = Math.max(3, bounds.maxZ - bounds.minZ);

  const group = new THREE.Group();
  group.name = building.id;
  group.userData = {
    sourceId: building.sourceId,
    source: building.source,
    confidence: building.confidence,
    geoBuilding: true,
  };

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    materials.wall
  );
  body.name = building.id;
  body.position.set(center.x, height * 0.5, center.z);
  body.frustumCulled = true;
  group.add(body);

  if (materials.roof) {
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width * 1.02, 0.5, depth * 1.02),
      materials.roof
    );
    roof.name = `${building.id}-roof`;
    roof.position.set(center.x, height + 0.25, center.z);
    group.add(roof);
  }

  const sourceCentroid = building.footprint[0];
  const audit: BuildingPlacementAudit = {
    buildingId: building.id,
    sourcePosition: {
      latitude: sourceCentroid.latitude,
      longitude: sourceCentroid.longitude,
    },
    worldPosition: center.clone(),
    expectedWorldPosition: center.clone(),
    errorMeters: 0,
    intersectsRoad: false,
    intersectsWater: isHarborWaterAt(center.x, center.z),
    floating: false,
    buried: false,
    confidence: building.confidence,
    source: building.sourceId,
  };

  return { group, center, collider: bounds, audit };
}

export function auditBuildingPlacement(
  buildingId: string,
  worldPosition: THREE.Vector3,
  expectedWorld: THREE.Vector3,
  confidence: 'low' | 'medium' | 'high',
  source: string,
  sourceGeo: { latitude: number; longitude: number }
): BuildingPlacementAudit {
  const errorMeters = worldPosition.distanceTo(expectedWorld);
  return {
    buildingId,
    sourcePosition: sourceGeo,
    worldPosition: worldPosition.clone(),
    expectedWorldPosition: expectedWorld.clone(),
    errorMeters,
    intersectsRoad: false,
    intersectsWater: isHarborWaterAt(worldPosition.x, worldPosition.z),
    floating: worldPosition.y > 1,
    buried: worldPosition.y < -0.25,
    confidence,
    source,
  };
}

export function classifyPlacementError(errorMeters: number): 'ok' | 'acceptable' | 'warning' | 'critical' {
  if (errorMeters < 1) return 'ok';
  if (errorMeters < 5) return 'acceptable';
  if (errorMeters < 15) return 'warning';
  return 'critical';
}
