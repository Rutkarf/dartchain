import * as THREE from 'three';

import type { GeoCoordinateService } from './geo-coordinate.service';
import {
  boxCenterYForTop,
  GROUND_SURFACE_LEVELS,
  groundThickness,
  groundTopY,
} from './ground-surface.config';
import type { CrosswalkDef, GroundCorridorDef, GroundPlateDef } from './ground-layout.data';
import type { GroundMaterialSet } from './ground-material.factory';
import {
  OSM_STREET_MIN_WAY_LENGTH_M,
  OSM_STREET_POLYGON_CAP,
} from './ground-osm.config';
import {
  bufferOpenPolylineXZ,
  polylineLengthMeters,
  ringAreaMetersSq,
  type XzPoint,
} from './highway-buffer.util';

export interface GroundMeshBuildResult {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

function addBoxStrip(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  name: string,
  width: number,
  height: number,
  depth: number,
  centerX: number,
  centerY: number,
  centerZ: number,
  rotationY: number,
  material: THREE.Material
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(width, height, depth);
  geometries.push(geo);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.position.set(centerX, centerY, centerZ);
  mesh.rotation.y = rotationY;
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  group.add(mesh);
  return mesh;
}

function buildCorridorStrip(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  corridor: GroundCorridorDef,
  materials: GroundMaterialSet
): void {
  const { centerX, centerZ, length, roadWidth, sidewalkWidth, rotationY, id } = corridor;
  const halfRoad = roadWidth * 0.5;
  const curbW = GROUND_SURFACE_LEVELS.curbWidth;

  const roadTh = groundThickness('road');
  const roadTop = groundTopY('road');
  addBoxStrip(
    group,
    geometries,
    `ground-road-${id}`,
    roadWidth,
    roadTh,
    length,
    centerX,
    boxCenterYForTop(roadTop, roadTh),
    centerZ,
    rotationY,
    materials.road
  );

  const swTh = groundThickness('sidewalk');
  const swTop = groundTopY('sidewalk');
  const swCenterY = boxCenterYForTop(swTop, swTh);
  const lateralOffset = halfRoad + sidewalkWidth * 0.5;

  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);

  for (const side of [-1, 1] as const) {
    const offsetX = side * lateralOffset * cos;
    const offsetZ = side * lateralOffset * sin;
    addBoxStrip(
      group,
      geometries,
      `ground-sidewalk-${id}-${side > 0 ? 'right' : 'left'}`,
      sidewalkWidth,
      swTh,
      length,
      centerX + offsetX,
      swCenterY,
      centerZ + offsetZ,
      rotationY,
      materials.sidewalk
    );

    const curbTh = groundThickness('curb');
    const curbTop = groundTopY('curb');
    const curbOffset = halfRoad + curbW * 0.5;
    const curbX = centerX + side * curbOffset * cos;
    const curbZ = centerZ + side * curbOffset * sin;
    addBoxStrip(
      group,
      geometries,
      `ground-curb-${id}-${side > 0 ? 'right' : 'left'}`,
      curbW,
      curbTh,
      length,
      curbX,
      boxCenterYForTop(curbTop, curbTh),
      curbZ,
      rotationY,
      materials.curb
    );

    const gutterTh = 0.08;
    const gutterOffset = halfRoad + curbW * 0.85;
    addBoxStrip(
      group,
      geometries,
      `ground-gutter-${id}-${side > 0 ? 'right' : 'left'}`,
      0.55,
      gutterTh,
      length - 2,
      centerX + side * gutterOffset * cos,
      boxCenterYForTop(0.06, gutterTh),
      centerZ + side * gutterOffset * sin,
      rotationY,
      materials.gutter
    );

    const shadowLen = length - 4;
    const shadowGeo = new THREE.PlaneGeometry(curbW * 1.6, shadowLen);
    geometries.push(shadowGeo);
    const shadow = new THREE.Mesh(shadowGeo, materials.contactShadow);
    shadow.name = `ground-curb-shadow-${id}-${side > 0 ? 'right' : 'left'}`;
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(curbX, GROUND_SURFACE_LEVELS.contactShadowY, curbZ);
    shadow.rotation.z = rotationY;
    group.add(shadow);
  }
}

function buildPlate(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  plate: GroundPlateDef,
  materials: GroundMaterialSet
): void {
  const width = plate.maxX - plate.minX;
  const depth = plate.maxZ - plate.minZ;
  const cx = (plate.minX + plate.maxX) * 0.5;
  const cz = (plate.minZ + plate.maxZ) * 0.5;
  const surfaceKind = plate.kind === 'quay' ? 'quay' : 'esplanade';
  const th = groundThickness(surfaceKind);
  const top = groundTopY(surfaceKind);
  const mat = plate.kind === 'quay' ? materials.quay : materials.esplanade;
  addBoxStrip(
    group,
    geometries,
    `ground-plate-${plate.id}`,
    width,
    th,
    depth,
    cx,
    boxCenterYForTop(top, th),
    cz,
    0,
    mat
  );

  if (plate.kind === 'quay') {
    const shadowGeo = new THREE.PlaneGeometry(width * 0.98, depth * 0.92);
    geometries.push(shadowGeo);
    const shadow = new THREE.Mesh(shadowGeo, materials.contactShadow);
    shadow.name = `ground-plate-shadow-${plate.id}`;
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(cx, GROUND_SURFACE_LEVELS.contactShadowY, cz);
    group.add(shadow);
  }
}

