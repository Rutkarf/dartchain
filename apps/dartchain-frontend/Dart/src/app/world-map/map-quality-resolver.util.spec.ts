import { describe, expect, it } from 'vitest';

import {
  isMapQuality,
  PRODUCT_MAP_QUALITY,
  readMapQualityFromUrl,
  resolveMapQuality,
} from './map-quality-resolver.util';

describe('map-quality-resolver.util', () => {
  it('valide les tiers connus', () => {
    expect(isMapQuality('ultra-low')).toBe(true);
    expect(isMapQuality('low')).toBe(true);
    expect(isMapQuality('medium')).toBe(true);
    expect(isMapQuality('high')).toBe(true);
    expect(isMapQuality('ultra')).toBe(false);
    expect(isMapQuality(null)).toBe(false);
  });

  it('lit ?mapQuality= depuis la query (legacy)', () => {
    expect(readMapQualityFromUrl('?mapQuality=low')).toBe('low');
    expect(readMapQualityFromUrl('?mapQuality=ultra-low&foo=1')).toBe('ultra-low');
    expect(readMapQualityFromUrl('?foo=bar')).toBeUndefined();
  });

  it('verrouille ultra-low quel que soit URL / env / fallback', () => {
    expect(PRODUCT_MAP_QUALITY).toBe('ultra-low');
    expect(
      resolveMapQuality({ urlQuality: 'high', envQuality: 'low', fallback: 'medium' })
    ).toBe('ultra-low');
    expect(resolveMapQuality({ envQuality: 'high', fallback: 'medium' })).toBe('ultra-low');
    expect(resolveMapQuality({ fallback: 'low' })).toBe('ultra-low');
    expect(resolveMapQuality()).toBe('ultra-low');
  });
});
