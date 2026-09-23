import { MARSEILLE_ARENA_PROFILE, arenaPerfOverrides } from './marseille-arena-profile';

describe('marseille-arena-profile (B+)', () => {
  it('définit une arène compacte méditerranéenne', () => {
    expect(MARSEILLE_ARENA_PROFILE.id).toBe('mediterranean-arena-v1');
    expect(MARSEILLE_ARENA_PROFILE.playRadiusMeters).toBeLessThanOrEqual(100);
    expect(MARSEILLE_ARENA_PROFILE.nightShift).toBe(false);
    expect(MARSEILLE_ARENA_PROFILE.fog.enabled).toBe(true);
  });

  it('réduit ombres / post-FX sans toucher aux caps OSM du profil de base', () => {
    const overrides = arenaPerfOverrides('medium');
    expect(overrides.spawnShadows).toBe(false);
    expect(overrides.useTaa).toBe(false);
    expect(overrides.shadowMapSize).toBeLessThanOrEqual(512);
  });
});
