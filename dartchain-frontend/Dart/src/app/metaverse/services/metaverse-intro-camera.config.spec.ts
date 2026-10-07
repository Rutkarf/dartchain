import { describe, expect, it } from 'vitest';

import {
  METAVERSE_INTRO_CAMERA,
  easeHeroicFantasy,
  easeInOutCubic,
  easeOutCubic,
  smoothstep,
} from './metaverse-intro-camera.config';

describe('metaverse-intro-camera.config', () => {
  it('définit une spirale cinematic fluide', () => {
    expect(METAVERSE_INTRO_CAMERA.durationSeconds).toBeGreaterThan(6);
    expect(METAVERSE_INTRO_CAMERA.durationSeconds).toBeLessThanOrEqual(10);
    expect(METAVERSE_INTRO_CAMERA.spiralTurns).toBeGreaterThan(1);
    expect(METAVERSE_INTRO_CAMERA.spiralTurns).toBeLessThan(2.5);
    expect(METAVERSE_INTRO_CAMERA.startHeight).toBeGreaterThan(35);
    expect(METAVERSE_INTRO_CAMERA.holdTitleSeconds).toBeGreaterThan(1);
    expect(METAVERSE_INTRO_CAMERA.veilEnterSeconds).toBeGreaterThan(0.3);
    expect(METAVERSE_INTRO_CAMERA.veilRevealSeconds).toBeGreaterThan(1);
    expect(METAVERSE_INTRO_CAMERA.characterBlendStart).toBeLessThan(0.6);
  });

  it('easeHeroicFantasy = easeInOutCubic borné', () => {
    expect(easeHeroicFantasy(0)).toBe(0);
    expect(easeHeroicFantasy(1)).toBe(1);
    expect(easeHeroicFantasy(0.5)).toBeCloseTo(0.5, 5);
  });

  it('easeInOutCubic / easeOutCubic bornés', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it('smoothstep interpolate entre bords', () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(0.5, 1, 0.25)).toBe(0);
    expect(smoothstep(0.5, 1, 1.5)).toBe(1);
  });
});
