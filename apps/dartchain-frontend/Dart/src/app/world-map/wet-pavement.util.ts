import * as THREE from 'three';

import type { MapQuality } from './map-configuration';
import { mapPerfProfile } from './marseille-perf.config';

export interface WetPavementTargets {
  road?: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  sidewalk?: THREE.MeshStandardMaterial;
  quay?: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
}

const BASE = {
  road: { roughness: 0.32, metalness: 0.38, clearcoat: 0.22, clearcoatRoughness: 0.18 },
  sidewalk: { roughness: 0.9, metalness: 0.02 },
  quay: { roughness: 0.34, metalness: 0.26, clearcoat: 0.12, clearcoatRoughness: 0.24 },
} as const;

/** Phase 9 + 14 — micro-variation mouillée (nuit portuaire). */
export function tickWetPavementMaterials(
  targets: WetPavementTargets,
  elapsedSeconds: number,
  quality: MapQuality,
  frameIndex = 0
): void {
  const skip = mapPerfProfile(quality).wetPavementTickSkip;
  if (skip > 0 && frameIndex % (skip + 1) !== 0) return;

  const slow = 0.5 + 0.5 * Math.sin(elapsedSeconds * 0.28);
  const ripple = 0.5 + 0.5 * Math.sin(elapsedSeconds * 1.15 + 0.6);

  if (targets.road) {
    const road = targets.road;
    if ('clearcoat' in road && road instanceof THREE.MeshPhysicalMaterial) {
      road.clearcoat = BASE.road.clearcoat + slow * 0.14;
      road.clearcoatRoughness = BASE.road.clearcoatRoughness - ripple * 0.05;
      road.roughness = BASE.road.roughness - slow * 0.06;
      road.metalness = BASE.road.metalness + ripple * 0.06;
      road.envMapIntensity = 0.7 + slow * 0.18;
    } else {
      road.roughness = BASE.road.roughness - slow * 0.05;
      road.metalness = BASE.road.metalness + ripple * 0.05;
      road.envMapIntensity = 0.65 + slow * 0.12;
    }
  }

  if (targets.sidewalk) {
    targets.sidewalk.roughness = BASE.sidewalk.roughness - ripple * 0.04;
    targets.sidewalk.metalness = BASE.sidewalk.metalness + slow * 0.015;
    targets.sidewalk.envMapIntensity = 0.28 + ripple * 0.08;
  }

  if (targets.quay) {
    const quay = targets.quay;
    quay.roughness = BASE.quay.roughness - slow * 0.08;
    quay.metalness = BASE.quay.metalness + ripple * 0.05;
    quay.envMapIntensity = 0.82 + slow * 0.14;
    if (quay instanceof THREE.MeshPhysicalMaterial) {
      quay.clearcoat = BASE.quay.clearcoat + slow * 0.1;
      quay.sheen = 0.06 + ripple * 0.04;
    } else {
      quay.emissiveIntensity = 0.04 + ripple * 0.03;
    }
  }
}
