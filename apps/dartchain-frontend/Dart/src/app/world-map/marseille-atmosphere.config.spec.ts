import { describe, expect, it } from 'vitest';

import {
  ACTIVE_ATMOSPHERE_PRESET_ID,
  MARSEILLE_ATMOSPHERE_PRESETS,
  activeAtmospherePreset,
} from './marseille-atmosphere.config';

describe('marseille-atmosphere.config Phase 0', () => {
  it('active le preset gameplay portuaire avec fog modéré', () => {
    expect(ACTIVE_ATMOSPHERE_PRESET_ID).toBe('nightHarborGameplay');
    const preset = activeAtmospherePreset();
    expect(preset.fogEnabled).toBe(true);
    expect(preset.fogNear).toBeGreaterThan(100);
    expect(preset.fogFar).toBeGreaterThan(preset.fogNear);
    expect(preset.environmentIntensity).toBeGreaterThan(0.6);
    expect(MARSEILLE_ATMOSPHERE_PRESETS.nightHarbor.nightShift).toBe(true);
  });
});
