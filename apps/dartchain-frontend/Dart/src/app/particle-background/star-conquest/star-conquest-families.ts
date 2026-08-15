/**
 * Star Conquest — 5 familles de Quests + palette centralisée.
 * Teintes alignées sur Three legacy (cyan/magenta floor) et accents UI existants.
 */

export type StarQuestFamily =
  | 'interface'
  | 'three'
  | 'blockchain'
  | 'backend'
  | 'quality';

export interface StarQuestFamilyTheme {
  id: StarQuestFamily;
  label: string;
  /** Hex principal (UI badge / CSS). */
  hex: string;
  /** RGB 0–1 pour Three.js vertex colors. */
  rgb: readonly [number, number, number];
  /** RGB 0–255 pour CSS `rgba()`. */
  rgb255: readonly [number, number, number];
}

/** Palette maîtrisée sur fond noir — pas de fluo agressif. */
export const STAR_QUEST_FAMILIES: Record<StarQuestFamily, StarQuestFamilyTheme> = {
  interface: {
    id: 'interface',
    label: 'Interface',
    // Floor cyan legacy #00F5FF → un cran adouci
    hex: '#3ECFDC',
    rgb: [0.24, 0.81, 0.86],
    rgb255: [62, 207, 220],
  },
  three: {
    id: 'three',
    label: 'Three.js',
    // Violet UI #c77dff / pillar violet
    hex: '#A78BFA',
    rgb: [0.65, 0.55, 0.98],
    rgb255: [167, 139, 250],
  },
  blockchain: {
    id: 'blockchain',
    label: 'M4T3R',
    // Amber chat / accent or
    hex: '#E8B86D',
    rgb: [0.91, 0.72, 0.43],
    rgb255: [232, 184, 109],
  },
  backend: {
    id: 'backend',
    label: 'Backend',
    // Vert émeraude chat #5dffb1 → adouci
    hex: '#4ECD9A',
    rgb: [0.31, 0.8, 0.6],
    rgb255: [78, 205, 154],
  },
  quality: {
    id: 'quality',
    label: 'Conquête',
    // Floor magenta #FF2D9A → fuchsia contenu
    hex: '#E85A9B',
    rgb: [0.91, 0.35, 0.61],
    rgb255: [232, 90, 155],
  },
};

export const STAR_QUEST_FAMILY_ORDER: readonly StarQuestFamily[] = [
  'interface',
  'three',
  'blockchain',
  'backend',
  'quality',
] as const;

/** Mapping catégorie métier → famille visuelle. */
export function familyFromCategory(
  category: string
): StarQuestFamily {
  switch (category) {
    case 'three':
      return 'three';
    case 'gamification':
      // Achievements / progression → Conquête ; overrides M4T3R → blockchain
      return 'quality';
    case 'backend':
    case 'data':
    case 'security':
      return 'backend';
    case 'tests':
    case 'quality':
    case 'performance':
      return 'quality';
    default:
      // swap, ux, showcase, a11y, dock, graph, angular, responsive…
      return 'interface';
  }
}

export function familyTheme(family: StarQuestFamily): StarQuestFamilyTheme {
  return STAR_QUEST_FAMILIES[family];
}

/** Mélange discret de deux familles (ponts inter-couleurs). */
export function blendFamilyRgb(
  a: StarQuestFamily,
  b: StarQuestFamily,
  t = 0.5
): [number, number, number] {
  const A = STAR_QUEST_FAMILIES[a].rgb;
  const B = STAR_QUEST_FAMILIES[b].rgb;
  return [
    A[0] + (B[0] - A[0]) * t,
    A[1] + (B[1] - A[1]) * t,
    A[2] + (B[2] - A[2]) * t,
  ];
}
