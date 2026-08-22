/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import {
  createGroundMaterialSet,
  disposeGroundMaterialSet,
  disposeGroundTextures,
  type GroundTextureOwnership,
} from './ground-material.factory';
import { canvas2dAvailable } from './material-library/pbr-texture.util';

describe('ground-material.factory Phase 7 PBR', () => {
  const owner: GroundTextureOwnership = { textures: [] };

  it('low — couleurs plates sans textures', () => {
    const materials = createGroundMaterialSet(owner, 'low');
    expect(materials.road.map).toBeFalsy();
    expect(materials.sidewalk.map).toBeFalsy();
    expect(materials.quay.map).toBeFalsy();
    disposeGroundMaterialSet(materials);
  });

  it('medium — albedo sur route et quai', () => {
    if (!canvas2dAvailable()) return;
    disposeGroundTextures(owner);
    const materials = createGroundMaterialSet(owner, 'medium');
    expect(materials.road.map).toBeDefined();
    expect(materials.quay.map).toBeDefined();
    expect(materials.road.normalMap).toBeFalsy();
    disposeGroundMaterialSet(materials);
  });

  it('high — PBR complet + clearcoat route', () => {
    if (!canvas2dAvailable()) return;
    disposeGroundTextures(owner);
    const materials = createGroundMaterialSet(owner, 'high');
    expect(materials.road.map).toBeDefined();
    expect(materials.road.normalMap).toBeDefined();
    expect(materials.road.roughnessMap).toBeDefined();
    expect((materials.road as THREE.MeshPhysicalMaterial).clearcoat).toBeGreaterThan(0);
    expect(materials.esplanade.map).toBeDefined();
    expect(materials.esplanade.normalMap).toBeDefined();
    disposeGroundMaterialSet(materials);
    disposeGroundTextures(owner);
  });
});
