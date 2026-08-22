import * as THREE from 'three';

import type { MapQuality } from '../map-configuration';
import { mapPerfProfile } from '../marseille-perf.config';

export interface LandmarkDetailBuildResult {
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

/** Arcades pierre le long de la façade quai — harbor-west (Phase 10). */
export function attachHarborWestLandmarkDetails(
  group: THREE.Group,
  center: { x: number; z: number },
  heightMeters: number,
  footprintWidth: number,
  quality: MapQuality
): LandmarkDetailBuildResult {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const perf = mapPerfProfile(quality);
  const archCount =
    quality === 'high' ? 7 : quality === 'medium' ? 5 : perf.harborSubdivisions <= 12 ? 3 : 4;
  const span = footprintWidth * 0.82;
  const startX = center.x - span * 0.5;
  const step = span / archCount;

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xd6c8ae,
    roughness: 0.68,
    metalness: 0.1,
    envMapIntensity: 0.72,
  });
  materials.push(stoneMat);

  const facadeZ = center.z + footprintWidth * 0.08;
  const archHeight = Math.min(5.2, heightMeters * 0.38);
  const archDepth = 1.4;

  for (let i = 0; i < archCount; i++) {
    const x = startX + step * (i + 0.5);
    const pillarGeo = new THREE.BoxGeometry(0.55, archHeight, archDepth);
    geometries.push(pillarGeo);
    const pillarL = new THREE.Mesh(pillarGeo, stoneMat);
    pillarL.name = `${group.name}-landmark-arch-pillar-l-${i}`;
    pillarL.position.set(x - step * 0.32, archHeight * 0.5, facadeZ);
    group.add(pillarL);

    const pillarR = pillarL.clone();
    pillarR.name = `${group.name}-landmark-arch-pillar-r-${i}`;
    pillarR.position.set(x + step * 0.32, archHeight * 0.5, facadeZ);
    group.add(pillarR);

    const lintelGeo = new THREE.BoxGeometry(step * 0.58, 0.45, archDepth + 0.2);
    geometries.push(lintelGeo);
    const lintel = new THREE.Mesh(lintelGeo, stoneMat);
    lintel.name = `${group.name}-landmark-arch-lintel-${i}`;
    lintel.position.set(x, archHeight + 0.2, facadeZ);
    group.add(lintel);
  }

  const awningGeo = new THREE.BoxGeometry(span * 0.92, 0.12, 2.8);
  geometries.push(awningGeo);
  const awningMat = new THREE.MeshStandardMaterial({
    color: 0x3a4858,
    roughness: 0.35,
    metalness: 0.55,
    emissive: 0x102030,
    emissiveIntensity: 0.08,
  });
  materials.push(awningMat);
  const awning = new THREE.Mesh(awningGeo, awningMat);
  awning.name = `${group.name}-landmark-awning`;
  awning.position.set(center.x, 4.1, facadeZ + 1.6);
  group.add(awning);

  return { geometries, materials };
}

/** Vitrines éclairées — immeubles adjacents au miroir (Phase 10). */
export function attachMirrorAdjacentStorefrontDetails(
  group: THREE.Group,
  center: { x: number; z: number },
  heightMeters: number,
  quality: MapQuality
): LandmarkDetailBuildResult {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const panelCount = quality === 'high' ? 3 : 2;
  const panelGeo = new THREE.PlaneGeometry(3.6, 2.8);
  geometries.push(panelGeo);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0xb8e8ff,
    emissive: 0x48c8ff,
    emissiveIntensity: quality === 'high' ? 0.65 : 0.42,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });
  materials.push(panelMat);

  for (let i = 0; i < panelCount; i++) {
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.name = `${group.name}-landmark-storefront-${i}`;
    panel.position.set(center.x - 4 + i * 4, Math.min(3.2, heightMeters * 0.22), center.z - 2.2);
    panel.rotation.y = Math.PI;
    group.add(panel);
  }

  return { geometries, materials };
}
