/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import {
  FACADE_TILE_HEIGHT_M,
  FACADE_TILE_WIDTH_M,
  createHaussmannWallMaterial,
  stableFacadeUnit,
  tuneWallMaterialForFootprint,
} from './building-facade.factory';
import { canvas2dAvailable } from './material-library/pbr-texture.util';

describe('building-facade.factory', () => {
  it('stableFacadeUnit reste déterministe', () => {
    expect(stableFacadeUnit(42)).toBe(stableFacadeUnit(42));
    expect(stableFacadeUnit(42)).not.toBe(stableFacadeUnit(43));
  });

  it('ajuste le repeat UV selon empreinte et hauteur', () => {
    const map = new THREE.Texture();
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshStandardMaterial({ map });
    const tuned = tuneWallMaterialForFootprint(
      mat,
      24,
      { minX: 0, maxX: 28, minZ: -10, maxZ: 14 },
      true
    );
    const perimeter = 2 * (28 + 24);
    expect(tuned.map!.repeat.x).toBeCloseTo(Math.max(1.2, perimeter / FACADE_TILE_WIDTH_M), 1);
    expect(tuned.map!.repeat.y).toBeCloseTo(Math.max(1.4, 24 / FACADE_TILE_HEIGHT_M), 1);
    mat.dispose();
    tuned.dispose();
    tuned.map?.dispose();
  });

  it('Phase 7 — PBR maps en high', () => {
    if (!canvas2dAvailable()) return;
    const mat = createHaussmannWallMaterial(42, undefined, {
      baseColor: 0xcbbda6,
      windowColor: '#d9ebf5',
      accentColor: '#8d6f55',
      quality: 'high',
    });
    expect(mat.map).toBeDefined();
    expect(mat.normalMap).toBeDefined();
    expect(mat.roughnessMap).toBeDefined();
    mat.dispose();
    mat.map?.dispose();
    mat.emissiveMap?.dispose();
    mat.normalMap?.dispose();
    mat.roughnessMap?.dispose();
  });
});
