import { describe, expect, it } from 'vitest';

import { MARSEILLE_LANDMARK_BUILDINGS } from '../geo-reference.config';
import { HERO_SKYLINE_LANDMARKS } from './landmark-hero.config';
import { createLandmarkTwinCatalog } from './landmark-twin.catalog';

describe('landmark-twin.catalog (ITER-021)', () => {
  it('produit un jumeau par héros OSM sans placeholder', () => {
    const catalog = createLandmarkTwinCatalog();
    expect(catalog.length).toBe(
      MARSEILLE_LANDMARK_BUILDINGS.length + HERO_SKYLINE_LANDMARKS.length
    );
    expect(catalog.every((item) => item.footprintSource === 'PROJECTED')).toBe(true);
    expect(catalog.every((item) => item.heightSource === 'APPROXIMATE')).toBe(true);
    expect(catalog.every((item) => item.cyberpunkVariant === 'none')).toBe(true);
    expect(catalog.map((item) => item.id).sort()).toEqual(
      [
        ...MARSEILLE_LANDMARK_BUILDINGS.map((item) => item.id),
        ...HERO_SKYLINE_LANDMARKS.map((item) => item.id),
      ].sort()
    );
  });
});
