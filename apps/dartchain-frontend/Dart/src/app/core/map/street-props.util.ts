import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import type { GroundCorridorDef } from './ground-layout.data';
import { VIEUX_PORT_GROUND_CORRIDORS } from './ground-layout.data';
import { groundTopY } from './ground-surface.config';
import type { MapQuality } from './map-configuration';
import {
  type UrbanPropsScope,
  urbanPropsBudget,
  urbanPropsRadius,
} from './urban-props.config';
import { isHarborWaterAt } from './vieux-port-layout.util';

export type StreetPropKind = 'tree' | 'bench' | 'bin';

export interface StreetPropPlacement {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  kind: StreetPropKind;
}

export interface StreetPropsBuildResult {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  counts: Record<StreetPropKind, number>;
}

function stableYaw(seed: number): number {
  return ((seed * 17 + 7) % 360) * (Math.PI / 180);
}

function sidewalkPointOnCorridor(
  corridor: GroundCorridorDef,
  along: number,
  side: 1 | -1
): { x: number; z: number } {
  const lateral = side * (corridor.roadWidth * 0.5 + corridor.sidewalkWidth * 0.38);
  const cos = Math.cos(corridor.rotationY);
  const sin = Math.sin(corridor.rotationY);
  const localX = lateral;
  const localZ = along;
  return {
    x: corridor.centerX + localX * cos + localZ * sin,
    z: corridor.centerZ + -localX * sin + localZ * cos,
  };
}

function isValidStreetPropSite(x: number, z: number, maxRadius: number): boolean {
  if (Math.hypot(x, z) > maxRadius) return false;
  if (isHarborWaterAt(x, z)) return false;
  if (Math.hypot(x, z) < 4.5) return false;
  return true;
}

/** Positions le long des trottoirs OSM-layout (corridors Phase 1). */
export function corridorStreetPropPlacements(
  corridors: readonly GroundCorridorDef[],
  scope: UrbanPropsScope,
  options: {
    surfaceY?: number;
    treeSpacing?: number;
    benchSpacing?: number;
    binSpacing?: number;
  } = {}
): StreetPropPlacement[] {
  if (scope === 'none') return [];

  const maxRadius = urbanPropsRadius(scope);
  const budget = urbanPropsBudget(scope);
  const surfaceY = options.surfaceY ?? groundTopY('sidewalk');
  const treeSpacing = options.treeSpacing ?? 14;
  const benchSpacing = options.benchSpacing ?? 22;
  const binSpacing = options.binSpacing ?? 28;

  const trees: StreetPropPlacement[] = [];
  const benches: StreetPropPlacement[] = [];
  const bins: StreetPropPlacement[] = [];
  let seed = 0;

  for (const corridor of corridors) {
    const halfLen = corridor.length * 0.5 - 8;
    for (let along = -halfLen; along <= halfLen; along += 4) {
      for (const side of [-1, 1] as const) {
        const { x, z } = sidewalkPointOnCorridor(corridor, along, side);
        if (!isValidStreetPropSite(x, z, maxRadius)) continue;

        const distAlong = Math.abs(along);
        if (trees.length < budget.trees && distAlong % treeSpacing < 4.5) {
          trees.push({
            x,
            y: surfaceY,
            z,
            rotationY: stableYaw(seed++),
            kind: 'tree',
          });
        } else if (benches.length < budget.benches && distAlong % benchSpacing < 4.5 && side === 1) {
          benches.push({
            x,
            y: surfaceY,
            z,
            rotationY: corridor.rotationY + stableYaw(seed++) * 0.15,
            kind: 'bench',
          });
        } else if (bins.length < budget.bins && distAlong % binSpacing < 4.5 && side === -1) {
          bins.push({
            x,
            y: surfaceY,
            z,
            rotationY: corridor.rotationY,
            kind: 'bin',
          });
        }
      }
    }
  }

  return [...trees, ...benches, ...bins].slice(0, budget.trees + budget.benches + budget.bins);
}

function createTreePropGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.12, 0.16, 1.9, 6);
  trunk.translate(0, 0.95, 0);
  const foliage = new THREE.ConeGeometry(1.05, 2.6, 7);
  foliage.translate(0, 2.8, 0);
  return mergeGeometries([trunk, foliage], false)!;
}

function createBenchPropGeometry(): THREE.BufferGeometry {
  const seat = new THREE.BoxGeometry(1.35, 0.12, 0.48);
  seat.translate(0, 0.48, 0);
  const back = new THREE.BoxGeometry(1.35, 0.52, 0.1);
  back.translate(0, 0.78, -0.2);
  const legL = new THREE.BoxGeometry(0.08, 0.48, 0.08);
  legL.translate(-0.55, 0.24, 0.12);
  const legR = legL.clone();
  legR.translate(1.1, 0, 0);
  return mergeGeometries([seat, back, legL, legR], false)!;
}

function createBinPropGeometry(): THREE.BufferGeometry {
  const body = new THREE.CylinderGeometry(0.22, 0.26, 0.82, 8);
  body.translate(0, 0.41, 0);
  const lid = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 8);
  lid.translate(0, 0.86, 0);
  return mergeGeometries([body, lid], false)!;
}

function addInstancedKind(
  group: THREE.Group,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  placements: StreetPropPlacement[],
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): number {
  if (placements.length === 0) return 0;
  geometries.push(geometry);
  materials.push(material);
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  const dummy = new THREE.Object3D();
  placements.forEach((place, idx) => {
    dummy.position.set(place.x, place.y, place.z);
    dummy.rotation.set(0, place.rotationY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  return placements.length;
}

/** Arbres / bancs / poubelles — InstancedMesh (Phase 11). */
export function buildStreetPropsFromPlacements(
  placements: StreetPropPlacement[],
  _quality: MapQuality
): StreetPropsBuildResult {
  const group = new THREE.Group();
  group.name = 'marseille-street-props';

  const treeGeo = createTreePropGeometry();
  const benchGeo = createBenchPropGeometry();
  const binGeo = createBinPropGeometry();

  const treeMat = new THREE.MeshStandardMaterial({
    color: 0x3d6848,
    roughness: 0.84,
    metalness: 0.03,
  });

  const benchMat = new THREE.MeshStandardMaterial({
    color: 0x4a4038,
    roughness: 0.62,
    metalness: 0.18,
  });
  const binMat = new THREE.MeshStandardMaterial({
    color: 0x3a4858,
    roughness: 0.45,
    metalness: 0.55,
  });

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trees = placements.filter((p) => p.kind === 'tree');
  const benches = placements.filter((p) => p.kind === 'bench');
  const bins = placements.filter((p) => p.kind === 'bin');

  const treeCount = addInstancedKind(
    group,
    'marseille-street-trees',
    treeGeo,
    treeMat,
    trees,
    geometries,
    materials
  );
  const benchCount = addInstancedKind(
    group,
    'marseille-street-benches',
    benchGeo,
    benchMat,
    benches,
    geometries,
    materials
  );
  const binCount = addInstancedKind(
    group,
    'marseille-street-bins',
    binGeo,
    binMat,
    bins,
    geometries,
    materials
  );

  return {
    group,
    geometries,
    materials,
    counts: { tree: treeCount, bench: benchCount, bin: binCount },
  };
}

/** Pipeline complet trottoirs Vieux-Port. */
export function buildVieuxPortStreetProps(scope: UrbanPropsScope, quality: MapQuality): StreetPropsBuildResult {
  const placements = corridorStreetPropPlacements(VIEUX_PORT_GROUND_CORRIDORS, scope);
  return buildStreetPropsFromPlacements(placements, quality);
}
