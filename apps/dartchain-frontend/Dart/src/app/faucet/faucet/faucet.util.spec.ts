import {
  formatM4t3rUnitCount,
  formatSmartbarAmount,
  formatSpacedDecimalDigits,
  m4t3rUnitCount,
} from './faucet.util';

describe('faucet.util m4t3r count', () => {
  const seven = `0.${'0'.repeat(25)}7`;

  it('compte les m4t3r depuis la chaîne décimale exacte', () => {
    expect(m4t3rUnitCount(seven)).toBe(7n);
    expect(formatM4t3rUnitCount(seven)).toBe('7');
  });

  it('ne réduit pas 10^-26 à zéro', () => {
    expect(formatM4t3rUnitCount(`0.${'0'.repeat(25)}1`)).toBe('1');
    expect(formatM4t3rUnitCount(1e-26)).toBe('1');
  });

  it('lit la notation scientifique en entier, pas via un float', () => {
    expect(formatM4t3rUnitCount('8E-26')).toBe('8');
    expect(formatM4t3rUnitCount('7e-26')).toBe('7');
    expect(m4t3rUnitCount('1.00e-26')).toBe(1n);
  });
});

describe('faucet.util smartbar spacing', () => {
  it('espace les décimales par paquets de 3 et formate 0 , …', () => {
    const digits = `${'0'.repeat(25)}1`;
    const spaced = formatSpacedDecimalDigits(digits);
    expect(spaced).toBe('000\u202f000\u202f000\u202f000\u202f000\u202f000\u202f000\u202f000\u202f01');
    expect(formatSmartbarAmount('0', digits)).toBe(`0 , ${spaced}`);
  });
});
