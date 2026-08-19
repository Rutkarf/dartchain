import { describe, expect, it } from 'vitest';

import { MARSEILLE_HARBOR_WATER } from './map-configuration';
import {
  isHarborLandAt,
  isHarborWalkableRegionAt,
  isHarborWaterAt,
  isHarborWaterBlockedAt,
} from './vieux-port-layout.util';

describe('Vieux-Port layout', () => {
  it('place l’eau derrière le miroir et dans le bassin ouest', () => {
    expect(isHarborWaterAt(0, 40)).toBe(true);
    expect(isHarborWaterAt(-400, 0)).toBe(true);
    expect(isHarborWaterAt(-6.2, -2.4)).toBe(false);
    expect(isHarborWaterAt(0, 0)).toBe(false);
  });

  it('laisse la Canebière et le tapis M4T3R sur la terre', () => {
    expect(isHarborWaterAt(0, -80)).toBe(false);
    expect(isHarborLandAt(0, -80)).toBe(true);
    expect(isHarborLandAt(-6.2, -2.4)).toBe(true);
    expect(isHarborWalkableRegionAt(0, -80)).toBe(true);
  });

  it('autorise l’esplanade et bloque la marche dans l’eau', () => {
    expect(isHarborWalkableRegionAt(-6.2, -2.4)).toBe(true);
    expect(isHarborWalkableRegionAt(0, 40)).toBe(false);
    expect(isHarborWaterBlockedAt(0, 40, 0.35)).toBe(true);
    expect(isHarborWaterBlockedAt(-6.2, -2.4, 0.35)).toBe(false);
  });

  it('aligne le bras sud avec waterMinZ', () => {
    expect(isHarborWaterAt(0, MARSEILLE_HARBOR_WATER.waterMinZ + 5)).toBe(true);
    expect(isHarborWaterAt(0, MARSEILLE_HARBOR_WATER.waterMinZ - 2)).toBe(false);
  });
});
