/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import {
  createArenaSlimGroundMaterialSet,
  createArenaSlimTerrainMaterial,
  createGroundMaterialSet,
  disposeGroundMaterialSet,
  disposeGroundTextures,
  type GroundTextureOwnership,
} from './ground-material.factory';
import { canvas2dAvailable } from './material-library/pbr-texture.util';
import { METAVERSE_ARENA_PROFILE } from './arena/metaverse-arena-profile';

describe('ground-material.factory Phase 7 PBR', () => {
  const owner: GroundTextureOwnership = { textures: [] };

  it('Arena slim — night-tech glass + grille neon partagée', () => {
    const materials = createArenaSlimGroundMaterialSet();
    expect(materials.road).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(materials.sidewalk).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(materials.esplanade).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(materials.quay).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(materials.road.map).toBeTruthy();
    expect(materials.esplanade.map).toBe(materials.road.map);
    expect((materials.esplanade as THREE.MeshLambertMaterial).color.getHex()).toBe(
      METAVERSE_ARENA_PROFILE.palette.offWhite
    );
    expect((materials.spawnCircleGround as THREE.MeshLambertMaterial).color.getHex()).toBe(
      0x18314f
    );
    expect(materials.spawnCircleGround.map).toBeFalsy();
    const terrain = createArenaSlimTerrainMaterial();
    expect(terrain).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(terrain.map).toBeTruthy();
    expect(terrain.color.getHex()).toBe(METAVERSE_ARENA_PROFILE.palette.sand);
    terrain.map?.dispose();
    terrain.dispose();
    disposeGroundMaterialSet(materials);
  });

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
    const road = materials.road as THREE.MeshStandardMaterial;
    expect(road.map).toBeDefined();
    expect(materials.quay.map).toBeDefined();
    expect(road.normalMap).toBeFalsy();
    disposeGroundMaterialSet(materials);
  });

  it('high — PBR complet + clearcoat route', () => {
    if (!canvas2dAvailable()) return;
    disposeGroundTextures(owner);
    const materials = createGroundMaterialSet(owner, 'high');
    const road = materials.road as THREE.MeshPhysicalMaterial;
    const esplanade = materials.esplanade as THREE.MeshStandardMaterial;
    expect(road.map).toBeDefined();
    expect(road.normalMap).toBeDefined();
    expect(road.roughnessMap).toBeDefined();
    expect(road.clearcoat).toBeGreaterThan(0);
    expect(esplanade.map).toBeDefined();
    expect(esplanade.normalMap).toBeDefined();
    disposeGroundMaterialSet(materials);
    disposeGroundTextures(owner);
  });
});
