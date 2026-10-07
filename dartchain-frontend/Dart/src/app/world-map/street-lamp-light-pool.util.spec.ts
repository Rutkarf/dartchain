import { describe, expect, it, vi } from 'vitest';

import { createStreetLampLightPool } from './street-lamp-light-pool.util';

describe('street-lamp-light-pool', () => {
  it('crée au plus cap SpotLights pour N specs', () => {
    const specs = Array.from({ length: 24 }, (_, i) => ({
      x: i * 4,
      y: 3.5,
      z: 0,
    }));
    const pool = createStreetLampLightPool(specs, 8)!;
    expect(pool.lights).toHaveLength(8);
    pool.dispose();
  });

  it('repositionne le pool vers les specs proches du focus', () => {
    const specs = [
      { x: 0, y: 3.5, z: 0 },
      { x: 100, y: 3.5, z: 0 },
    ];
    const pool = createStreetLampLightPool(specs, 1)!;
    pool.update(95, 0);
    expect(pool.lights[0]!.position.x).toBeCloseTo(100, 0);
    pool.update(2, 0);
    expect(pool.lights[0]!.position.x).toBeCloseTo(0, 0);
    pool.dispose();
  });

  it('retourne null si cap 0', () => {
    expect(createStreetLampLightPool([{ x: 0, y: 1, z: 0 }], 0)).toBeNull();
  });
});
