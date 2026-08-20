import {
  ACTIVE_ATMOSPHERE_PRESET_ID,
  MARSEILLE_ATMOSPHERE_PRESETS,
  activeAtmospherePreset,
} from './marseille-atmosphere.config';

describe('marseille-atmosphere.config (ITER-013)', () => {
  it('garde le preset gameplay actuel (pas de fog forcé)', () => {
    expect(ACTIVE_ATMOSPHERE_PRESET_ID).toBe('currentGameplay');
    expect(activeAtmospherePreset().fogEnabled).toBe(false);
    expect(MARSEILLE_ATMOSPHERE_PRESETS.nightHarbor.nightShift).toBe(true);
  });
});
