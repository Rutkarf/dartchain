import { describe, expect, it } from 'vitest';

import { groundTopY } from './ground-surface.config';
import {
  M4T3R_ABOVE_SIDEWALK_OFFSET,
  M4T3R_DENSITY_CONFIG,
  R4V3_ABOVE_SIDEWALK_OFFSET,
  R4V3_GROUND_FIELD,
} from './map-configuration';

describe('M4T3R ground height (Phase 1.5)', () => {
  it('aligne M4T3R groundY sur le trottoir Phase 1', () => {
    expect(M4T3R_DENSITY_CONFIG.groundY).toBeCloseTo(
      groundTopY('sidewalk') + M4T3R_ABOVE_SIDEWALK_OFFSET,
      4
    );
  });

  it('aligne R4V3 groundY sur le trottoir Phase 1', () => {
    expect(R4V3_GROUND_FIELD.groundY).toBeCloseTo(
      groundTopY('sidewalk') + R4V3_ABOVE_SIDEWALK_OFFSET,
      4
    );
  });
});
