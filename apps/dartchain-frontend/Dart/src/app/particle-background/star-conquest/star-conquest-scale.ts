/**
 * Scale Star Conquest — levier visuel du palier produit.
 *
 * Palier actuel : produit (`product`).
 * `company` reste un plafond visuel : ne pas l’activer tant que
 * la boucle claim, le catalogue N et le budget GPU tiennent.
 */

export type StarConquestScaleTier = 'rd' | 'product' | 'company';
export type StarConquestGpuQuality = 'ultra-low' | 'low' | 'medium' | 'high';

/** Viewport exclusif (dev + prod). Aucun autre palier d’écran. */
export const STAR_CONQUEST_DESIGN_VIEWPORT = {
  w: 250,
  h: 550,
} as const;

/**
 * Overlays HTML cadré 250×550 — indépendant du palier visuel 3D.
 * Le monde Three peut déborder (pan stick) ; le chrome UI jamais.
 */
export const STAR_CONQUEST_OVERLAY = {
  marginPx: 6,
  panelW: 74,
  panelH: 78,
  panelCompactW: 70,
  panelCompactH: 70,
  scannerW: 176,
  scannerMaxH: 156,
  /** Bande bas viewport réservée aux sticks floor MOVE/VIEW. */
  floorChromeH: 86,
  labelFontPx: 8.5,
  labelSepPx: 14,
  joystickHitPx: 32,
} as const;

export interface StarConquestOverlayBox {
  margin: number;
  panelW: number;
  panelH: number;
  compactW: number;
  compactH: number;
  scannerW: number;
  scannerH: number;
  floorChromeH: number;
  usableBottom: number;
}

export function starConquestOverlayBox(
  viewportW: number = STAR_CONQUEST_DESIGN_VIEWPORT.w,
  viewportH: number = STAR_CONQUEST_DESIGN_VIEWPORT.h
): StarConquestOverlayBox {
  const m = STAR_CONQUEST_OVERLAY.marginPx;
  const floor = STAR_CONQUEST_OVERLAY.floorChromeH;
  const maxW = Math.max(96, viewportW - m * 2);
  return {
    margin: m,
    panelW: Math.min(STAR_CONQUEST_OVERLAY.panelW, maxW),
    panelH: Math.min(STAR_CONQUEST_OVERLAY.panelH, Math.max(88, viewportH - floor - m * 2)),
    compactW: Math.min(STAR_CONQUEST_OVERLAY.panelCompactW, maxW),
    compactH: Math.min(STAR_CONQUEST_OVERLAY.panelCompactH, Math.max(80, viewportH - floor - m * 2)),
    scannerW: Math.min(STAR_CONQUEST_OVERLAY.scannerW, maxW),
    scannerH: Math.min(STAR_CONQUEST_OVERLAY.scannerMaxH, Math.round(viewportH * 0.28)),
    floorChromeH: floor,
    usableBottom: viewportH - floor - m,
  };
}

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
  /** Facteur overlay HTML — 1 = cadré 250×550 (`STAR_CONQUEST_OVERLAY`). */
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
    ui: 1,
    depthDensity: 1.55,
    panSpeed: 60,
    minSeparation: 5.2,
    textureSize: 1.45,
    maxOffscreen: 6,
  },
  product: {
    visual: 2.74,
    cameraZ: 108,
    /** Monde pan légèrement plus large ; contenu au repos cadré 250×550. */
    worldExtent: 1.28,
    /** Débord min — constellations quasi entièrement dans le viewport. */
    overflowRatio: 0.06,
    layout: 1.12,
    drift: 1.12,
    filamentWidthPx: 13,
    pickRadiusPx: 28,
    ui: 1,
    depthDensity: 1.85,
    panSpeed: 66,
    minSeparation: 5.4,
    textureSize: 2,
    maxOffscreen: 2,
  },
  company: {
    visual: 3.02,
    cameraZ: 106,
    worldExtent: 1.78,
    overflowRatio: 0.42,
    layout: 1.78,
    drift: 1.55,
    filamentWidthPx: 14,
    pickRadiusPx: 30,
    ui: 1,
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
