import * as THREE from 'three';

import { activeAtmospherePreset } from './marseille-atmosphere.config';

export type HorizonAtmosphereVariant = 'night' | 'twilight' | 'day';

export interface HorizonMaskStop {
  offset: number;
  alpha: number;
}

/** Variante masque CSS selon preset atmosphere (Phase 12). */
export function horizonAtmosphereVariant(): HorizonAtmosphereVariant {
  const preset = activeAtmospherePreset();
  if (preset.id.includes('twilight')) return 'twilight';
  if (preset.nightShift) return 'night';
  return 'day';
}

/** Décode fogColor Three.js → composantes RGB 0–255. */
export function atmosphereFogRgb(): { r: number; g: number; b: number } {
  const fog = activeAtmospherePreset().fogColor;
  return {
    r: (fog >> 16) & 255,
    g: (fog >> 8) & 255,
    b: fog & 255,
  };
}

const VARIANT_MASK_TWEAK: Record<
  HorizonAtmosphereVariant,
  { fadeBias: number; topAlpha: number }
> = {
  night: { fadeBias: 0, topAlpha: 0 },
  twilight: { fadeBias: 0.06, topAlpha: 0.06 },
  day: { fadeBias: -0.04, topAlpha: 0.12 },
};

/**
 * Stops masque CSS alignés sur le fog gameplay — transition douce vers Star Conquest.
 */
export function harmonizedHorizonMaskStops(variant?: HorizonAtmosphereVariant): HorizonMaskStop[] {
  const preset = activeAtmospherePreset();
  const v = variant ?? horizonAtmosphereVariant();
  const tweak = VARIANT_MASK_TWEAK[v];
  const fadeStart = THREE.MathUtils.clamp(
    preset.fogFar / 1280 + tweak.fadeBias,
    0.54,
    0.72
  );
  const mid = THREE.MathUtils.clamp(fadeStart + 0.1, 0.6, 0.8);
  const late = THREE.MathUtils.clamp(fadeStart + 0.2, 0.72, 0.92);

  return [
    { offset: 0, alpha: 1 },
    { offset: 0.5, alpha: 1 },
    { offset: fadeStart, alpha: 0.9 },
    { offset: mid, alpha: 0.48 },
    { offset: late, alpha: 0.14 + tweak.topAlpha },
    { offset: 1, alpha: 0 },
  ];
}

export function harmonizedHorizonMaskImage(variant?: HorizonAtmosphereVariant): string {
  const { r, g, b } = atmosphereFogRgb();
  const stops = harmonizedHorizonMaskStops(variant)
    .map((stop) => `rgba(${r}, ${g}, ${b}, ${stop.alpha}) ${(stop.offset * 100).toFixed(0)}%`)
    .join(', ');
  return `linear-gradient(to top, ${stops})`;
}

/** Teinte zenith pour fond wrapper (optionnel, Phase 12). */
export function harmonizedHorizonSkyCssColor(): string {
  const { r, g, b } = atmosphereFogRgb();
  const zenithMix = 0.35;
  const zr = Math.round(r * (1 - zenithMix));
  const zg = Math.round(g * (1 - zenithMix));
  const zb = Math.round(b * (1 - zenithMix) + 8);
  return `rgb(${zr}, ${zg}, ${zb})`;
}
