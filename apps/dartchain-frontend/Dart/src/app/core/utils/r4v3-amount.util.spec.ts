import {
  formatR4v3Amount,
  normalizeR4v3Amount,
  R4V3_DECIMALS,
} from './r4v3-amount.util';

describe('r4v3-amount.util', () => {
  it('formats microcent amounts with 26 decimals', () => {
    expect(
      formatR4v3Amount('0.00000000000000000000000042')
    ).toBe(`0,${'0'.repeat(24)}42`);
  });

  it('normalizes API strings', () => {
    expect(normalizeR4v3Amount('10.5')).toBe('10.5');
    expect(normalizeR4v3Amount(null)).toBe('0');
  });

  it('uses 26 decimals by default', () => {
    expect(formatR4v3Amount('1').split(',')[1].length).toBe(R4V3_DECIMALS);
  });
});
