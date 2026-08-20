/**
 * Constellations zodiacales — silhouettes d’ancrage pour Star Conquest (niveau 3).
 * Inspiration formelle uniquement ; les Quests restent des améliorations produit.
 * Hubs étendus : le viewport n’est qu’une fenêtre sur un ciel plus large.
 */

import type { StarQuestFamily } from './star-conquest-families';

export interface ConstellationPoint {
  /** Position relative dans la boîte constellation [0–1]. */
  u: number;
  v: number;
}

export interface StarConstellation {
  id: string;
  /** Nom d’inspiration zodiacale. */
  label: string;
  family: StarQuestFamily;
  /** Centre dans le monde UV (peut être hors [0–1] pour déborder du viewport). */
  hubU: number;
  hubV: number;
  /** Demi-largeur / demi-hauteur relative de la boîte. */
  halfW: number;
  halfH: number;
  /** Silhouette (7 points pour 7 Quests). */
  points: readonly ConstellationPoint[];
  /** Indices de liens de silhouette (décoratifs). */
  edges: readonly [number, number][];
}

/**
 * 5 constellations — étalées gauche / centre / droite (fragments hors champ OK).
 */
export const STAR_CONSTELLATIONS: readonly StarConstellation[] = [
  {
    id: 'libra',
    label: 'Balance',
    family: 'interface',
    hubU: 0.06,
    hubV: 0.34,
    halfW: 0.3,
    halfH: 0.3,
    points: [
      { u: 0.5, v: 0.12 },
      { u: 0.18, v: 0.38 },
      { u: 0.82, v: 0.38 },
      { u: 0.12, v: 0.62 },
      { u: 0.88, v: 0.62 },
      { u: 0.35, v: 0.78 },
      { u: 0.65, v: 0.82 },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 4],
      [1, 5],
      [2, 6],
      [5, 6],
    ],
  },
  {
    id: 'aquarius',
    label: 'Verseau',
    family: 'three',
    hubU: 0.94,
    hubV: 0.3,
    halfW: 0.3,
    halfH: 0.32,
    points: [
      { u: 0.15, v: 0.25 },
      { u: 0.4, v: 0.12 },
      { u: 0.68, v: 0.28 },
      { u: 0.88, v: 0.18 },
      { u: 0.22, v: 0.58 },
      { u: 0.55, v: 0.52 },
      { u: 0.78, v: 0.72 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [0, 4],
      [4, 5],
      [5, 6],
      [2, 5],
    ],
  },
  {
    id: 'leo',
    label: 'Lion',
    family: 'blockchain',
    hubU: 0.5,
    hubV: 0.2,
    halfW: 0.36,
    halfH: 0.28,
    points: [
      { u: 0.5, v: 0.08 },
      { u: 0.22, v: 0.28 },
      { u: 0.78, v: 0.25 },
      { u: 0.12, v: 0.55 },
      { u: 0.88, v: 0.52 },
      { u: 0.38, v: 0.78 },
      { u: 0.7, v: 0.85 },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 6],
    ],
  },
  {
    id: 'taurus',
    label: 'Taureau',
    family: 'backend',
    hubU: -0.02,
    hubV: 0.64,
    halfW: 0.28,
    halfH: 0.28,
    points: [
      { u: 0.35, v: 0.15 },
      { u: 0.65, v: 0.18 },
      { u: 0.18, v: 0.42 },
      { u: 0.82, v: 0.4 },
      { u: 0.28, v: 0.7 },
      { u: 0.72, v: 0.68 },
      { u: 0.5, v: 0.88 },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 6],
    ],
  },
  {
    id: 'scorpio',
    label: 'Scorpion',
    family: 'quality',
    hubU: 1.02,
    hubV: 0.66,
    halfW: 0.28,
    halfH: 0.3,
    points: [
      { u: 0.2, v: 0.2 },
      { u: 0.45, v: 0.15 },
      { u: 0.7, v: 0.28 },
      { u: 0.85, v: 0.48 },
      { u: 0.55, v: 0.55 },
      { u: 0.35, v: 0.72 },
      { u: 0.62, v: 0.88 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [4, 5],
      [5, 6],
      [3, 6],
    ],
  },
] as const;

export function constellationForFamily(
  family: StarQuestFamily
): StarConstellation {
  return (
    STAR_CONSTELLATIONS.find((c) => c.family === family) ?? STAR_CONSTELLATIONS[0]
  );
}

/** Convertit un point relatif constellation → UV monde (peut sortir de [0–1]). */
export function constellationPointToBandUv(
  c: StarConstellation,
  pointIndex: number
): { u: number; v: number } {
  const p = c.points[pointIndex % c.points.length];
  return {
    u: c.hubU + (p.u - 0.5) * 2 * c.halfW,
    v: c.hubV + (p.v - 0.5) * 2 * c.halfH,
  };
}

import {
  STAR_MAX_OFFSCREEN_AT_INIT as SCALE_MAX_OFFSCREEN,
  STAR_WORLD_OVERFLOW_RATIO as SCALE_OVERFLOW_RATIO,
} from './star-conquest-scale';

/** Débordement latéral — palier de scale R&D (upgrade produit/société). */
export const STAR_WORLD_OVERFLOW_RATIO = SCALE_OVERFLOW_RATIO;
/** Maximum de particules hors fenêtre à l’initialisation. */
export const STAR_MAX_OFFSCREEN_AT_INIT = SCALE_MAX_OFFSCREEN;
