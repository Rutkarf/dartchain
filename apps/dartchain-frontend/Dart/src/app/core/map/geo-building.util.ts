import * as THREE from 'three';
import { ShapeUtils } from 'three';

import {
  resolveGeoBuildingHeight,
  type BuildingHeightSource,
  type ResolvedBuildingHeight,
} from './building-height.util';
import type { GeoCoordinateService } from './geo-coordinate.service';
import {
  GEO_REFERENCE_CONFIG,
  type BuildingPlacementAudit,
  type GeoBuilding,
  type GeoFootprintPoint,
  type GeoReferenceConfig,
} from './geo-reference.config';
import { isHarborWaterAt } from './vieux-port-layout.util';
import {
  createCorniceMaterial,
  createCadastrePlinthMaterial,
  tuneRoofMaterialForFootprint,
  tuneWallMaterialForFootprint,
} from './building-facade.factory';
import { getOsmExtrusionCache } from './osm-extrusion-cache.util';

export type BuildingMassingMode = 'extrude' | 'box';
export type BuildingVisualTier = 'standard' | 'cadastre' | 'hero';

export interface GeoBuildingMeshResult {
  group: THREE.Group;
  center: THREE.Vector3;
  collider: { minX: number; maxX: number; minZ: number; maxZ: number };
  audit: BuildingPlacementAudit;
  heightMeters: number;
  heightSource: BuildingHeightSource;
}

