import { describe, expect, it } from 'vitest';

import { mapQualityTier } from './map-configuration';
import { mapPerfProfile } from './marseille-perf.config';
import {
  harborAccentIntensityAtDistance,
  nightStreetLampsEnabled,
  nightWindowEmissiveScale,
} from './night-lighting.config';
import { corridorStreetLampSpecs } from './street-lamp-lighting.util';
import { VIEUX_PORT_GROUND_CORRIDORS } from './ground-layout.data';

describe('night-lighting Phase 14', () => {
  it('street lamps actifs sur tous les tiers', () => {
    expect(nightStreetLampsEnabled('ultra-low')).toBe(true);
    expect(nightStreetLampsEnabled('low')).toBe(true);
    expect(nightStreetLampsEnabled('medium')).toBe(true);
    expect(nightStreetLampsEnabled('high')).toBe(true);
  });

  it('fenêtres émissives plein rendu partout', () => {
    expect(nightWindowEmissiveScale('ultra-low')).toBe(0.5);
    expect(nightWindowEmissiveScale('low')).toBe(0.5);
    expect(nightWindowEmissiveScale('high')).toBe(0.5);
  });

  it('atténue les accents port loin du joueur', () => {
    const near = harborAccentIntensityAtDistance(0.5, 0, 0, -22, 22);
    const far = harborAccentIntensityAtDistance(0.5, 130, 130, -22, 22);
    expect(near).toBeCloseTo(0.5, 2);
    expect(far).toBeLessThan(0.15);
  });

  it('génère des lampadaires le long de la Canebière', () => {
    const cane = VIEUX_PORT_GROUND_CORRIDORS.find((c) => c.id === 'canebiere');
    expect(cane).toBeDefined();
    const specs = corridorStreetLampSpecs(cane!, 3.5, { maxRadiusFromOrigin: 115 });
    expect(specs.length).toBeGreaterThan(4);
  });

  it('ultra-low garde bloom/overlay mais scale les ombres via perf', () => {
    const tier = mapQualityTier('ultra-low');
    expect(tier.fxaa).toBe(true);
    expect(tier.bloom).toBe(true);
    expect(tier.cyberpunkOverlay).toBe(true);
    expect(mapPerfProfile('ultra-low').spotLightShadows).toBe(false);
    expect(mapPerfProfile('ultra-low').osmBuildingCap).toBe(
      mapPerfProfile('high').osmBuildingCap
    );
  });
});
