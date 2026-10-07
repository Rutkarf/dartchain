import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';

import {
  OsmExtrusionCache,
  clearOsmExtrusionCache,
  getOsmExtrusionCache,
} from './osm-extrusion-cache.util';

describe('OsmExtrusionCache Phase 20', () => {
  beforeEach(() => {
    clearOsmExtrusionCache();
  });

  it('réutilise une extrusion pour deux empreintes identiques décalées', () => {
    const cache = new OsmExtrusionCache();
    const rect = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(10, 0),
      new THREE.Vector2(10, 8),
      new THREE.Vector2(0, 8),
    ];
    const shifted = rect.map((p) => new THREE.Vector2(p.x + 40, p.y + 20));

    const a = cache.cloneWallExtrusion(rect, 14)!;
    const b = cache.cloneWallExtrusion(shifted, 14)!;

    expect(a.offsetX).toBeCloseTo(5, 0);
    expect(b.offsetX).toBeCloseTo(45, 0);
    expect(a.geometry).not.toBe(b.geometry);

    const stats = cache.getStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(1);

    a.geometry.dispose();
    b.geometry.dispose();
    cache.clear();
  });

  it('expose un cache singleton partagé', () => {
    const a = getOsmExtrusionCache();
    const b = getOsmExtrusionCache();
    expect(a).toBe(b);
    clearOsmExtrusionCache();
  });
});
