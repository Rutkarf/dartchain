import { describe, expect, it } from 'vitest';

import {
  BUILDING_LOD_POLICY,
  HERO_BUILDING_LOD_POLICY,
  SKYLINE_LANDMARK_LOD_POLICY,
  buildingLodAtDistance,
  buildingLodAtDistanceForSkyline,
} from './building-lod.model';

describe('building-lod.model (ITER-008)', () => {
  it('classe les distances sans toucher au LOD M4T3R', () => {
    expect(buildingLodAtDistance(10)).toBe('full');
    expect(buildingLodAtDistance(BUILDING_LOD_POLICY.fullMaxMeters)).toBe('full');
    expect(buildingLodAtDistance(100)).toBe('massing');
    expect(buildingLodAtDistance(300)).toBe('impostor');
    expect(buildingLodAtDistance(500)).toBe('culled');
  });

  it('Phase 10 — héros full jusqu’à 80 m, skyline visible depuis le port', () => {
    expect(buildingLodAtDistance(72, { hero: true })).toBe('full');
    expect(buildingLodAtDistance(HERO_BUILDING_LOD_POLICY.fullMaxMeters, { hero: true })).toBe(
      'full'
    );
    expect(buildingLodAtDistance(72, { hero: false })).toBe('massing');
    expect(buildingLodAtDistanceForSkyline(1100)).toBe('massing');
    expect(buildingLodAtDistanceForSkyline(SKYLINE_LANDMARK_LOD_POLICY.impostorMaxMeters)).toBe(
      'impostor'
    );
  });
});
