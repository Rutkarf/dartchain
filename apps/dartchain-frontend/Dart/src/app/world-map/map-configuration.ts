import { groundTopY } from './ground-surface.config';

/** Identifiant du fournisseur de carte actif. */
export type MapProviderId = 'legacy-floor' | 'marseille-osm-three';

/** Niveau de qualité pour le streaming terrain / bâtiments. */
export type MapQuality = 'ultra-low' | 'low' | 'medium' | 'high';

export interface MapBounds {
  south: number;
  north: number;
  west: number;
  east: number;
}

export interface GeoPosition {
  latitude: number;
  longitude: number;
  altitude: number;
}

export interface MapStartOrientation {
  /** Rotation du personnage autour de Y. */
  characterRotationY: number;
  /** Yaw initial de la caméra orbitale. */
  cameraYaw: number;
  /** Pitch initial de la caméra orbitale. */
  cameraPitch: number;
  /** Distance initiale caméra-personnage. */
  cameraDistance: number;
  /** Regard un peu devant le perso (mètres, vers la Canebière). */
  cameraLookAhead: number;
}

export interface WorldAnchor {
  x: number;
  y: number;
  z: number;
}

/**
 * Échelle type Google Earth : 1 unité Three.js = 1 mètre réel.
 * L’origine locale reste le Vieux-Port. Ne pas changer worldScale pour zoomer.
 */
export const WORLD_METERS_PER_UNIT = 1;

/**
 * Ancrage station + miroir + spawn.
 * Coordonnées monde locales (mètres), nord = −Z, est = +X.
 */
export const METRO_SPAWN_ANCHOR = {
  id: 'vieux-port-metro-mirror',
  stationName: 'Vieux-Port — Station Miroir',
  mirror: { x: 0, y: 8.0, z: 0 } satisfies WorldAnchor,
  offsetFromMirror: { x: -16.4, y: 0, z: -11.2 } satisfies WorldAnchor,
  /**
   * Spawn juste derrière le miroir (sud / +Z), encore sur l’esplanade avant l’eau.
   * Face Canebière (−Z), dos à la mer (+Z).
   */
  spawnOffsetFromMirror: { x: 0, y: 0, z: 5.0 } satisfies WorldAnchor,
} as const;

/** Vue de validation séparée — n’écrase pas la caméra orbitale tant qu’elle n’est pas activée. */
export const VIEUX_PORT_METRO_MIRROR_VIEW = {
  id: 'VIEUX_PORT_METRO_MIRROR_VIEW',
  position: { x: 22, y: 16, z: 32 } satisfies WorldAnchor,
  lookAt: { x: -6, y: 2.2, z: -8 } satisfies WorldAnchor,
} as const;

/** Vue alignement bâtiments / quais / mer — debug géoréférencement Vieux-Port. */
export const VIEUX_PORT_BUILDING_ALIGNMENT_VIEW = {
  id: 'VIEUX_PORT_BUILDING_ALIGNMENT_VIEW',
  position: { x: -18, y: 38, z: 52 } satisfies WorldAnchor,
  lookAt: { x: 8, y: 12, z: -12 } satisfies WorldAnchor,
} as const;

/** Identifiant stable du 2e bâtiment adjacent au miroir (est du Vieux-Port). */
export const MIRROR_SECOND_BUILDING_ID = 'mirror-adjacent-building-02';

/** Origine géographique = Ombrière (OSM way/200273945). Voir geo-reference.config.ts. */
export {
  MARSEILLE_GEO_ORIGIN,
  GEO_REFERENCE_CONFIG,
  GEOGRAPHIC_DATA_SOURCES,
} from './geo-reference.config';

export const SCENE_COPY = {
  canopyTitle: 'MetaVerseBB',
  roadMarking: 'Hack The Planet x)',
  r4v3: 'R4V3',
  m4t3rPickup: '+1',
} as const;

