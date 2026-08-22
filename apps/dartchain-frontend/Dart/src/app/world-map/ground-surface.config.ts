/**
 * Stack verticale Phase 1 — profondeur route / trottoir / bordure / esplanade.
 * 1 unité Three.js = 1 m. Référence : walkSurfaceY = 0 (map-configuration).
 */
export const GROUND_SURFACE_LEVELS = {
  /** Dalle terrain de base (PlaneGeometry). */
  baseTerrainY: 0,
  /** Dessus chaussée — légèrement en contrebas du tapis piéton. */
  roadTopY: -0.02,
  roadThickness: 0.22,
  /** Dessus trottoir — surélevé par rapport à la route. */
  sidewalkTopY: 0.1,
  sidewalkThickness: 0.1,
  /** Dessus bordure (entre route et trottoir). */
  curbTopY: 0.14,
  curbThickness: 0.06,
  curbWidth: 0.42,
  /** Esplanade Ombrière — gameplay spawn. */
  esplanadeTopY: 0.36,
  esplanadeThickness: 0.36,
  /** Quai surélevé (aligné resolveSurfaceHeight existant). */
  quayTopY: 0.17,
  quayThickness: 0.12,
  /** Contact shadow sous bordures (AO fake). */
  contactShadowY: 0.004,
  contactShadowOpacity: 0.28,
} as const;

export type GroundSurfaceKind =
  | 'road'
  | 'sidewalk'
  | 'curb'
  | 'esplanade'
  | 'quay'
  | 'default';

/** Matériaux wet-night — alignés CYBERPUNK_ART_DIRECTION.streets. */
export const GROUND_MATERIAL_PRESETS = {
  road: {
    wetRoughness: 0.32,
    wetMetalness: 0.38,
    color: 0xffffff,
    envMapIntensity: 0.7,
  },
  sidewalk: {
    roughness: 0.9,
    metalness: 0.02,
    color: 0xbfb7ab,
  },
  curb: {
    roughness: 0.55,
    metalness: 0.12,
    color: 0x9aa3ad,
  },
  gutter: {
    roughness: 0.22,
    metalness: 0.45,
    color: 0x2a3038,
  },
  esplanade: {
    roughness: 0.78,
    metalness: 0.08,
    color: 0xc8c0b4,
  },
  quay: {
    roughness: 0.34,
    metalness: 0.26,
    color: 0xa8b0bc,
    envMapIntensity: 0.82,
    sheen: 0.08,
  },
} as const;

export function groundTopY(kind: GroundSurfaceKind): number {
  const L = GROUND_SURFACE_LEVELS;
  switch (kind) {
    case 'road':
      return L.roadTopY;
    case 'sidewalk':
      return L.sidewalkTopY;
    case 'curb':
      return L.curbTopY;
    case 'esplanade':
      return L.esplanadeTopY;
    case 'quay':
      return L.quayTopY;
    default:
      return L.baseTerrainY;
  }
}

export function groundThickness(kind: GroundSurfaceKind): number {
  const L = GROUND_SURFACE_LEVELS;
  switch (kind) {
    case 'road':
      return L.roadThickness;
    case 'sidewalk':
      return L.sidewalkThickness;
    case 'curb':
      return L.curbThickness;
    case 'esplanade':
      return L.esplanadeThickness;
    case 'quay':
      return L.quayThickness;
    default:
      return 0.02;
  }
}

/** Centre Y d'une BoxGeometry dont le dessus est à topY. */
export function boxCenterYForTop(topY: number, thickness: number): number {
  return topY - thickness * 0.5;
}
