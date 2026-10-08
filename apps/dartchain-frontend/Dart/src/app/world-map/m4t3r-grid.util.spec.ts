/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';

import { MIRROR_SPAWN_SAFE_ZONE } from './map-configuration';
import {
  isM4t3rGroundPositionActive,
  isOnDiagonalCheckerboard,
  isWorldPositionOnCheckerboard,
  M4T3R_SPAWN_DENSE_CELL_SIZE,
} from './m4t3r-grid.util';
import { R4V3_GROUND_FIELD } from './map-configuration';

describe('m4t3r-grid util', () => {
  it('garde 1 case sur 2 en damier diagonal (diagonales doublées)', () => {
    expect(isOnDiagonalCheckerboard(0, 0)).toBe(true);
    expect(isOnDiagonalCheckerboard(1, 0)).toBe(false);
    expect(isOnDiagonalCheckerboard(0, 1)).toBe(false);
    expect(isOnDiagonalCheckerboard(1, 1)).toBe(true);
    expect(isOnDiagonalCheckerboard(2, 0)).toBe(true);
    expect(isOnDiagonalCheckerboard(2, 2)).toBe(true);
    expect(isOnDiagonalCheckerboard(3, 1)).toBe(true);
    expect(isOnDiagonalCheckerboard(3, 0)).toBe(false);
    expect(isOnDiagonalCheckerboard(4, 0)).toBe(true);
    expect(isOnDiagonalCheckerboard(-1, 0)).toBe(false);
    expect(isOnDiagonalCheckerboard(-1, -1)).toBe(true);
  });

  it('aligne le damier sur la grille de rendu 1,25 m', () => {
    expect(isWorldPositionOnCheckerboard(0.625, 0.625)).toBe(true);
    expect(isWorldPositionOnCheckerboard(1.875, 0.625)).toBe(false);
    expect(isWorldPositionOnCheckerboard(1.875, 1.875)).toBe(true);
  });

  it('densifie ×10 dans le cercle SPAWN sans changer la règle hors cercle', () => {
    expect(M4T3R_SPAWN_DENSE_CELL_SIZE).toBeCloseTo(
      R4V3_GROUND_FIELD.cellSize / Math.sqrt(5),
      5
    );
    // Centre ombrière = toujours actif (spawn).
    expect(
      isM4t3rGroundPositionActive(
        MIRROR_SPAWN_SAFE_ZONE.centerX,
        MIRROR_SPAWN_SAFE_ZONE.centerZ
      )
    ).toBe(true);
    // Case hors damier ET hors spawn (au-delà du rayon SAFE) → inactive.
    const outsideX = 21.875; // gx=17, gz=0 → off-diagonal
    const outsideZ = 0.625;
    expect(Math.hypot(outsideX, outsideZ)).toBeGreaterThan(
      MIRROR_SPAWN_SAFE_ZONE.radiusMeters
    );
    expect(isWorldPositionOnCheckerboard(outsideX, outsideZ)).toBe(false);
    expect(isM4t3rGroundPositionActive(outsideX, outsideZ)).toBe(false);
  });
});
