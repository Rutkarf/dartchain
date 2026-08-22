/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';

import { pbrDetailForQuality } from './material-library.config';
import { createGroundPbrLibrary } from './ground-pbr.library';
import { createHaussmannFacadePbrMaps } from './facade-pbr.library';
import { canvas2dAvailable, normalMapFromHeightCanvas, createPbrCanvas } from './pbr-texture.util';

describe('material-library Phase 7', () => {
  it('mappe les tiers qualité vers albedo / full via perf', () => {
    expect(pbrDetailForQuality('ultra-low')).toBe('albedo');
    expect(pbrDetailForQuality('low')).toBe('albedo');
    expect(pbrDetailForQuality('medium')).toBe('albedo');
    expect(pbrDetailForQuality('high')).toBe('full');
  });

  it('ground PBR — albedo medium, maps complètes en high', () => {
    if (!canvas2dAvailable()) return;
    const flatOwner = { textures: [] as import('three').Texture[] };
    const flat = createGroundPbrLibrary(flatOwner, 'flat');
    expect(flat.asphalt.map).toBeUndefined();

    const albedoOwner = { textures: [] as import('three').Texture[] };
    const albedo = createGroundPbrLibrary(albedoOwner, 'albedo');
    expect(albedo.asphalt.map).toBeDefined();
    expect(albedo.asphalt.normalMap).toBeUndefined();

    const fullOwner = { textures: [] as import('three').Texture[] };
    const full = createGroundPbrLibrary(fullOwner, 'full');
    expect(full.quay.map).toBeDefined();
    expect(full.quay.normalMap).toBeDefined();
    expect(full.quay.roughnessMap).toBeDefined();
    expect(fullOwner.textures.length).toBeGreaterThan(8);
  });

  it('facade PBR — normal + roughness en full uniquement', () => {
    if (!canvas2dAvailable()) return;
    const fullOwner = { textures: [] as import('three').Texture[] };
    const full = createHaussmannFacadePbrMaps(
      {
        baseColor: 0xcbbda6,
        windowColor: '#d9ebf5',
        accentColor: '#8d6f55',
        seed: 42,
      },
      'full',
      fullOwner
    );
    expect(full.normalMap).toBeDefined();
    expect(full.roughnessMap).toBeDefined();

    const medium = createHaussmannFacadePbrMaps(
      {
        baseColor: 0xcbbda6,
        windowColor: '#d9ebf5',
        accentColor: '#8d6f55',
        seed: 42,
      },
      'albedo'
    );
    expect(medium.normalMap).toBeUndefined();
  });

  it('génère une normal map depuis height canvas', () => {
    if (!canvas2dAvailable()) return;
    const heightSurface = createPbrCanvas(16);
    if (!heightSurface) return;
    const { canvas: height, ctx } = heightSurface;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 4, 8, 8);
    const normal = normalMapFromHeightCanvas(height, undefined, 2);
    expect(normal.image.width).toBe(16);
    normal.dispose();
  });
});
