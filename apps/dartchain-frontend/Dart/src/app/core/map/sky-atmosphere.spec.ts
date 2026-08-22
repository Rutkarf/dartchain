import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { atmosphereFogExpDensity, resolveSkyAtmosphereColors } from './sky-atmosphere.config';
import { buildSkyDome } from './sky-dome.util';
import { activeAtmospherePreset } from './marseille-atmosphere.config';
import { mapQualityTier } from './map-configuration';
import { mapPerfProfile } from './marseille-perf.config';

describe('sky-atmosphere Phase 14', () => {
  it('résout des couleurs zenith / horizon distinctes', () => {
    const colors = resolveSkyAtmosphereColors();
    expect(colors.zenith.getHex()).not.toBe(colors.horizon.getHex());
    expect(colors.starIntensity).toBeGreaterThan(0.5);
  });

  it('convertit fogFar en densité FogExp2', () => {
    const preset = activeAtmospherePreset();
    const density = atmosphereFogExpDensity(preset.fogFar);
    expect(density).toBeGreaterThan(0.001);
    expect(density).toBeLessThan(0.01);
  });

  it('construit le sky dome sur tous les tiers (segments perf)', () => {
    const low = buildSkyDome('ultra-low');
    expect(low).not.toBeNull();
    expect(low!.mesh.name).toBe('metaverse-sky-dome');
    low!.geometry.dispose();
    low!.material.dispose();

    const high = buildSkyDome('high');
    expect(high).not.toBeNull();
    expect(mapPerfProfile('ultra-low').skyDomeSegments).toBeLessThan(
      mapPerfProfile('high').skyDomeSegments
    );
    high!.geometry.dispose();
    high!.material.dispose();
  });

  it('active skyDome et volumetricFog partout', () => {
    expect(mapQualityTier('medium').skyDome).toBe(true);
    expect(mapQualityTier('medium').volumetricFog).toBe(true);
    expect(mapQualityTier('ultra-low').skyDome).toBe(true);
    expect(mapQualityTier('ultra-low').volumetricFog).toBe(true);
  });
});