/** Feedback visuel de ramassage M4T3R — aucun crédit token côté client. */
export const M4T3R_PICKUP_FX = {
  text: '+1',
  durationMs: 900,
  riseMeters: 1.35,
  headOffsetMeters: 0.32,
  stackLaneSpacingMeters: 1.0,
  poolSize: 48,
  maxBurst: 14,
  spriteStartScale: 0.7,
  spritePopBoost: 0.0875,
  spriteGrowScale: 0.1375,
  glowOpacity: 0.2,
} as const;

/** Pièce 3D type Mario — pop élastique + flip + montée verticale. */
export const M4T3R_COIN_PICKUP_FX = {
  durationMs: 820,
  poolSize: 48,
  maxBurst: 14,
  popHeight: 0.62,
  riseMeters: 2.15,
  spinSpeed: 18,
  flipSpeed: 22,
  staggerSeconds: 0.04,
  startScale: 1,
  peakScale: 1.52,
  sparkleScale: 2.1,
  burstScale: 2.6,
  emissiveBase: 0.58,
  emissivePulse: 0.42,
} as const;

/** Token / pickup légèrement au-dessus du trottoir (Phase 1.5 ground stack). */
export const M4T3R_ABOVE_SIDEWALK_OFFSET = 0.08;

/** R4V3 tapis — offset au-dessus du trottoir. */
export const R4V3_ABOVE_SIDEWALK_OFFSET = 0.05;

const SIDEWALK_SURFACE_Y = groundTopY('sidewalk');

/**
 * Densité logique 1 cm (1 unité = 1 m).
 * Rendu agrégé par cluster 25 cm — jamais une instance par centimètre.
 */
export const M4T3R_DENSITY_CONFIG = {
  logicalCellSize: 0.01,
  visualClusterSize: 0.14,
  pickupRadius: 0.12,
  visibleRadius: 9,
  respawnDelayMs: 30_000,
  maxVisibleInstances: 8192,
  /** Trottoir Phase 1 + offset visible (tokens / trail). */
  groundY: SIDEWALK_SURFACE_Y + M4T3R_ABOVE_SIDEWALK_OFFSET,
  /** @deprecated Utiliser MARSEILLE_GROUND_EXCLUSION_ZONES — conservé pour compat tests. */
  waterMinZ: 14,
} as const;

/** Zone d'exclusion M4T3R au sol (eau, quais) — remplace la coupure `z > waterMinZ`. */
export interface GroundExclusionZone {
  id: string;
  polygon: ReadonlyArray<{ x: number; z: number }>;
  /** Transition de densité progressive côté terre (m). */
  softEdgeMeters: number;
}

/**
 * Vieux-Port — géométrie partagée eau / terre / exclusion M4T3R.
 * 1 unité = 1 m, nord = −Z, est = +X.
 * Miroir à (0,0) : bassin ouest (−X) + bras sud (+Z) visible depuis l'esplanade.
 */
export const MARSEILLE_HARBOR_WATER = {
  landMinZ: -420,
  landMaxZ: 8,
  /** Eau juste derrière le miroir (sud = +Z, face personnage nord −Z). */
  waterMinZ: 6.5,
  waterMaxZ: 520,
  /** @deprecated Utiliser isHarborWaterAt() — conservé pour tests/debug. */
  walkBlockMaxZ: 6.5,
  /** Bassin rectangulaire (~850 m) vers l'embouchure ouest (−X). */
  basinMinX: -880,
  basinMaxX: 22,
  basinMinZ: -58,
  basinMaxZ: 58,
  minX: -880,
  maxX: 120,
  /** Sol piéton / tapis M4T3R. */
  walkSurfaceY: 0,
  /** Quais surélevés par rapport à l'eau. */
  quaySurfaceY: 0.05,
  /** Surface de l'eau — ~1,2 m sous le quai (lisible depuis l'esplanade). */
  waterSurfaceY: -1.15,
  /** Fond du bassin (couche sombre sous la surface). */
  waterDeepY: -1.85,
  /** @deprecated Alias de waterSurfaceY. */
  surfaceY: -1.15,
  surfaceColor: 0x3eb8c8,
  deepColor: 0x0a4a62,
  shallowColor: 0x7adce8,
  foamColor: 0xe8f6fa,
  glowColor: 0x5ee0f0,
  /** Hauteur visible paroi quai → eau. */
  basinWallHeight: 1.35,
  quayZ: 4.8,
  exclusionMinZ: 5,
  softEdgeMeters: 6,
} as const;

