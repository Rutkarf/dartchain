import { describe, expect, it } from 'vitest';

import {
  osmContentPriorityTier,
  sortOsmEntriesByContentPriority,
} from './osm-content-priority.util';

describe('osm-content-priority Phase 23', () => {
  it('priorise spawn puis Canebière puis périphérie', () => {
    expect(osmContentPriorityTier(0, 0)).toBe(0);
    expect(osmContentPriorityTier(10, 5)).toBe(0);
    expect(osmContentPriorityTier(800, 800)).toBe(3);
  });

  it('trie par tier puis distance', () => {
    const sorted = sortOsmEntriesByContentPriority([
      { center: { x: 400, z: 400 }, distSq: 100 },
      { center: { x: 5, z: 5 }, distSq: 50 },
      { center: { x: 80, z: 10 }, distSq: 6400 },
    ]);
    expect(sorted[0]!.center.x).toBe(5);
    expect(sorted[1]!.center.x).toBe(80);
    expect(sorted[2]!.center.x).toBe(400);
  });
});
