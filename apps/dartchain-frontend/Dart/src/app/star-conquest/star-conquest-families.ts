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
    hex: '#4FE0EC',
    rgb: [0.31, 0.88, 0.93],
    rgb255: [79, 224, 236],
  },
  three: {
    id: 'three',
    label: 'Three.js',
    // Violet UI #c77dff / pillar violet
    hex: '#B794FF',
    rgb: [0.72, 0.58, 1],
    rgb255: [183, 148, 255],
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
    hex: '#56DCA8',
    rgb: [0.34, 0.86, 0.66],
    rgb255: [86, 220, 168],
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
