/**
 * Scale Star Conquest — levier visuel du palier produit.
 *
 * Palier actuel : produit (`product`).
 * `company` reste un plafond visuel : ne pas l’activer tant que
 * la boucle claim, le catalogue N et le budget GPU tiennent.
 */

export type StarConquestScaleTier = 'rd' | 'product' | 'company';
export type StarConquestGpuQuality = 'ultra-low' | 'low' | 'medium' | 'high';

/** Viewport de design (shell one-page). */
export const STAR_CONQUEST_DESIGN_VIEWPORT = {
  w: 250,
  h: 550,
} as const;

export interface StarConquestScaleProfile {
  /** Sprite / halo / bloom (monde Three). */
  visual: number;
  /** Camera Z — plus proche = plus grand à l’écran (`sizeAttenuation`). */
  cameraZ: number;
  /** Cadre monde vs viewport (ping-pong + aurore). */
  worldExtent: number;
  /** Débord latéral du layout (0.14 historique). */
  overflowRatio: number;
  /** Rayons / grilles / orbites peers. */
  layout: number;
  /** Dérive des quêtes. */
  drift: number;
  /** Largeur filaments (px écran). */
  filamentWidthPx: number;
  /** Hit-test particules (px). */
  pickRadiusPx: number;
  /** Joystick + overlays HTML. */
  ui: number;
  /** Densité étoiles de fond vs thème. */
  depthDensity: number;
  /** Vitesse de pan caméra. */
  panSpeed: number;
  /** Séparation mini entre quêtes (monde). */
  minSeparation: number;
  /** Multiplicateur textures canvas. */
  textureSize: number;
  /** Quêtes hors écran autorisées à l’init. */
  maxOffscreen: number;
}

/**
 * rd      — R&D : composant agrandi, encore cadré 250×550.
 * product — palier visuel viable (étoiles lisibles, aurore, labels).
 * company — étendue max ; ne pas activer tant que le GPU low tient.
 */
export const STAR_CONQUEST_SCALE_PROFILES: Record<
  StarConquestScaleTier,
  StarConquestScaleProfile
> = {
  rd: {
    visual: 2.12,
    cameraZ: 128,
    worldExtent: 1.32,
    overflowRatio: 0.24,
    layout: 1.32,
    drift: 1.28,
    filamentWidthPx: 9.2,
    pickRadiusPx: 24,
    ui: 1.18,
    depthDensity: 1.55,
    panSpeed: 60,
    minSeparation: 5.2,
    textureSize: 1.45,
    maxOffscreen: 6,
  },
  product: {
    visual: 2.74,
    cameraZ: 108,
    worldExtent: 1.64,
    overflowRatio: 0.34,
    layout: 1.62,
    drift: 1.34,
    filamentWidthPx: 13,
    pickRadiusPx: 34,
    ui: 1.42,
    depthDensity: 2.18,
    panSpeed: 66,
    minSeparation: 6.6,
    textureSize: 2,
    maxOffscreen: 9,
  },
  company: {
    visual: 3.02,
    cameraZ: 106,
    worldExtent: 1.78,
    overflowRatio: 0.42,
    layout: 1.78,
    drift: 1.55,
    filamentWidthPx: 14,
    pickRadiusPx: 36,
    ui: 1.48,
    depthDensity: 2.42,
    panSpeed: 76,
    minSeparation: 7.8,
    textureSize: 2.25,
    maxOffscreen: 12,
  },
};

/** Palier visuel actif — produit professionnel. */
export const STAR_CONQUEST_SCALE_TIER: StarConquestScaleTier = 'product';

export const STAR_CONQUEST_SCALE: StarConquestScaleProfile =
  STAR_CONQUEST_SCALE_PROFILES[STAR_CONQUEST_SCALE_TIER];

/**
 * Plafond GPU selon `mapQuality` — le palier `product` ne doit pas
 * exploser le fillrate low-end.
 */
export const STAR_CONQUEST_GPU_BUDGET: Record<
  StarConquestGpuQuality,
  { depthDensity: number; dprCap: number }
> = {
  'ultra-low': { depthDensity: 0.32, dprCap: 1 },
  low: { depthDensity: 0.55, dprCap: 1.25 },
  medium: { depthDensity: 1.12, dprCap: 1.85 },
  high: { depthDensity: 1.22, dprCap: 2 },
};

export function starConquestDepthDensity(
  quality: StarConquestGpuQuality = 'medium'
): number {
  return STAR_CONQUEST_SCALE.depthDensity * STAR_CONQUEST_GPU_BUDGET[quality].depthDensity;
}

export function starConquestDprCap(
  quality: StarConquestGpuQuality = 'medium'
): number {
  return STAR_CONQUEST_GPU_BUDGET[quality].dprCap;
}

export function starConquestPongSize(
  viewportW: number = STAR_CONQUEST_DESIGN_VIEWPORT.w,
  viewportH: number = STAR_CONQUEST_DESIGN_VIEWPORT.h
): { w: number; h: number } {
  const extent = STAR_CONQUEST_SCALE.worldExtent;
  return {
    w: Math.round(viewportW * extent),
    h: Math.round(viewportH * extent),
  };
}

const DESIGN_PONG = starConquestPongSize();
export const STAR_PONG_OUTER_W = DESIGN_PONG.w;
export const STAR_PONG_OUTER_H = DESIGN_PONG.h;

export const STAR_WORLD_OVERFLOW_RATIO = STAR_CONQUEST_SCALE.overflowRatio;
export const STAR_MAX_OFFSCREEN_AT_INIT = STAR_CONQUEST_SCALE.maxOffscreen;

export function scaledTextureSize(base: number): number {
  return Math.max(16, Math.round(base * STAR_CONQUEST_SCALE.textureSize));
}

export function nextStarConquestScaleTier(
  tier: StarConquestScaleTier = STAR_CONQUEST_SCALE_TIER
): StarConquestScaleTier {
  if (tier === 'rd') return 'product';
  if (tier === 'product') return 'company';
  return 'company';
}
