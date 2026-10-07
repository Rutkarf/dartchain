import {
  heroDepthFor,
  itemDepth,
  nearestIndex,
  offsetForIndex,
  stepSpring,
  tiltKick,
} from './depth-rail.math';

describe('depth-rail math', () => {
  it('places the active index at the hero depth', () => {
    const spacing = 40;
    const hero = heroDepthFor(6, spacing, false);
    const offset = offsetForIndex(2, spacing, hero, false);
    expect(itemDepth(2, 6, offset, spacing, false)).toBeCloseTo(hero);
    expect(itemDepth(0, 6, offset, spacing, false)).toBeLessThan(hero);
    expect(nearestIndex(6, offset, spacing, false, hero)).toBe(2);
  });

  it('wraps depth inside the loop', () => {
    const spacing = 50;
    const count = 4;
    const depth = itemDepth(0, count, 0, spacing, true);
    expect(depth).toBeGreaterThanOrEqual(-(count * spacing) / 2);
    expect(depth).toBeLessThan((count * spacing) / 2);
  });

  it('springs toward the target and clamps the tilt kick', () => {
    const next = stepSpring(0, 0, 100, 80, 18, 0.016);
    expect(next.current).toBeGreaterThan(0);
    expect(next.current).toBeLessThan(100);
    expect(tiltKick(800, 5)).toBeCloseTo(800 / 220);
    expect(tiltKick(2000, 5)).toBe(5);
    expect(tiltKick(-2000, 5)).toBe(-5);
  });
});
