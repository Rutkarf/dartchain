import { describe, expect, it } from 'vitest';

import {
  defaultHarborWaterPolygons,
  normalizedShoreDepth,
  shoreDistanceMeters,
} from './harbor-water-mesh.builder';
import {
  applyHarborWaterAtmosphereColors,
  harborWaterReflectionMix,
  harborWaterShoreDistortion,
} from './harbor-water-atmosphere.util';
import { createHarborWaterShaderMaterial, tickHarborWaterShader } from './harbor-water.shader';
import { mapQualityTier } from './map-configuration';

describe('harbor-water Phase 2', () => {
  it('expose 3 polygones eau layout (bassin + bras sud + apron)', () => {
    const polys = defaultHarborWaterPolygons();
    expect(polys.length).toBe(3);
    expect(polys.map((p) => p.id)).toEqual(['basin-west', 'south-channel', 'mirror-apron']);
  });

  it('calcule une profondeur normalisée depuis le bord', () => {
    const poly = defaultHarborWaterPolygons().find((p) => p.id === 'south-channel')!;
    const edgeZ = poly.ring[0].z;
    const edgeDepth = normalizedShoreDepth(0, edgeZ + 0.5, poly.ring, poly.maxDepthSpan);
    const centerDepth = normalizedShoreDepth(0, edgeZ + 80, poly.ring, poly.maxDepthSpan);
    expect(edgeDepth).toBeLessThan(centerDepth);
    expect(shoreDistanceMeters(0, edgeZ + 0.5, poly.ring)).toBeLessThan(4);
  });

  it('anime le uniform uTime du shader', () => {
    const mat = createHarborWaterShaderMaterial();
    expect(mat.uniforms.uDepthContrast.value).toBeGreaterThan(0);
    tickHarborWaterShader(mat, 2);
    expect(mat.uniforms.uTime.value).toBeGreaterThan(0);
    mat.dispose();
  });

  it('expose uHorizonTint et uShoreDistortion (Phase 9)', () => {
    const mat = createHarborWaterShaderMaterial(0.72);
    expect(mat.uniforms.uHorizonTint).toBeDefined();
    expect(mat.uniforms.uShoreDistortion.value).toBe(0.72);
    applyHarborWaterAtmosphereColors(mat);
    expect(mat.uniforms.uHorizonTint.value.getHex()).not.toBe(0);
    mat.dispose();
  });

  it('shore distortion et réflexion selon profil perf', () => {
    expect(harborWaterShoreDistortion('high')).toBeGreaterThan(harborWaterShoreDistortion('medium'));
    expect(harborWaterReflectionMix('ultra-low')).toBeGreaterThan(0);
    expect(harborWaterReflectionMix('high')).toBeGreaterThan(harborWaterReflectionMix('medium'));
    expect(mapQualityTier('medium').waterEnvReflection).toBe(true);
    expect(mapQualityTier('medium').wetPavement).toBe(true);
    expect(mapQualityTier('medium').waterPlanarReflection).toBe(true);
    expect(mapQualityTier('high').waterPlanarReflection).toBe(true);
  });
});
