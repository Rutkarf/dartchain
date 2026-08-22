import { describe, expect, it } from 'vitest';

import { resolveCadastreVisualTier } from './cadastre-building-visual.util';

describe('cadastre-building-visual', () => {
  it('landmarks → tier hero', () => {
    expect(resolveCadastreVisualTier(10, 20, 'high', true)).toBe('hero');
  });

  it('parcelle proche spawn + confiance → tier cadastre', () => {
    expect(resolveCadastreVisualTier(35, 40, 'high', false)).toBe('cadastre');
    expect(resolveCadastreVisualTier(35, 40, 'medium', false)).toBe('cadastre');
  });

  it('parcelle lointaine ou confiance basse → tier standard', () => {
    expect(resolveCadastreVisualTier(120, 80, 'high', false)).toBe('standard');
    expect(resolveCadastreVisualTier(20, 30, 'low', false)).toBe('standard');
  });
});