/**
 * Vieux-Port : exclusion M4T3R via `isHarborWaterAt()` (vieux-port-layout.util).
 */
export const MARSEILLE_GROUND_EXCLUSION_ZONES: GroundExclusionZone[] = [];

export const TRAIL_CONFIG = {
  width: 0.8,
  sampleDistance: 0.05,
  maxCellsPerUpdate: 5000,
  fadeDurationMs: 350,
  respawnDelayMs: 30_000,
  /** Masquage définitif des clusters collectés (pas de réapparition visuelle). */
  permanentHide: true,
  maxStepMeters: 3.6,
  maxSpeedMetersPerSecond: 32,
  /** Limite anti-spam par pièce visuelle (1,25 m), pas par cluster 14 cm. */
  maxVisualPickupsPerSecond: 32,
} as const;

/** Glow résiduel au sol après une collecte M4T3R (2–3 s). */
export const COLLECT_TRAIL_VISUAL_CONFIG = {
  lifetimeMs: 2_500,
  fadeStartMs: 1_400,
  maxVisibleQuads: 384,
  /** Taille d'un quad glow (aligné sur la largeur de traînée logique). */
  quadWidth: TRAIL_CONFIG.width * 0.55,
  quadLength: TRAIL_CONFIG.width * 0.42,
  segmentSampleSpacing: 0.32,
  groundOffset: 0.008,
  opacity: 0.5,
} as const;

export const FOOTPRINT_CONFIG = {
  minStepDistance: 0.55,
  minStepIntervalMs: 220,
  lifetimeMs: 12_000,
  fadeStartMs: 8_500,
  maxVisibleFootprints: 300,
  groundOffset: 0.006,
  opacity: 0.42,
  /** Empreinte calibrée sur TRAIL_CONFIG.width (0.8 m). */
  footprintSizeX: TRAIL_CONFIG.width * 0.42,
  footprintSizeZ: TRAIL_CONFIG.width * 0.25,
  lateralOffset: TRAIL_CONFIG.width * 0.22,
} as const;

export const MOVE_JOYSTICK_CONFIG = {
  walkRing: 0.62,
  runMultiplier: 3,
  deadZone: 0.08,
} as const;

/** Fusion horizon 3D ↔ ciel QUEST. 1 unité = 1 m. */
export const WORLD_BACKGROUND_CONFIG = {
  horizonColor: 0x111a38,
  zenithColor: 0x02040f,
  fogColor: 0x141932,
  fogNear: 16,
  fogFar: 152,
  horizonBlendStart: 0.38,
  horizonBlendEnd: 0.96,
  contrastFadeDistance: 120,
} as const;

export const ORBIT_CONFIG = {
  enableDamping: true,
  dampingFactor: 0.08,
  enablePan: false,
  enableZoom: true,
  enableRotate: true,
  minDistance: 5.2,
  maxDistance: 11,
  /** Plongée haute (stick VIEW bas). */
  minPolarAngle: 0.48,
  /**
   * Contre-plongée (stick VIEW haut) : un peu au-delà de l’horizon (π/2)
   * pour viser quasi vers le ciel depuis bas, sans passer sous le sol.
   */
  maxPolarAngle: 1.78,
  zoomSpeed: 0.8,
  rotateSpeed: 0.55,
  /** Centre du perso (~2.8 m) pour cadrer le corps entier dans le peek. */
  targetHeight: 1.4,
} as const;

