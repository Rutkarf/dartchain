import { describe, expect, it } from 'vitest';

import {
  getLodBand,
  lodBobAmplitude,
  lodRotationSpeed,
  shouldAnimateLodBand,
  shouldRenderCellAtLod,
} from './m4t3r-lod.util';

describe('M4T3R LOD', () => {
  it('classifie les bandes par distance monde', () => {
    expect(getLodBand(0)).toBe('near');
    expect(getLodBand(12)).toBe('near');
    expect(getLodBand(12.1)).toBe('mid');
    expect(getLodBand(32)).toBe('mid');
    expect(getLodBand(33)).toBe('far');
    expect(getLodBand(64)).toBe('far');
  });

  it('sous-échantillonne le damier aux bandes mid/far', () => {
    expect(shouldRenderCellAtLod(1, 1, 'near')).toBe(true);
    expect(shouldRenderCellAtLod(1, 1, 'mid')).toBe(false);
    expect(shouldRenderCellAtLod(2, 2, 'mid')).toBe(false);
    expect(shouldRenderCellAtLod(4, 4, 'mid')).toBe(true);
    expect(shouldRenderCellAtLod(4, 4, 'far')).toBe(false);
    expect(shouldRenderCellAtLod(8, 8, 'far')).toBe(true);
    expect(shouldRenderCellAtLod(8, 9, 'mid')).toBe(false);
  });

  it('réduit ou coupe animation CPU à distance', () => {
    expect(shouldAnimateLodBand('mid')).toBe(true);
    expect(shouldAnimateLodBand('far')).toBe(false);
    expect(lodBobAmplitude('far')).toBe(0);
    expect(lodBobAmplitude('mid')).toBeGreaterThan(0);
    expect(lodBobAmplitude('mid')).toBeLessThan(lodBobAmplitude('near'));
    expect(lodRotationSpeed(1, 'far')).toBe(0);
    expect(lodRotationSpeed(1, 'mid')).toBeLessThan(1);
    expect(lodRotationSpeed(1, 'near')).toBe(1);
  });
});
