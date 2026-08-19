import { describe, expect, it } from 'vitest';

import { MARSEILLE_HARBOR_WATER } from './map-configuration';
import {
  groundExclusionFactorAt,
  isGroundCellExcluded,
  shouldRenderGroundCell,
} from './m4t3r-ground-exclusion.util';

describe('M4T3R ground exclusion', () => {
  it('exclut le polygone portuaire et laisse le spawn terrestre', () => {
    expect(isGroundCellExcluded(-6.2, -2.4)).toBe(false);
    expect(isGroundCellExcluded(0, 80)).toBe(true);
    expect(isGroundCellExcluded(-420, 0)).toBe(true);
    expect(isGroundCellExcluded(0, MARSEILLE_HARBOR_WATER.waterMinZ + 5)).toBe(true);
    expect(groundExclusionFactorAt(-6.2, -2.4)).toBe(1);
    expect(groundExclusionFactorAt(0, 80)).toBe(0);
  });

  it('adoucit la densité près du bord eau/terre', () => {
    const edgeFactor = groundExclusionFactorAt(0, MARSEILLE_HARBOR_WATER.waterMinZ - 3);
    expect(edgeFactor).toBeGreaterThan(0);
    expect(edgeFactor).toBeLessThan(1);
  });

  it('combine exclusion et LOD de façon déterministe', () => {
    expect(shouldRenderGroundCell(0, 0, 0, 0, 'near')).toBe(true);
    expect(shouldRenderGroundCell(1, 0, 1.25, 0, 'near')).toBe(false);
    expect(shouldRenderGroundCell(0, 1, 0, 1.25, 'near')).toBe(false);
    expect(shouldRenderGroundCell(2, 2, 2.5, 2.5, 'near')).toBe(true);
    expect(shouldRenderGroundCell(0, 0, 0, 80, 'near')).toBe(false);
  });
});
