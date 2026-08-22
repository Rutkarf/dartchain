import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { MARSEILLE_HARBOR_WATER } from './map-configuration';
import type { MapQuality } from './map-configuration';
import {
  type UrbanPropsScope,
  urbanPropsBudget,
  urbanPropsRadius,
} from './urban-props.config';

export interface QuayPropsBuildResult {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  lampSpecs: Array<{ x: number; y: number; z: number }>;
}

export interface HarborExtrasBuildResult {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  boatCount: number;
  buoyCount: number;
}

/** Lampadaires + bitts le long d'un quai (InstancedMesh). */
export function buildQuayStreetProps(options: {
  startX: number;
  endX: number;
  z: number;
  y: number;
  spacing?: number;
  includeLamps?: boolean;
}): QuayPropsBuildResult {
  const spacing = options.spacing ?? 7.5;
  const includeLamps = options.includeLamps ?? true;
  const group = new THREE.Group();
  group.name = 'marseille-quay-props';

  const bollardGeo = new THREE.CylinderGeometry(0.11, 0.14, 0.72, 8);
  const bollardMat = new THREE.MeshStandardMaterial({
    color: 0x6a7078,
    roughness: 0.55,
    metalness: 0.38,
  });
  const lampPoleGeo = new THREE.CylinderGeometry(0.07, 0.09, 3.4, 8);
  const lampHeadGeo = new THREE.SphereGeometry(0.22, 8, 8);
  const lampPoleMat = new THREE.MeshStandardMaterial({
    color: 0x404850,
    roughness: 0.48,
    metalness: 0.42,
  });
  const lampHeadMat = new THREE.MeshStandardMaterial({
    color: 0xfff0d8,
    emissive: 0xffd890,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.12,
  });

  const positions: Array<{ x: number; lamp: boolean }> = [];
  const lampSpecs: Array<{ x: number; y: number; z: number }> = [];
  const minX = Math.min(options.startX, options.endX);
  const maxX = Math.max(options.startX, options.endX);
  for (let x = minX + 2; x <= maxX - 2; x += spacing) {
    positions.push({ x, lamp: includeLamps && positions.length % 2 === 0 });
  }

  const bollardMesh = new THREE.InstancedMesh(bollardGeo, bollardMat, positions.length);
  bollardMesh.name = 'marseille-quay-bollards';
  const dummy = new THREE.Object3D();

  positions.forEach((pos, idx) => {
    dummy.position.set(pos.x, options.y + 0.36, options.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    bollardMesh.setMatrixAt(idx, dummy.matrix);

    if (pos.lamp) {
      const pole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
      pole.name = `marseille-quay-lamp-pole-${idx}`;
      pole.position.set(pos.x, options.y + 1.7, options.z - 0.35);
      group.add(pole);

      const head = new THREE.Mesh(lampHeadGeo, lampHeadMat);
      head.name = `marseille-quay-lamp-head-${idx}`;
      head.position.set(pos.x, options.y + 3.55, options.z - 0.35);
      group.add(head);
      lampSpecs.push({ x: pos.x, y: options.y + 3.55, z: options.z - 0.35 });
    }
  });
  bollardMesh.instanceMatrix.needsUpdate = true;
  group.add(bollardMesh);

  return {
    group,
    geometries: [bollardGeo, lampPoleGeo, lampHeadGeo],
    materials: [bollardMat, lampPoleMat, lampHeadMat],
    lampSpecs,
  };
}

function createBoatSilhouetteGeometry(): THREE.BufferGeometry {
  const hull = new THREE.BoxGeometry(5.2, 1.1, 1.8);
  hull.translate(0, 0.55, 0);
  const cabin = new THREE.BoxGeometry(1.6, 1.4, 1.4);
  cabin.translate(-1.2, 1.35, 0);
  const bow = new THREE.ConeGeometry(1.1, 2.4, 4);
  bow.rotateZ(-Math.PI / 2);
  bow.translate(3.1, 0.65, 0);
  return mergeGeometries([hull, cabin, bow], false)!;
}

function createBuoyGeometry(): THREE.BufferGeometry {
  const stem = new THREE.CylinderGeometry(0.08, 0.12, 0.55, 6);
  stem.translate(0, 0.28, 0);
  const body = new THREE.SphereGeometry(0.38, 8, 8);
  body.translate(0, 0.72, 0);
  return mergeGeometries([stem, body], false)!;
}

/** Bouées + bateaux amarrés — Quai des Belges (Phase 11). */
export function buildQuayHarborExtras(
  scope: UrbanPropsScope,
  quality: MapQuality
): HarborExtrasBuildResult | null {
  if (scope === 'none') return null;

  const harbor = MARSEILLE_HARBOR_WATER;
  const budget = urbanPropsBudget(scope);
  const maxRadius = urbanPropsRadius(scope);
  const group = new THREE.Group();
  group.name = 'marseille-quay-harbor-extras';

  const boatGeo = createBoatSilhouetteGeometry();
  const buoyGeo = createBuoyGeometry();
  const boatMat = new THREE.MeshStandardMaterial({
    color: 0x2a3848,
    roughness: 0.58,
    metalness: 0.22,
    envMapIntensity: 0.75,
  });
  const buoyMat = new THREE.MeshStandardMaterial({
    color: 0xff5533,
    roughness: 0.35,
    metalness: 0.12,
    emissive: 0x661100,
    emissiveIntensity: quality === 'ultra-low' ? 0.05 : 0.18,
  });

  const boatSlots: Array<{ x: number; z: number; rot: number }> = [
    { x: -18, z: harbor.waterMinZ + 14, rot: 0.08 },
    { x: 6, z: harbor.waterMinZ + 18, rot: -0.05 },
    { x: 20, z: harbor.waterMinZ + 12, rot: 0.12 },
    { x: -8, z: harbor.waterMinZ + 28, rot: 0.02 },
    { x: 14, z: harbor.waterMinZ + 34, rot: -0.08 },
    { x: -22, z: harbor.waterMinZ + 42, rot: 0.15 },
  ].filter((slot) => Math.hypot(slot.x, slot.z) <= maxRadius);

  const buoySlots: Array<{ x: number; z: number }> = [];
  for (let x = -24; x <= 24; x += 6) {
    buoySlots.push({ x, z: harbor.waterMinZ + 8 + ((x + 24) % 12) * 0.4 });
  }
  if (scope === 'full') {
    for (let x = -60; x <= 60; x += 14) {
      buoySlots.push({ x, z: harbor.waterMinZ + 22 + (x % 3) });
    }
  }
  const filteredBuoys = buoySlots.filter((s) => Math.hypot(s.x, s.z) <= maxRadius);

  const boats = boatSlots.slice(0, budget.boats);
  const buoys = filteredBuoys.slice(0, budget.buoys);

  const dummy = new THREE.Object3D();
  const waterY = harbor.waterSurfaceY;

  if (boats.length > 0) {
    const boatMesh = new THREE.InstancedMesh(boatGeo, boatMat, boats.length);
    boatMesh.name = 'marseille-quay-boats';
    boats.forEach((slot, idx) => {
      dummy.position.set(slot.x, waterY + 0.15, slot.z);
      dummy.rotation.set(0, slot.rot, 0);
      dummy.updateMatrix();
      boatMesh.setMatrixAt(idx, dummy.matrix);
    });
    boatMesh.instanceMatrix.needsUpdate = true;
    group.add(boatMesh);
  }

  if (buoys.length > 0) {
    const buoyMesh = new THREE.InstancedMesh(buoyGeo, buoyMat, buoys.length);
    buoyMesh.name = 'marseille-quay-buoys';
    buoys.forEach((slot, idx) => {
      dummy.position.set(slot.x, waterY + 0.05, slot.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      buoyMesh.setMatrixAt(idx, dummy.matrix);
    });
    buoyMesh.instanceMatrix.needsUpdate = true;
    group.add(buoyMesh);
  }

  return {
    group,
    geometries: [boatGeo, buoyGeo],
    materials: [boatMat, buoyMat],
    boatCount: boats.length,
    buoyCount: buoys.length,
  };
}
