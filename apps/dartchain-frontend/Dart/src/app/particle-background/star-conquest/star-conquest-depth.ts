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
    zCenter: -168,
    zSpread: 40,
    size: 0.48,
    opacity: 0.16,
    driftSpeed: 0.22,
    driftAmp: 1.6,
    parallax: 0.006,
    color: 0x3a4558,
    count: 0,
  },
  mid: {
    id: 'mid',
    zCenter: -78,
    zSpread: 24,
    size: 0.92,
    opacity: 0.24,
    driftSpeed: 0.42,
    driftAmp: 3.2,
    parallax: 0.024,
    color: 0x5a8aa8,
    count: 0,
  },
  near: {
    id: 'near',
    zCenter: 22,
    zSpread: 8,
    size: 1.55,
    opacity: 0.2,
    driftSpeed: 0.58,
    driftAmp: 2.8,
    parallax: 0.055,
    color: 0x9a8cc8,
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
  return 1;
}
