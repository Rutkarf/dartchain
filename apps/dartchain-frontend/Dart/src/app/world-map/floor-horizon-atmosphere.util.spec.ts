import { describe, expect, it } from 'vitest';

import { activeAtmospherePreset } from './marseille-atmosphere.config';
import {
  atmosphereFogRgb,
  harmonizedHorizonMaskImage,
  harmonizedHorizonMaskStops,
  harmonizedHorizonSkyCssColor,
  horizonAtmosphereVariant,
} from './floor-horizon-atmosphere.util';

describe('floor-horizon-atmosphere.util Phase 6', () => {
  it('aligne le masque sur la couleur fog atmosphere', () => {
    const { r, g, b } = atmosphereFogRgb();
    const preset = activeAtmospherePreset();
    expect(r).toBe((preset.fogColor >> 16) & 255);
    expect(g).toBe((preset.fogColor >> 8) & 255);
    expect(b).toBe(preset.fogColor & 255);

    const image = harmonizedHorizonMaskImage();
    expect(image.startsWith('linear-gradient(to top,')).toBe(true);
    expect(image).toContain(`rgba(${r}, ${g}, ${b}, 1)`);
    expect(image).toContain(`rgba(${r}, ${g}, ${b}, 0)`);
  });

  it('stops monotones du sol vers le ciel', () => {
    const stops = harmonizedHorizonMaskStops();
    expect(stops[0].alpha).toBe(1);
    expect(stops[stops.length - 1].alpha).toBe(0);
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i].offset).toBeGreaterThan(stops[i - 1].offset);
      expect(stops[i].alpha).toBeLessThanOrEqual(stops[i - 1].alpha);
    }
  });

  it('Phase 12 — variante nuit + teinte CSS zenith', () => {
    expect(horizonAtmosphereVariant()).toBe('night');
    expect(harmonizedHorizonSkyCssColor()).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    const twilightStops = harmonizedHorizonMaskStops('twilight');
    const nightStops = harmonizedHorizonMaskStops('night');
    expect(twilightStops[twilightStops.length - 1].alpha).toBeGreaterThanOrEqual(
      nightStops[nightStops.length - 1].alpha
    );
  });
});
