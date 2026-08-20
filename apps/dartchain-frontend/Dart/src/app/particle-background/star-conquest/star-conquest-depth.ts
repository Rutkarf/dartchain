/**
 * Couches de profondeur Star Conquest — taille / opacite / vitesse / parallaxe.
 * Camera typique : z ≈ 120 (palier produit). Plus le Z monde est bas, plus l’élément est lointain.
 */

export type StarDepthLayerId = 'far' | 'mid' | 'interactive' | 'near';

export interface StarDepthLayerConfig {
  id: StarDepthLayerId;
  /** Centre Z monde de la couche. */
  zCenter: number;
  /** Demi-amplitude Z aléatoire. */
  zSpread: number;
  size: number;
  opacity: number;
  /** Multiplicateur de vitesse de dérive. */
  driftSpeed: number;
  /** Amplitude de dérive monde. */
  driftAmp: number;
  /** Réponse au pointeur (0 = aucune). */
  parallax: number;
  color: number;
  count: number;
}

/** Plans virtuels (arrière → avant Three.js, toujours sous Angular). */
export const STAR_DEPTH_LAYERS: Record<StarDepthLayerId, StarDepthLayerConfig> = {
  interactive: {
    id: 'interactive',
    zCenter: 0,
    zSpread: 22,
    size: 1,
    opacity: 0.42,
    driftSpeed: 1,
    /** ~22–40 px à fov 75 / cam z160 — dérive latérale vraiment lisible. */
    driftAmp: 14,
    parallax: 0.05,
    color: 0xffffff,
    count: 35,
  },
  far: {
    id: 'far',
    zCenter: -110,
    zSpread: 28,
    size: 0.78,
    opacity: 0.32,
    driftSpeed: 0.48,
    driftAmp: 3.2,
    parallax: 0.012,
    color: 0x6a7a9c,
    count: 0,
  },
  mid: {
    id: 'mid',
    zCenter: -48,
    zSpread: 18,
    size: 1.22,
    opacity: 0.38,
    driftSpeed: 0.68,
    driftAmp: 5.4,
    parallax: 0.028,
    color: 0x7ec8e8,
    count: 0,
  },
  near: {
    id: 'near',
    zCenter: 28,
    zSpread: 8,
    size: 1.98,
    opacity: 0.3,
    driftSpeed: 0.78,
    driftAmp: 4.2,
    parallax: 0.055,
    color: 0xc4b4f4,
    count: 0,
  },
};

/** Facteur profondeur [-1 lointain … +1 proche] → multiplicateurs UI. */
export function depthFactorFromZ(z: number): number {
  const { interactive } = STAR_DEPTH_LAYERS;
  const t =
    (z - (interactive.zCenter - interactive.zSpread)) /
    Math.max(1, interactive.zSpread * 2);
  return Math.max(-1, Math.min(1, t * 2 - 1));
}

/** Opacité label selon profondeur relative de la Quest. */
export function labelOpacityFromDepth(depth: number, reward: number): number {
  const rewardBoost = Math.min(0.12, Math.log10(reward + 1) * 0.05);
  return Math.max(0.58, Math.min(0.94, 0.68 + depth * 0.18 + rewardBoost));
}

/** Parallaxe desktop vs mobile. */
export function parallaxScaleForViewport(): number {
  if (typeof window === 'undefined') return 1;
  return window.innerWidth < 400 ? 0.45 : 1;
}