export type QuestParticleMode = 'quest-field' | 'metaverse-starry-sky';
export const QUEST_PARTICLE_MODE: QuestParticleMode = 'metaverse-starry-sky';

/** Knowledge graph visualization layered on Star Conquest particles. */
export type QuestVisualizationMode =
  | 'legacy-particles'
  | 'knowledge-graph'
  | 'hybrid';

export const DEFAULT_QUEST_VISUALIZATION_MODE: QuestVisualizationMode = 'hybrid';

export type QuestGraphQuality = 'ultra-low' | 'low' | 'medium' | 'high';

export const DEFAULT_QUEST_GRAPH_QUALITY: QuestGraphQuality = 'ultra-low';

export function mapQualityToQuestGraphQuality(_mapQuality: MapQuality): QuestGraphQuality {
  return 'ultra-low';
}

export const M4T3R_VERTICAL_OFFSET = 0.08;

/**
 * Configuration centralisée du rendu M4T3R.
 * heightMultiplier appliqué à l'axe Y du token (1.5 = +50 %).
 */
/** LOD visuel M4T3R — distance monde (m), pas direction caméra. */
export const M4T3R_LOD_CONFIG = {
  nearMaxDistance: 12,
  midMaxDistance: 32,
  farMaxDistance: 64,
  /** Stride grille gx/gz (cellSize 1.25 m) — sous-ensembles du damier période 4. */
  midGridStride: 8,
  farGridStride: 16,
  midBobScale: 0.35,
  midRotationScale: 0.55,
} as const;

export const M4T3R_RENDER_CONFIG = {
  heightMultiplier: 1.5,
  verticalOffset: 0.1,
  rotationSpeedRadiansPerSecond: 1.25,
  bobAmplitude: 0.015,
  bobFrequency: 1.4,
  /**
   * Phase 35a — near = chaque frame render ; mid = throttle CPU.
   * `animationUpdateHzNear` informatif (60 = rAF cible).
   */
  animationUpdateHzNear: 60,
  animationUpdateHzLow: 24,
  animationUpdateHzMedium: 30,
  animationUpdateHzHigh: 60,
  /** Phase variation per token to desync animations. */
  phaseSpread: 6.283,
} as const;

/**
 * Tapis R4V3 au sol : grille monde fixe (1 unité = 1 m).
 * Le streaming ne fait qu’afficher/masquer des cellules déjà ancrées.
 */
export const R4V3_GROUND_FIELD = {
  cellSize: 1.25,
  visibleRadius: 64,
  maxVisibleInstances: 8192,
  tokenRadius: 0.28,
  tokenThickness: 0.045,
  groundY: SIDEWALK_SURFACE_Y + R4V3_ABOVE_SIDEWALK_OFFSET,
} as const;

/**
 * Caméra 3e personne rapprochée (personnage ~4.2 m).
 * 1 unité = 1 mètre. Ne pas s’appliquer au runner (camDistance 10).
 */
export const THIRD_PERSON_CAMERA_CONFIG = {
  distance: 6.2,
  height: 2.35,
  lookAtHeight: 2.1,
  shoulderOffset: 0.28,
  positionSmoothing: 0.14,
  minDistance: 5.2,
  maxDistance: 11,
  /** Aligné sur ORBIT_CONFIG.maxPolarAngle (π/2 − 1.78) — contre-plongée. */
  minPitch: -0.28,
  maxPitch: 0.42,
  collisionPadding: 0.3,
  wheelZoomSpeed: 0.0028,
  fov: 48,
} as const;

/**
 * Échelle et streaming. 1 unité monde = 1 mètre (worldScale existant).
 * Distances de génération estimées pour rester fluide sur desktop/mobile.
 */
