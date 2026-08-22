import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

import { MARSEILLE_HARBOR_WATER } from './map-configuration';

/** Réflexion planaire calme — Vieux-Port devant le spawn (tier high). */
export function createHarborPlanarReflector(options?: {
  width?: number;
  depth?: number;
  centerX?: number;
  centerZ?: number;
  y?: number;
  textureSize?: number;
}): Reflector {
  const harbor = MARSEILLE_HARBOR_WATER;
  const width = options?.width ?? 52;
  const depth = options?.depth ?? 38;
  const centerX = options?.centerX ?? 0;
  const centerZ = options?.centerZ ?? harbor.waterMinZ + 22;
  const y = options?.y ?? harbor.waterSurfaceY - 0.02;
  const tex = options?.textureSize ?? 512;

  const reflector = new Reflector(new THREE.PlaneGeometry(width, depth), {
    clipBias: 0.004,
    textureWidth: tex,
    textureHeight: tex,
    color: 0x6a8898,
  });
  reflector.name = 'marseille-harbor-planar-reflector';
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.set(centerX, y, centerZ);
  reflector.renderOrder = 1;
  return reflector;
}

export function disposeHarborPlanarReflector(reflector: Reflector): void {
  reflector.getRenderTarget()?.dispose();
  reflector.geometry.dispose();
  const mat = reflector.material as THREE.Material;
  mat.dispose?.();
}
