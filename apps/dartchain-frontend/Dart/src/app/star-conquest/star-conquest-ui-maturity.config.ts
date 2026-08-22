/**
 * Star Conquest UI maturity — profondeur, ruche, repos calme, 250×550.
 * Ne remplace pas le thème univers : les multiplicateurs s’appliquent au rendu.
 */

import type { StarConquestGpuQuality } from './star-conquest-scale';
import {
  STAR_CONQUEST_DESIGN_VIEWPORT,
  STAR_CONQUEST_SCALE,
} from './star-conquest-scale';

/** Demi-extents monde visibles à z=0 pour le viewport design (fov 75°). */
export function starConquestVisibleHalfExtents(
  cameraZ = STAR_CONQUEST_SCALE.cameraZ,
  fovDeg = 75,
  vw = STAR_CONQUEST_DESIGN_VIEWPORT.w,
  vh = STAR_CONQUEST_DESIGN_VIEWPORT.h
): { halfW: number; halfH: number } {
  const halfH = Math.tan((fovDeg * Math.PI) / 360) * cameraZ;
  const halfW = halfH * (vw / Math.max(vh, 1));
  return { halfW, halfH };
}

/**
 * Inclinaison de l’axe circulaire (radians) — bas = proche joueur, haut = fond.
 * ~58° : ellipse lisible, pas un disque plat.
 */
export function starConquestRingTilt(): number {
  return 1.01;
}

/**
 * Rayon galaxie / essaim — calé pour que le cercle des 5 galaxies
 * tienne dans 250×550 (marge pour clusters + respiration).
 */
export function starConquestGalaxyRadius(): number {
  const { halfW, halfH } = starConquestVisibleHalfExtents();
  const tilt = starConquestRingTilt();
  const ringY = Math.cos(tilt);
  const fill = 0.78;
  const ringMax = Math.min(
    halfW * fill,
    (halfH * fill) / Math.max(ringY, 0.35)
  );
  // Anneau structurel = radius * 0.62 (hive.layout / effects)
  return ringMax / 0.62;
}

/** Amplitude Z issue du biais (sin tilt × rayon d’anneau). */
export function starConquestRingDepthAmp(): number {
  return starConquestGalaxyRadius() * 0.62 * Math.sin(starConquestRingTilt());
}

/**
 * Repos calme — la surbrillance forte est réservée au focus.
 * Les valeurs thème (`coreOpacity`, `haloSizeMult`) restent inchangées.
 */
export const STAR_CONQUEST_REST_GLOW = {
  coreMul: 0.34,
  haloMul: 0.22,
  bloomMul: 0.12,
  ghostMul: 0.18,
  vertexMul: 0.48,
  breatheAmp: 0.008,
  packetMul: 0.22,
  auroraRestMul: 0.38,
  labelRestMul: 0,
  constellationRestMul: 0.22,
  filamentRestMul: 0.08,
  moteRestMul: 0.12,
  pulseRestMul: 0.1,
} as const;

export const STAR_CONQUEST_FOCUS_GLOW = {
  coreOpacity: 0.94,
  haloOpacity: 0.4,
  bloomOpacity: 0.28,
  ghostOpacity: 0.14,
  pulseAmp: 0.08,
} as const;

/** Profil effets mobile 250×550 — densité, pas suppression. */
export const STAR_CONQUEST_MOBILE_QUALITY: Record<
  StarConquestGpuQuality,
  { restMul: number; hiveOpacity: number; echoParallax: number }
> = {
  'ultra-low': { restMul: 0.72, hiveOpacity: 0.1, echoParallax: 0.35 },
  low: { restMul: 0.82, hiveOpacity: 0.12, echoParallax: 0.45 },
  medium: { restMul: 1, hiveOpacity: 0.16, echoParallax: 0.7 },
  high: { restMul: 1, hiveOpacity: 0.18, echoParallax: 0.85 },
};

export function starConquestMobileQuality(
  quality: StarConquestGpuQuality = 'medium'
): (typeof STAR_CONQUEST_MOBILE_QUALITY)[StarConquestGpuQuality] {
  return STAR_CONQUEST_MOBILE_QUALITY[quality];
}

export const STAR_CONQUEST_LAYOUT_250 = {
  minTouchPx: 32,
  panelMaxH: 188,
  scannerMaxH: 160,
  labelFontPx: 8,
  /** Remplissage du cercle dans le frustum (0–1). */
  ringFill: 0.78,
} as const;