export const WORLD_SCALE = {
  metersPerWorldUnit: 1,
  worldUnitsPerMeter: 1,
  chunkSizeMeters: 128,
  viewDistanceMeters: 800,
  generationDistanceMeters: 512,
  maxLoadedChunks: 24,
  tokenCellSizeMeters: 1.25,
  tokenVisibleRadiusMeters: 64,
  tokenMaxVisibleInstances: 8192,
} as const;

export type MarseilleDistrictId =
  | 'vieux-port'
  | 'canebiere'
  | 'cours-julien'
  | 'la-plaine'
  | 'notre-dame'
  | 'le-panier'
  | 'joliette';

/** Centres de quartiers. Coordonnées geo approximatives, marquées estimated. */
export const MARSEILLE_DISTRICTS: Record<
  MarseilleDistrictId,
  GeoPosition & { estimated: boolean; palette: number }
> = {
  'vieux-port': {
    latitude: 43.2965,
    longitude: 5.3698,
    altitude: 0,
    estimated: false,
    palette: 0x40e0ff,
  },
  canebiere: {
    latitude: 43.2979,
    longitude: 5.3804,
    altitude: 12,
    estimated: true,
    palette: 0xffe600,
  },
  'cours-julien': {
    latitude: 43.3096,
    longitude: 5.3872,
    altitude: 28,
    estimated: true,
    palette: 0xff3ecf,
  },
  'la-plaine': {
    latitude: 43.2931,
    longitude: 5.3859,
    altitude: 18,
    estimated: true,
    palette: 0x7a5cff,
  },
  'notre-dame': {
    latitude: 43.2841,
    longitude: 5.3712,
    altitude: 148,
    estimated: true,
    palette: 0xf4f0e6,
  },
  'le-panier': {
    latitude: 43.2988,
    longitude: 5.3672,
    altitude: 22,
    estimated: true,
    palette: 0xc4785a,
  },
  joliette: {
    latitude: 43.3018,
    longitude: 5.367,
    altitude: 8,
    estimated: true,
    palette: 0x6a8ea8,
  },
};

/**
 * Configuration globale de la carte Marseille.
 * Toutes les coordonnées géographiques sont centralisées ici.
 */
export interface MapConfiguration {
  enabled: boolean;
  provider: MapProviderId;
  latitudeOrigin: number;
  longitudeOrigin: number;
  altitudeOrigin: number;
  worldScale: number;
  tileRadius: number;
  maxVisibleTiles: number;
  enableBuildings: boolean;
  enableTerrain: boolean;
  enableDebug: boolean;
  quality: MapQuality;
  bounds: MapBounds;
  startPosition: GeoPosition;
  startOrientation: MapStartOrientation;
}

/** Bounding box configurable autour de Marseille. */
export const MARSEILLE_BOUNDS: MapBounds = {
  south: 43.2,
  north: 43.4,
  west: 5.2,
  east: 5.55,
};

/**
 * Position initiale du personnage — géo de l'Ombrière (origine scène).
 * Le spawn gameplay ajoute METRO_SPAWN_ANCHOR.spawnOffsetFromMirror en world space.
 */
export const MARSEILLE_START_POSITION: GeoPosition = {
  latitude: 43.2945995,
  longitude: 5.3741227,
  altitude: 20,
};

/**
 * Départ gameplay Marseille :
 * - personnage face à la Canebière (−Z) : rotationY = π (atan2 mouvement)
 * - dos à la mer (+Z), caméra derrière l’épaule depuis le port
 */
export const MARSEILLE_START_ORIENTATION: MapStartOrientation = {
  characterRotationY: Math.PI,
  cameraYaw: 0,
  cameraPitch: 0.12,
  cameraDistance: 6.2,
  cameraLookAhead: 0.35,
};

