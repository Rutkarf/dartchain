/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';

import { METAVERSE_ARENA_PROFILE, arenaPerfOverrides, isArenaSlimWorld } from './metaverse-arena-profile';

describe('metaverse-arena-profile (MetaVerseBB night-tech)', () => {
  it('définit une arène compacte night-tech', () => {
    expect(METAVERSE_ARENA_PROFILE.id).toBe('metaversebb-night-tech-v1');
    expect(METAVERSE_ARENA_PROFILE.playRadiusMeters).toBeLessThanOrEqual(100);
    expect(METAVERSE_ARENA_PROFILE.nightShift).toBe(true);
    expect(METAVERSE_ARENA_PROFILE.fog.enabled).toBe(true);
    expect(METAVERSE_ARENA_PROFILE.palette.sand).toBeLessThan(0x0d0630);
  });

  it('active le monde slim MetaVerseBB par défaut (réactivation = false)', () => {
    expect(METAVERSE_ARENA_PROFILE.slimWorldEnabled).toBe(true);
    expect(isArenaSlimWorld(true)).toBe(true);
    expect(isArenaSlimWorld(false)).toBe(false);
  });

  it('réduit ombres / post-FX sans toucher aux caps OSM du profil de base', () => {
    const overrides = arenaPerfOverrides('medium');
    expect(overrides.spawnShadows).toBe(false);
    expect(overrides.useTaa).toBe(false);
    expect(overrides.shadowMapSize).toBeLessThanOrEqual(512);
  });
});
