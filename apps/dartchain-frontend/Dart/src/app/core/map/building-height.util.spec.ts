import { describe, expect, it } from 'vitest';

import {
  MARSEILLE_LANDMARK_BUILDINGS,
} from './geo-reference.config';
import {
  resolveBuildingHeightFromTags,
  resolveGeoBuildingHeight,
} from './building-height.util';

describe('building-height.util', () => {
  it('priorise height OSM puis levels puis type', () => {
    expect(resolveBuildingHeightFromTags({ height: '24.5' }).heightMeters).toBe(24.5);
    expect(resolveBuildingHeightFromTags({ height: '24.5' }).heightSource).toBe('height');

    const levels = resolveBuildingHeightFromTags({ 'building:levels': '6' });
    expect(levels.heightSource).toBe('levels');
    expect(levels.heightMeters).toBeCloseTo(19.2, 1);

    const hotel = resolveBuildingHeightFromTags({ building: 'hotel' });
    expect(hotel.heightSource).toBe('type');
    expect(hotel.heightMeters).toBe(20);
  });

  it('conserve les hauteurs hardcodées des landmarks sans tags', () => {
    for (const def of MARSEILLE_LANDMARK_BUILDINGS) {
      const resolved = resolveGeoBuildingHeight(def);
      expect(resolved.heightSource).toBe('hardcoded');
      expect(resolved.heightMeters).toBe(def.heightMeters);
    }
  });

  it('remplace hardcoded si tags OSM explicites', () => {
    const def = MARSEILLE_LANDMARK_BUILDINGS[0];
    const resolved = resolveGeoBuildingHeight(def, { height: '28' });
    expect(resolved.heightMeters).toBe(28);
    expect(resolved.heightSource).toBe('height');
  });
});