export function createCrosswalkGroup(
  def: CrosswalkDef,
  materials: GroundMaterialSet,
  geometries: THREE.BufferGeometry[],
  stripeDepth = 0.045
): THREE.Group {
  const group = new THREE.Group();
  group.name = `ground-crosswalk-${def.id}`;
  group.position.set(def.x, groundTopY('road'), def.z);
  group.rotation.y = def.rotationY;

  const stripeCount = Math.max(6, Math.round(def.width / 0.9));
  const stripeWidth = def.width / (stripeCount * 1.7);
  const gap = stripeWidth * 0.7;
  const startX = -((stripeCount - 1) * (stripeWidth + gap)) / 2;

  for (let i = 0; i < stripeCount; i++) {
    const geo = new THREE.BoxGeometry(stripeWidth, stripeDepth, def.length);
    geometries.push(geo);
    const stripe = new THREE.Mesh(geo, materials.crosswalkStripe);
    stripe.position.set(startX + i * (stripeWidth + gap), stripeDepth * 0.5, 0);
    group.add(stripe);
  }

  const glowGeo = new THREE.PlaneGeometry(def.width * 0.92, 0.12);
  geometries.push(glowGeo);
  const glow = new THREE.Mesh(
    glowGeo,
    new THREE.MeshBasicMaterial({
      color: 0x40e0ff,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = stripeDepth + 0.01;
  group.add(glow);

  return group;
}

export function buildCityGroundMeshes(
  corridors: readonly GroundCorridorDef[],
  plates: readonly GroundPlateDef[],
  crosswalks: readonly CrosswalkDef[],
  materials: GroundMaterialSet
): GroundMeshBuildResult {
  const group = new THREE.Group();
  group.name = 'marseille-city-ground';
  const geometries: THREE.BufferGeometry[] = [];
  const materialList: THREE.Material[] = Object.values(materials);

  for (const corridor of corridors) {
    buildCorridorStrip(group, geometries, corridor, materials);
  }
  for (const plate of plates) {
    buildPlate(group, geometries, plate, materials);
  }
  for (const crosswalk of crosswalks) {
    group.add(createCrosswalkGroup(crosswalk, materials, geometries));
  }

  return { group, geometries, materials: materialList };
}

/** Polygone bufferisé OSM (empreinte route / trottoir). */
export interface OsmStreetPolygonDef {
  id: string;
  ring: XzPoint[];
  layer: 'road' | 'sidewalk';
  areaSqM: number;
}

/** @deprecated Phase 1 — préférer OsmStreetPolygonDef */
export interface OsmStreetSegmentDef {
  id: string;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  width: number;
  layer: 'road' | 'sidewalk';
}

const HIGHWAY_ROAD_WIDTH: Record<string, number> = {
  primary: 14,
  secondary: 12,
  tertiary: 10,
  residential: 8,
  unclassified: 8,
  living_street: 7,
  service: 5,
  pedestrian: 0,
  footway: 0,
  path: 0,
  steps: 0,
  cycleway: 0,
};

const HIGHWAY_SIDEWALK_WIDTH: Record<string, number> = {
  footway: 2.4,
  path: 2,
  pedestrian: 4,
  steps: 2,
};

export function highwayWidthMeters(highwayType: string): { road: number; sidewalk: number } {
  const key = highwayType.toLowerCase();
  const road = HIGHWAY_ROAD_WIDTH[key] ?? 7;
  const sidewalk = HIGHWAY_SIDEWALK_WIDTH[key] ?? 0;
  return { road, sidewalk };
}

export function osmWayToPolygonDefs(
  id: string,
  points: ReadonlyArray<{ latitude: number; longitude: number }>,
  highwayType: string,
  geo: GeoCoordinateService
): OsmStreetPolygonDef[] {
  const { road, sidewalk } = highwayWidthMeters(highwayType);
  const halfWidth = (road > 0 ? road : sidewalk) * 0.5;
  const layer: 'road' | 'sidewalk' = road > 0 ? 'road' : 'sidewalk';
  if (halfWidth <= 0 || points.length < 2) return [];

  const xz: XzPoint[] = points.map((p) => {
    const w = geo.geoToWorld(p.latitude, p.longitude, 0);
    return { x: w.x, z: w.z };
  });

  if (polylineLengthMeters(xz) < OSM_STREET_MIN_WAY_LENGTH_M) return [];

  const ring = bufferOpenPolylineXZ(xz, halfWidth);
  if (!ring || ring.length < 4) return [];

  const areaSqM = ringAreaMetersSq(ring);
  if (areaSqM <= 0.5) return [];

  return [{ id, ring, layer, areaSqM }];
}

export function osmWayToSegmentDefs(
  id: string,
  points: ReadonlyArray<{ latitude: number; longitude: number }>,
  highwayType: string,
  geo: GeoCoordinateService
): OsmStreetSegmentDef[] {
  const { road, sidewalk } = highwayWidthMeters(highwayType);
  const width = road > 0 ? road : sidewalk;
  const layer: 'road' | 'sidewalk' = road > 0 ? 'road' : 'sidewalk';
  if (width <= 0 || points.length < 2) return [];

  const world = points.map((p) => geo.geoToWorld(p.latitude, p.longitude, 0));
  const segments: OsmStreetSegmentDef[] = [];

  for (let i = 0; i < world.length - 1; i++) {
    const a = world[i];
    const b = world[i + 1];
    segments.push({
      id: `${id}-${i}`,
      ax: a.x,
      az: a.z,
      bx: b.x,
      bz: b.z,
      width,
      layer,
    });
  }
  return segments;
}

function meshBaseYForTop(topY: number, thickness: number): number {
  return topY - thickness;
}

function createGroundPolygonMesh(
  def: OsmStreetPolygonDef,
  materials: GroundMaterialSet,
  geometries: THREE.BufferGeometry[]
): THREE.Mesh | null {
  if (def.ring.length < 4) return null;

  const kind = def.layer;
  const th = groundThickness(kind);
  const top = groundTopY(kind);
  const mat = kind === 'road' ? materials.road : materials.sidewalk;

  try {
    const shapePoints = def.ring.map((p) => new THREE.Vector2(p.x, -p.z));
    const shape = new THREE.Shape(shapePoints);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geometries.push(geo);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `ground-osm-poly-${def.id}`;
    mesh.position.y = meshBaseYForTop(top, th);
    mesh.receiveShadow = false;
    return mesh;
  } catch {
    return null;
  }
}

/**
 * Phase 1.5 — empreintes bufferisées OSM (polygones), triées par aire décroissante.
 */
export function appendOsmStreetPolygons(
  group: THREE.Group,
  polygons: readonly OsmStreetPolygonDef[],
  materials: GroundMaterialSet,
  geometries: THREE.BufferGeometry[],
  maxPolygons = OSM_STREET_POLYGON_CAP
): number {
  const sorted = [...polygons].sort((a, b) => b.areaSqM - a.areaSqM);
  let added = 0;

  for (const def of sorted) {
    if (added >= maxPolygons) break;
    const mesh = createGroundPolygonMesh(def, materials, geometries);
    if (!mesh) continue;
    group.add(mesh);
    added++;
  }

  return added;
}

/** Bordures OSM le long des arêtes route (Phase 1 finition). */
export function appendOsmRoadCurbs(
  group: THREE.Group,
  polygons: readonly OsmStreetPolygonDef[],
  materials: GroundMaterialSet,
  geometries: THREE.BufferGeometry[],
  maxEdges = 240
): number {
  let edges = 0;
  for (const def of polygons) {
    if (def.layer !== 'road') continue;
    const ring = def.ring;
    for (let i = 0; i < ring.length - 1 && edges < maxEdges; i++) {
      const a = ring[i];
      const b = ring[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 1.8) continue;

      const cx = (a.x + b.x) * 0.5;
      const cz = (a.z + b.z) * 0.5;
      const rotY = Math.atan2(dx, dz);
      const curbW = GROUND_SURFACE_LEVELS.curbWidth * 0.82;
      const curbTh = groundThickness('curb');
      const curbTop = groundTopY('curb');

      addBoxStrip(
        group,
        geometries,
        `ground-osm-curb-${def.id}-${i}`,
        curbW,
        curbTh,
        len,
        cx,
        boxCenterYForTop(curbTop, curbTh),
        cz,
        rotY,
        materials.curb
      );
      edges++;
    }
  }
  return edges;
}

/** @deprecated Utiliser appendOsmStreetPolygons */
export function appendOsmStreetSegments(
  group: THREE.Group,
  segments: readonly OsmStreetSegmentDef[],
  materials: GroundMaterialSet,
  geometries: THREE.BufferGeometry[],
  maxSegments = 120
): number {
  let added = 0;
  for (const segment of segments.slice(0, maxSegments)) {
    const dx = segment.bx - segment.ax;
    const dz = segment.bz - segment.az;
    const len = Math.hypot(dx, dz);
    if (len < 2) continue;

    const cx = (segment.ax + segment.bx) * 0.5;
    const cz = (segment.az + segment.bz) * 0.5;
    const rotationY = Math.atan2(dx, dz);
    const kind = segment.layer;
    const th = groundThickness(kind);
    const top = groundTopY(kind);
    const mat = kind === 'road' ? materials.road : materials.sidewalk;

    addBoxStrip(
      group,
      geometries,
      `ground-osm-${segment.id}`,
      segment.width,
      th,
      len,
      cx,
      boxCenterYForTop(top, th),
      cz,
      rotationY,
      mat
    );
    added++;
  }
  return added;
}
