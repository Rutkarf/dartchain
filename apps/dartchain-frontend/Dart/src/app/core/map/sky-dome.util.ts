import * as THREE from 'three';

import type { MapQuality } from './map-configuration';
import { mapPerfProfile } from './marseille-perf.config';
import { resolveSkyAtmosphereColors } from './sky-atmosphere.config';
import {
  applySkyDomeColors,
  createSkyDomeMaterial,
  type SkyDomeMaterial,
} from './sky-dome.shader';

export interface SkyDomeBuildResult {
  mesh: THREE.Mesh;
  material: SkyDomeMaterial;
  geometry: THREE.BufferGeometry;
}

/** Dôme ciel — gradient nuit + étoiles (Phase 12 + 14 perf). */
export function buildSkyDome(quality: MapQuality): SkyDomeBuildResult {
  const segments = mapPerfProfile(quality).skyDomeSegments;
  const geometry = new THREE.SphereGeometry(920, segments, Math.max(16, segments - 8));
  const material = createSkyDomeMaterial();
  applySkyDomeColors(material, resolveSkyAtmosphereColors());

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'metaverse-sky-dome';
  mesh.frustumCulled = false;
  mesh.renderOrder = -20;

  return { mesh, material, geometry };
}

export function followSkyDome(mesh: THREE.Object3D, x: number, y: number, z: number): void {
  mesh.position.set(x, Math.max(y * 0.15, 0), z);
}

export function disposeSkyDome(result: SkyDomeBuildResult): void {
  result.geometry.dispose();
  result.material.dispose();
}
