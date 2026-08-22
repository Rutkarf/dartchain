import { describe, expect, it } from 'vitest';

import {
  bufferOpenPolylineXZ,
  polylineLengthMeters,
  ringAreaMetersSq,
} from './highway-buffer.util';

describe('highway-buffer.util (Phase 1.5)', () => {
  it('buffer une polyligne droite en rectangle', () => {
    const ring = bufferOpenPolylineXZ(
      [
        { x: 0, z: 0 },
        { x: 0, z: -20 },
      ],
      4
    );
    expect(ring).not.toBeNull();
    expect(ring!.length).toBe(4);
    expect(ringAreaMetersSq(ring!)).toBeCloseTo(20 * 8, 0);
  });

  it('calcule la longueur cumulée', () => {
    const len = polylineLengthMeters([
      { x: 0, z: 0 },
      { x: 3, z: 4 },
    ]);
    expect(len).toBeCloseTo(5, 4);
  });

  it('gère un coude avec miter limité', () => {
    const ring = bufferOpenPolylineXZ(
      [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        { x: 10, z: 10 },
      ],
      3
    );
    expect(ring).not.toBeNull();
    expect(ring!.length).toBeGreaterThanOrEqual(4);
    expect(ringAreaMetersSq(ring!)).toBeGreaterThan(50);
  });
});
