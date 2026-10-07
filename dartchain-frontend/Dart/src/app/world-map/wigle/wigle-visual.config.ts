import type { MapQuality } from '../map-configuration';

export const WIGLE_VISUAL_CONFIG = {
  lowDensity: 0x8a95a5,
  mediumDensity: 0x7b0d1e,
  highDensity: 0x7b0d1e,
  unknown: 0x8a95a5,
  maxIndicatorHeight: 8,
  baseRadius: 0.35,
  opacity: 0.72,
  nearestBuildingThresholdMeters: 25,
  maxVisibleDistanceMeters: 120,
} as const;

export const ROCKET_CONFIG = {
  enabled: true,
  /** Multiplicateur taille fusée (silhouette horizon). */
  scale: 2.6,
  hoverAmplitude: 0.18,
  hoverFrequency: 0.55,
  flameEnabledFromQuality: 'medium' as MapQuality,
  particleCount: 12,
} as const;

export type HorizonScaleAnchorMode = 'camera-north' | 'fixed-world';

export interface HorizonScaleConfig {
  /** @deprecated Utiliser anchorMode + horizonDistanceMeters. Conservé pour debug. */
  worldPosition: { x: number; y: number; z: number };
  baseHeight: number;
  maxHeight: number;
  tickCount: number;
  visible: boolean;
  rocketEnabled: boolean;
  /** Décor d'horizon : suit la caméra vers le nord, toujours hors de portée. */
  anchorMode: HorizonScaleAnchorMode;
  /** Distance caméra → échelle (m), dans la brume mais lisible. */
  horizonDistanceMeters: number;
  /** Parallaxe latérale (0 = fixe au centre monde, 1 = suit la caméra). */
  parallaxXFactor: number;
  /** Grossissement global pour lecture à distance. */
  visualScale: number;
}

export const HORIZON_SCALE_CONFIG: HorizonScaleConfig = {
  worldPosition: { x: 0, y: 0, z: -248 },
  baseHeight: 0,
  maxHeight: 168,
  tickCount: 18,
  visible: true,
  rocketEnabled: true,
  anchorMode: 'camera-north',
  horizonDistanceMeters: 136,
  parallaxXFactor: 0.18,
  visualScale: 1.85,
};

/** Bbox OSM élargi (~1.6 km) — aligné sur MetaverseMapProvider.OSM_QUERY_BOUNDS. */
export const WIGLE_OSM_QUERY_BOUNDS = {
  south: 43.2800,
  north: 43.3095,
  west: 5.3540,
  east: 5.3940,
} as const;

/** Cycle 3 — geo-mapping & effets d'ondes. */
export const WIGLE_GEO_CONFIG = {
  loadRadiusMeters: 700,
  reloadDistanceMeters: 220,
  maxActivePoints: 180,
  maxVisiblePoints: 140,
  buildingBaseSize: 1.15,
  buildingHeightMin: 6,
  buildingHeightMax: 22,
  meshLineDistance: 120,
  meshConnectRadius: 55,
  groundOffsetY: 0.22,
  colors: {
    wifi: 0x8a95a5,
    cell: 0x8a95a5,
    ble: 0x8a95a5,
    unknown: 0x8a95a5,
  },
} as const;

export function maxActivePointsForQuality(quality: MapQuality): number {
  if (quality === 'ultra-low') return 40;
  if (quality === 'low') return 80;
  if (quality === 'medium') return 120;
  return 180;
}
