import { describe, expect, it } from 'vitest';

import { mapQualityTier } from './map-configuration';
import { mapPerfProfile } from './marseille-perf.config';
import {
  shouldUseRenderPipeline,
  shouldUseTaa,
  usesFxaaPass,
} from './metaversebb-render.pipeline';
import {
  atmosphereBloomStrength,
  atmosphereBloomThreshold,
} from './marseille-atmosphere.config';
import { colorGradeMixForQuality } from './metaversebb-color-grade.shader';
import {
  districtColorGradeMix,
  resolveDistrictColorGrade,
} from './district-color-grade.util';
import { adaptiveSsaoSettings } from './metaversebb-ssao.util';

describe('metaversebb-render.pipeline Phase 14', () => {
  it('pipeline actif sur tous les tiers (parité visuelle)', () => {
    expect(mapQualityTier('ultra-low').fxaa).toBe(true);
    expect(mapQualityTier('ultra-low').bloom).toBe(true);
    expect(mapQualityTier('ultra-low').cyberpunkOverlay).toBe(true);
    expect(shouldUseRenderPipeline('ultra-low')).toBe(true);
    expect(shouldUseRenderPipeline('high')).toBe(true);
  });

  it('post-FX lourds réservés au profil perf high', () => {
    expect(mapPerfProfile('ultra-low').useTaa).toBe(false);
    expect(mapPerfProfile('ultra-low').useSsao).toBe(false);
    expect(mapPerfProfile('high').useTaa).toBe(true);
    expect(mapPerfProfile('high').useSsao).toBe(true);
    expect(mapPerfProfile('high').spotLightShadows).toBe(false);
    expect(mapQualityTier('high').ssao).toBe(true);
  });

  it('bloom plus sélectif et color grade en high', () => {
    expect(atmosphereBloomStrength('high')).toBeGreaterThan(atmosphereBloomStrength('medium'));
    expect(atmosphereBloomThreshold('high')).toBeLessThan(atmosphereBloomThreshold('medium'));
    expect(colorGradeMixForQuality('high')).toBeGreaterThan(colorGradeMixForQuality('medium'));
  });

  it('FXAA via perf quand TAA off', () => {
    expect(usesFxaaPass('ultra-low')).toBe(true);
    expect(usesFxaaPass('high')).toBe(false);
    expect(shouldUseTaa('high')).toBe(true);
    expect(shouldUseTaa('medium')).toBe(false);
  });
});

describe('metaversebb Phase 13 post-FX', () => {
  it('résout un grade distinct spawn vs Canebière', () => {
    const spawn = resolveDistrictColorGrade(0, 8);
    const cane = resolveDistrictColorGrade(0, -80);
    expect(spawn.highlightTint.x).not.toBe(cane.highlightTint.x);
    expect(districtColorGradeMix(0.36, cane)).toBeGreaterThan(0.36);
  });

  it('SSAO radius diminue quand la caméra s’éloigne', () => {
    const near = adaptiveSsaoSettings(12, 14);
    const far = adaptiveSsaoSettings(64, 18);
    expect(far.kernelRadius).toBeLessThan(near.kernelRadius);
    expect(far.maxDistance).toBeLessThan(near.maxDistance);
  });
});
