import { describe, expect, it } from 'vitest';

import {
  cameraMovedEnough,
  isSimIdle,
  shouldRunSimTick,
} from './marseille-sim-throttle.util';

describe('marseille-sim-throttle Phase 15', () => {
  it('skip simulation frames selon profil', () => {
    expect(shouldRunSimTick(0, 1, 3, false)).toBe(true);
    expect(shouldRunSimTick(1, 1, 3, false)).toBe(false);
    expect(shouldRunSimTick(2, 1, 3, false)).toBe(true);
  });

  it('idle augmente le skip effectif', () => {
    expect(shouldRunSimTick(1, 0, 2, true)).toBe(false);
    expect(shouldRunSimTick(3, 0, 2, true)).toBe(true);
  });

  it('détecte caméra idle et mouvement LOD', () => {
    expect(isSimIdle(0, 0, 0.01, 0.01)).toBe(true);
    expect(cameraMovedEnough(0, 0, 2, 0, 1.5)).toBe(true);
    expect(cameraMovedEnough(0, 0, 0.2, 0, 1.5)).toBe(false);
  });
});
