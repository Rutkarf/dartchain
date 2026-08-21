import {
  FLOOR_HORIZON_BLEND,
  floorHorizonMaskImage,
} from './floor-horizon-blend.config';

describe('floor-horizon-blend.config', () => {
  it('force un ciel et un fog noirs (pas le navy WORLD_BACKGROUND)', () => {
    expect(FLOOR_HORIZON_BLEND.skyColor).toBe(0x000000);
    expect(FLOOR_HORIZON_BLEND.fog.color).toBe(0x000000);
    expect(FLOOR_HORIZON_BLEND.clearAlpha).toBe(1);
    expect(FLOOR_HORIZON_BLEND.fog.far).toBeGreaterThan(FLOOR_HORIZON_BLEND.fog.near);
    expect(FLOOR_HORIZON_BLEND.fog.near).toBeGreaterThanOrEqual(400);
    expect(FLOOR_HORIZON_BLEND.fog.far).toBeGreaterThanOrEqual(1000);
  });

  it('fondu masque : opaque au sol, transparent à la démarcation nébuleuse', () => {
    const stops = FLOOR_HORIZON_BLEND.maskStops;
    expect(stops[0].offset).toBe(0);
    expect(stops[0].alpha).toBe(1);
    const last = stops[stops.length - 1];
    expect(last.offset).toBe(1);
    expect(last.alpha).toBe(0);
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i].offset).toBeGreaterThan(stops[i - 1].offset);
      expect(stops[i].alpha).toBeLessThanOrEqual(stops[i - 1].alpha);
    }
  });

  it('génère un linear-gradient CSS utilisable en mask-image', () => {
    const image = floorHorizonMaskImage();
    expect(image.startsWith('linear-gradient(to top,')).toBe(true);
    expect(image).toContain('rgba(0, 0, 0, 1)');
    expect(image).toContain('rgba(0, 0, 0, 0)');
  });
});
