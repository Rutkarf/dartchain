import { describe, expect, it } from 'vitest';

import { VIEUX_PORT_CORE_BUILDING_RADIUS } from './geo-reference.config';
import {
  STREAMING_CORE_FADE_OUTER_M,
  streamingBuildingBudget,
  streamingCoreFadeFactor,
} from './world-streaming-visual.util';

describe('world-streaming-visual.util Phase 6', () => {
  it('fade 0 dans le cœur geo-accurate', () => {
    expect(streamingCoreFadeFactor(0, 0)).toBe(0);
    expect(streamingCoreFadeFactor(100, 100)).toBe(0);
  });

  it('fade 1 au-delà de la zone de transition', () => {
    expect(STREAMING_CORE_FADE_OUTER_M).toBeGreaterThan(VIEUX_PORT_CORE_BUILDING_RADIUS);
    expect(streamingCoreFadeFactor(900, 900)).toBe(1);
  });

  it('réduit le budget bâtiments près du cœur', () => {
    const mid = VIEUX_PORT_CORE_BUILDING_RADIUS + 48;
    const fade = streamingCoreFadeFactor(mid, 0);
    expect(fade).toBeGreaterThan(0);
    expect(fade).toBeLessThan(1);
    expect(streamingBuildingBudget(8, fade)).toBeLessThan(8);
    expect(streamingBuildingBudget(8, 1)).toBe(8);
    expect(streamingBuildingBudget(8, 0.05)).toBe(0);
  });
});
