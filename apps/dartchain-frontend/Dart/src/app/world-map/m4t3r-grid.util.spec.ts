import { isOnDiagonalCheckerboard, isWorldPositionOnCheckerboard } from './m4t3r-grid.util';

describe('m4t3r-grid util', () => {
  it('garde 1 case sur 4 en damier diagonal', () => {
    expect(isOnDiagonalCheckerboard(0, 0)).toBe(true);
    expect(isOnDiagonalCheckerboard(1, 0)).toBe(false);
    expect(isOnDiagonalCheckerboard(0, 1)).toBe(false);
    expect(isOnDiagonalCheckerboard(1, 1)).toBe(false);
    expect(isOnDiagonalCheckerboard(2, 0)).toBe(false);
    expect(isOnDiagonalCheckerboard(2, 2)).toBe(true);
    expect(isOnDiagonalCheckerboard(4, 0)).toBe(true);
    expect(isOnDiagonalCheckerboard(-1, 0)).toBe(false);
    expect(isOnDiagonalCheckerboard(-1, -1)).toBe(false);
  });

  it('aligne le damier sur la grille de rendu 1,25 m', () => {
    expect(isWorldPositionOnCheckerboard(0.625, 0.625)).toBe(true);
    expect(isWorldPositionOnCheckerboard(1.875, 0.625)).toBe(false);
  });
});