/** Budgets rendu par tier — Phase 14 : parité visuelle, perf via `mapPerfProfile()`. */
export const MAP_QUALITY_TIERS = {
  'ultra-low': {
    osmStreetCap: 600,
    osmBuildingCap: 2800,
    harborSubdivisions: 10,
    foamPlanes: true,
    quayProps: true,
    synthwavePanels: 72,
    buildingLodEnforce: true,
    fxaa: true,
    bloom: true,
    spawnShadows: false,
    cyberpunkOverlay: true,
    ssao: false,
    streetLamps: true,
    windowEmissiveScale: 0.5,
    harborHaze: true,
    waterEnvReflection: true,
    waterPlanarReflection: true,
    wetPavement: true,
    heroLandmarks: true,
    urbanPropsScope: 'full',
    skyDome: true,
    volumetricFog: true,
    taa: false,
    validationDof: false,
  },
  low: {
    osmStreetCap: 600,
    osmBuildingCap: 2800,
    harborSubdivisions: 18,
    foamPlanes: true,
    quayProps: true,
    synthwavePanels: 72,
    buildingLodEnforce: true,
    fxaa: true,
    bloom: true,
    spawnShadows: false,
    cyberpunkOverlay: true,
    ssao: false,
    streetLamps: true,
    windowEmissiveScale: 0.5,
    harborHaze: true,
    waterEnvReflection: true,
    waterPlanarReflection: true,
    wetPavement: true,
    heroLandmarks: true,
    urbanPropsScope: 'full',
    skyDome: true,
    volumetricFog: true,
    taa: false,
    validationDof: false,
  },
  medium: {
    osmStreetCap: 600,
    osmBuildingCap: 2800,
    harborSubdivisions: 32,
    foamPlanes: true,
    quayProps: true,
    synthwavePanels: 72,
    buildingLodEnforce: true,
    fxaa: true,
    bloom: true,
    spawnShadows: true,
    cyberpunkOverlay: true,
    ssao: false,
    streetLamps: true,
    windowEmissiveScale: 0.42,
    harborHaze: true,
    waterEnvReflection: true,
    waterPlanarReflection: true,
    wetPavement: true,
    heroLandmarks: true,
    urbanPropsScope: 'full',
    skyDome: true,
    volumetricFog: true,
    taa: false,
    validationDof: false,
  },
  high: {
    osmStreetCap: 600,
    osmBuildingCap: 2800,
    harborSubdivisions: 36,
    foamPlanes: true,
    quayProps: true,
    synthwavePanels: 72,
    buildingLodEnforce: true,
    fxaa: true,
    bloom: true,
    spawnShadows: true,
    cyberpunkOverlay: true,
    ssao: true,
    streetLamps: true,
    windowEmissiveScale: 0.5,
    harborHaze: true,
    waterEnvReflection: true,
    waterPlanarReflection: true,
    wetPavement: true,
    heroLandmarks: true,
    urbanPropsScope: 'full',
    skyDome: true,
    volumetricFog: true,
    taa: true,
    validationDof: true,
  },
} as const;

export function mapQualityTier(quality: MapQuality): (typeof MAP_QUALITY_TIERS)[MapQuality] {
  return MAP_QUALITY_TIERS[quality];
}

/** Valeurs par défaut — provider Marseille avec fallback legacy si échec. */
export const DEFAULT_MAP_CONFIGURATION: MapConfiguration = {
  enabled: true,
  provider: 'marseille-osm-three',
  latitudeOrigin: MARSEILLE_START_POSITION.latitude,
  longitudeOrigin: MARSEILLE_START_POSITION.longitude,
  altitudeOrigin: 0,
  worldScale: 1,
  tileRadius: 2,
  maxVisibleTiles: 25,
  enableBuildings: true,
  enableTerrain: true,
  enableDebug: false,
  quality: 'ultra-low',
  bounds: MARSEILLE_BOUNDS,
  startPosition: MARSEILLE_START_POSITION,
  startOrientation: MARSEILLE_START_ORIENTATION,
};
