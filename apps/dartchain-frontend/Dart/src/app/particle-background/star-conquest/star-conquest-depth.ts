/**
 * Couches de profondeur Star Conquest — taille / opacite / vitesse / parallaxe.
 * Camera typique : z ≈ 160. Plus le Z monde est bas, plus l’élément est lointain.
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
    size: 0.42,
    opacity: 0.1,
    driftSpeed: 0.55,
    driftAmp: 3.5,
    parallax: 0.012,
    color: 0x3a2f55,
    /** Décor retiré — seules les 35 quests interactives sont rendues. */
    count: 0,
  },
  mid: {
    id: 'mid',
    zCenter: -48,
    zSpread: 18,
    size: 0.72,
    opacity: 0.15,
    driftSpeed: 0.75,
    driftAmp: 6,
    parallax: 0.028,
    color: 0x4a3d68,
    count: 0,
  },
  near: {
    id: 'near',
    zCenter: 28,
    zSpread: 8,
    size: 1.2,
    opacity: 0.09,
    driftSpeed: 0.85,
    driftAmp: 4.5,
    parallax: 0.055,
    color: 0x5a4a78,
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
  return Math.max(0.42, Math.min(0.88, 0.55 + depth * 0.18 + rewardBoost));
}

/** Parallaxe desktop vs mobile. */
export function parallaxScaleForViewport(): number {
  if (typeof window === 'undefined') return 1;
  return window.innerWidth < 400 ? 0.45 : 1;
}
