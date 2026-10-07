import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  applyHarborWaterAtmosphereColors,
  bindHarborWaterEnvironmentMap,
  harborWaterReflectionMix,
  resolveHarborWaterColorsFromAtmosphere,
} from './harbor-water-atmosphere.util';
import { createHarborWaterShaderMaterial } from './harbor-water.shader';

describe('harbor-water-atmosphere Phase 9', () => {
  it('résout des teintes eau cohérentes avec le fog', () => {
    const colors = resolveHarborWaterColorsFromAtmosphere();
    expect(colors.shallow.getHex()).not.toBe(colors.deep.getHex());
    expect(colors.horizon.getHex()).not.toBe(0);
  });

  it('applique les couleurs au shader', () => {
    const mat = createHarborWaterShaderMaterial();
    applyHarborWaterAtmosphereColors(mat);
    expect(mat.uniforms.uShallowColor.value).toBeInstanceOf(THREE.Color);
    expect(mat.uniforms.uHorizonTint.value.getHex()).not.toBe(0);
    mat.dispose();
  });

  it('bind envMap avec mix scalé par profil perf (Phase 14)', () => {
    const mat = createHarborWaterShaderMaterial();
    const fakeEnv = {} as THREE.Texture;

    bindHarborWaterEnvironmentMap(mat, fakeEnv, 'ultra-low');
    expect(mat.uniforms.uReflectionMix.value).toBe(harborWaterReflectionMix('ultra-low'));
    expect(mat.uniforms.uReflectionMix.value).toBeGreaterThan(0);
    expect(mat.envMap).toBe(fakeEnv);

    bindHarborWaterEnvironmentMap(mat, fakeEnv, 'high');
    expect(mat.uniforms.uReflectionMix.value).toBe(harborWaterReflectionMix('high'));
    expect(mat.uniforms.uReflectionMix.value).toBeGreaterThan(harborWaterReflectionMix('ultra-low'));
    expect(mat.envMap).toBe(fakeEnv);
    mat.dispose();
  });
});
