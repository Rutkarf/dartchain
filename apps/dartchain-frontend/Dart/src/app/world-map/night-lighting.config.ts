import type { MapQuality } from './map-configuration';

/** Phase 8 + 14 — éclairage de nuit (parité visuelle). */
export const NIGHT_LIGHTING_DEFAULTS = {
  spotColor: 0xffe8c8,
  spotIntensity: 0.72,
  spotDistance: 16,
  spotAngle: Math.PI / 5.2,
  spotPenumbra: 0.44,
  spotDecay: 1.35,
  lampSpacingM: 13,
  spawnLampRadiusM: 115,
} as const;

export function nightStreetLampsEnabled(_quality: MapQuality): boolean {
  return true;
}

/** Multiplicateur emissive fenêtres — plein rendu sur tous les tiers. */
export function nightWindowEmissiveScale(_quality: MapQuality): number {
  return 0.5;
}

export function harborAccentIntensityAtDistance(
  baseIntensity: number,
  focusX: number,
  focusZ: number,
  accentX: number,
  accentZ: number,
  fullRadiusM = 48,
  fadeRadiusM = 140
): number {
  const dist = Math.hypot(focusX - accentX, focusZ - accentZ);
  if (dist <= fullRadiusM) return baseIntensity;
  if (dist >= fadeRadiusM) return baseIntensity * 0.22;
  const t = (dist - fullRadiusM) / (fadeRadiusM - fullRadiusM);
  return baseIntensity * (1 - t * 0.78);
}