export interface CreateGeoBuildingOptions {
  massing?: BuildingMassingMode;
  visualTier?: BuildingVisualTier;
  osmTags?: Record<string, string>;
  geoReference?: GeoReferenceConfig;
  corniceMaterial?: THREE.Material;
  plinthMaterial?: THREE.Material;
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

export function worldPointsToShapePoints(
  worldPoints: ReadonlyArray<{ x: number; z: number }>
): THREE.Vector2[] {
  return worldPoints.map((p) => new THREE.Vector2(p.x, -p.z));
}

/** Three.js ExtrudeGeometry — contour extérieur horaire (vu depuis +Z extrusion). */
export function ensureExtrudeShapeWinding(points: THREE.Vector2[]): THREE.Vector2[] {
  if (points.length < 3) return points;
  return ShapeUtils.isClockWise(points) ? points : [...points].reverse();
}

export function extrudeFootprintGeometry(
  shapePoints: THREE.Vector2[],
  heightMeters: number
): THREE.BufferGeometry | null {
  if (shapePoints.length < 3 || heightMeters <= 0) return null;
  const wound = ensureExtrudeShapeWinding(shapePoints);
  const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(wound), {
    depth: heightMeters,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.035,
    bevelSegments: 1,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

export function footprintRoofGeometry(shapePoints: THREE.Vector2[]): THREE.BufferGeometry | null {
  if (shapePoints.length < 3) return null;
  const wound = ensureExtrudeShapeWinding(shapePoints);
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(wound));
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export function footprintCentroid(
  footprint: ReadonlyArray<GeoFootprintPoint>,
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

function meshVerticalExtent(mesh: THREE.Mesh): { minY: number; maxY: number } {
  const box = new THREE.Box3().setFromObject(mesh);
  return { minY: box.min.y, maxY: box.max.y };
}

function scaleShapePoints(points: THREE.Vector2[], scale: number): THREE.Vector2[] {
  if (points.length < 3) return points;
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  return points.map((p) => new THREE.Vector2(cx + (p.x - cx) * scale, cy + (p.y - cy) * scale));
}

function addRoofCornice(
  group: THREE.Group,
  shapePoints: THREE.Vector2[],
  heightMeters: number,
  material: THREE.Material
): void {
  const lip = scaleShapePoints(shapePoints, 1.028);
  const geo = extrudeFootprintGeometry(lip, 0.34);
  if (!geo) return;
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = `${group.name}-cornice`;
  mesh.position.y = heightMeters - 0.34;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  group.add(mesh);
}

function addRoofParapet(
  group: THREE.Group,
  shapePoints: THREE.Vector2[],
  heightMeters: number,
  material: THREE.Material
): void {
  const lip = scaleShapePoints(shapePoints, 1.012);
  const geo = extrudeFootprintGeometry(lip, 0.22);
  if (!geo) return;
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = `${group.name}-parapet`;
  mesh.position.y = heightMeters;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  group.add(mesh);
}

function addGroundPlinth(
  group: THREE.Group,
  shapePoints: THREE.Vector2[],
  material: THREE.Material,
  heightMeters: number
): void {
  const plinthH = Math.min(0.62, Math.max(0.38, heightMeters * 0.045));
  const inset = scaleShapePoints(shapePoints, 0.992);
  const geo = extrudeFootprintGeometry(inset, plinthH);
  if (!geo) return;
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = `${group.name}-plinth`;
  mesh.position.y = 0.01;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  group.add(mesh);
}

function resolveWallMaterial(
  materials: { wall: THREE.Material; roof?: THREE.Material },
  heightMeters: number,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  visualTier: BuildingVisualTier
): THREE.Material {
  const wall = materials.wall;
  if (!(wall instanceof THREE.MeshStandardMaterial)) {
    return wall;
  }
  if (visualTier === 'standard') {
    return wall;
  }
  return tuneWallMaterialForFootprint(wall, heightMeters, bounds, true);
}

function resolveRoofMaterial(
  materials: { wall: THREE.Material; roof?: THREE.Material },
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  visualTier: BuildingVisualTier
): THREE.Material | undefined {
  const roof = materials.roof;
  if (!roof) return undefined;
  if (visualTier === 'standard') {
    return roof;
  }
  if (!(roof instanceof THREE.MeshStandardMaterial)) {
    return roof;
  }
  return tuneRoofMaterialForFootprint(roof, bounds, true);
}

function buildExtrudeMassing(
  building: GeoBuilding,
  shapePoints: THREE.Vector2[],
  heightMeters: number,
  center: THREE.Vector3,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  materials: { wall: THREE.Material; roof?: THREE.Material },
  visualTier: BuildingVisualTier,
  corniceMaterial?: THREE.Material,
  plinthMaterial?: THREE.Material
): THREE.Group | null {
  const width = Math.max(2, bounds.maxX - bounds.minX);
  const depth = Math.max(2, bounds.maxZ - bounds.minZ);

  const group = new THREE.Group();
  group.name = building.id;

  const wallMaterial = resolveWallMaterial(materials, heightMeters, bounds, visualTier);
  const roofMaterial = resolveRoofMaterial(materials, bounds, visualTier);

  const wallExtruded = getOsmExtrusionCache().cloneWallExtrusion(shapePoints, heightMeters);
  if (wallExtruded) {
    const wallMesh = new THREE.Mesh(wallExtruded.geometry, wallMaterial);
    wallMesh.name = building.id;
    wallMesh.position.set(wallExtruded.offsetX, 0, wallExtruded.offsetZ);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = false;
    group.add(wallMesh);

    const extent = meshVerticalExtent(wallMesh);
    if (extent.maxY < heightMeters * 0.45) {
      wallExtruded.geometry.dispose();
      group.clear();
      return buildBoxMassing(building, center, bounds, width, depth, heightMeters, materials);
    }
  } else {
    return buildBoxMassing(building, center, bounds, width, depth, heightMeters, materials);
  }

  if (roofMaterial) {
    const roofExtruded = getOsmExtrusionCache().cloneRoofFootprint(shapePoints);
    if (roofExtruded) {
      const roof = new THREE.Mesh(roofExtruded.geometry, roofMaterial);
      roof.name = `${building.id}-roof`;
      roof.position.set(roofExtruded.offsetX, heightMeters + 0.1, roofExtruded.offsetZ);
      group.add(roof);
    } else {
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(width * 1.03, 0.48, depth * 1.03),
        roofMaterial
      );
      roof.name = `${building.id}-roof`;
      roof.position.set(center.x, heightMeters + 0.24, center.z);
      group.add(roof);
    }
  }

  if (visualTier === 'hero' || visualTier === 'cadastre') {
    addRoofCornice(
      group,
      shapePoints,
      heightMeters,
      corniceMaterial ?? createCorniceMaterial()
    );
    addRoofParapet(
      group,
      shapePoints,
      heightMeters,
      corniceMaterial ?? createCorniceMaterial()
    );
  }

  if (visualTier === 'cadastre') {
    addGroundPlinth(
      group,
      shapePoints,
      plinthMaterial ?? createCadastrePlinthMaterial(),
      heightMeters
    );
  }

  return group;
}

const BOX_GEOMETRY_POOL = new Map<string, THREE.BoxGeometry>();

function quantizeDim(value: number): number {
  return Math.max(0.5, Math.round(value * 2) / 2);
}

function pooledBoxGeometry(width: number, height: number, depth: number): THREE.BoxGeometry {
  const key = `${quantizeDim(width)}x${quantizeDim(height)}x${quantizeDim(depth)}`;
  let geometry = BOX_GEOMETRY_POOL.get(key);
  if (!geometry) {
    const [w, h, d] = key.split('x').map(Number);
    geometry = new THREE.BoxGeometry(w, h, d);
    BOX_GEOMETRY_POOL.set(key, geometry);
  }
  return geometry;
}

function buildBoxMassing(
  building: GeoBuilding,
  center: THREE.Vector3,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  width: number,
  depth: number,
  heightMeters: number,
  materials: { wall: THREE.Material; roof?: THREE.Material }
): THREE.Group {
  const group = new THREE.Group();
  group.name = building.id;

  const body = new THREE.Mesh(
    pooledBoxGeometry(width, heightMeters, depth),
    materials.wall
  );
  body.name = building.id;
  body.position.set(center.x, heightMeters * 0.5, center.z);
  body.frustumCulled = true;
  group.add(body);

  if (materials.roof) {
    const roof = new THREE.Mesh(
      pooledBoxGeometry(width * 1.02, 0.5, depth * 1.02),
      materials.roof
    );
    roof.name = `${building.id}-roof`;
    roof.position.set(center.x, heightMeters + 0.25, center.z);
    group.add(roof);
  }

  void bounds;
  return group;
}

function buildAudit(
  building: GeoBuilding,
  center: THREE.Vector3,
  height: ResolvedBuildingHeight,
  geoReference: GeoReferenceConfig
): BuildingPlacementAudit {
  const sourceCentroid = building.footprint[0];
  void geoReference;
  return {
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
    heightSource: height.heightSource,
    heightMeters: height.heightMeters,
  };
}

/** Factory unifiée Phase 3 — empreinte GPS → massing extrude (fallback box). */
export function createGeoBuildingMesh(
  building: GeoBuilding,
  geo: GeoCoordinateService,
  materials: { wall: THREE.Material; roof?: THREE.Material },
  options: CreateGeoBuildingOptions = {}
): GeoBuildingMeshResult | null {
  const shapePoints = geoFootprintToShapePoints(building.footprint, geo);
  if (shapePoints.length < 3) return null;

  const height = resolveGeoBuildingHeight(building, options.osmTags);
  const center = footprintCentroid(building.footprint, geo);
  const bounds = footprintBounds(building.footprint, geo);
  const width = Math.max(2, bounds.maxX - bounds.minX);
  const depth = Math.max(2, bounds.maxZ - bounds.minZ);
  const massing = options.massing ?? 'extrude';
  const visualTier = options.visualTier ?? 'standard';

  const group =
    massing === 'box'
      ? buildBoxMassing(building, center, bounds, width, depth, height.heightMeters, materials)
      : buildExtrudeMassing(
          building,
          shapePoints,
          height.heightMeters,
          center,
          bounds,
          materials,
          visualTier,
          options.corniceMaterial,
          options.plinthMaterial
        );

  if (!group) return null;

  group.userData = {
    sourceId: building.sourceId,
    source: building.source,
    confidence: building.confidence,
    geoBuilding: true,
    heightSource: height.heightSource,
    heightMeters: height.heightMeters,
    visualTier,
  };

  return {
    group,
    center,
    collider: bounds,
    audit: buildAudit(building, center, height, options.geoReference ?? GEO_REFERENCE_CONFIG),
    heightMeters: height.heightMeters,
    heightSource: height.heightSource,
  };
}

/** OSM way → GeoBuilding éphémère pour le streaming. */
export function createOsmFootprintBuildingMesh(
  id: string,
  points: ReadonlyArray<{ latitude: number; longitude: number }>,
  heightMeters: number,
  heightSource: BuildingHeightSource,
  geo: GeoCoordinateService,
  materials: { wall: THREE.Material; roof?: THREE.Material },
  massing: BuildingMassingMode = 'extrude'
): GeoBuildingMeshResult | null {
  if (points.length < 4) return null;
  const footprint: GeoFootprintPoint[] = points.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));
  const building: GeoBuilding = {
    id,
    sourceId: id,
    footprint,
    heightMeters,
    source: 'osm',
    confidence: 'medium',
  };
  const built = createGeoBuildingMesh(building, geo, materials, { massing });
  if (!built) return null;
  built.heightSource = heightSource;
  built.audit.heightSource = heightSource;
  built.audit.heightMeters = heightMeters;
  built.group.userData['heightSource'] = heightSource;
  return built;
}

/** @deprecated Utiliser createGeoBuildingMesh({ massing: 'extrude' }). */
export function createBuildingFromGeoData(
  building: GeoBuilding,
  geo: GeoCoordinateService,
  materials: { wall: THREE.Material; roof?: THREE.Material },
  geoReference: GeoReferenceConfig = GEO_REFERENCE_CONFIG
): GeoBuildingMeshResult | null {
  return createGeoBuildingMesh(building, geo, materials, {
    massing: 'extrude',
    geoReference,
  });
}

/** Massing AABB — fallback explicite ou perf lointaine. */
export function createBoxBuildingFromGeoData(
  building: GeoBuilding,
  geo: GeoCoordinateService,
  materials: { wall: THREE.Material; roof?: THREE.Material }
): GeoBuildingMeshResult | null {
  return createGeoBuildingMesh(building, geo, materials, { massing: 'box' });
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

export function applyBuildingMaterialDefaults(material: THREE.Material): void {
  (material as THREE.Material & { fog?: boolean }).fog = false;
  if ('side' in material) {
    (material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  }
}
