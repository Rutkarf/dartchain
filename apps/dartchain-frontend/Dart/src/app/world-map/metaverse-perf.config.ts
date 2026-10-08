import type { MapQuality } from './map-configuration';
import type { PbrDetailLevel } from './material-library/material-library.config';

/**
 * Phase 14 — parité visuelle : mêmes éléments partout, coût GPU scalé par tier.
 * Phase 23 — osmBuildingCap / osmStreetCap identiques à `high` sur tous les tiers.
 * Les flags « visuels » du tier restent true ; ce profil pilote géométrie, LOD, post-FX.
 */
export interface MapPerfProfile {
  pixelRatioCap: number;
  osmStreetCap: number;
  osmBuildingCap: number;
  harborSubdivisions: number;
  waterPlanarTexSize: number;
  waterEnvMixScale: number;
  skyDomeSegments: number;
  streamingHazePanels: number;
  useDepthHazePlanes: boolean;
  buildingLodEnforce: boolean;
  lodFullMaxM: number;
  lodMassingMaxM: number;
  lodImpostorMaxM: number;
  /** Phase 22 — taille cellule grille LOD spatial (m). */
  lodSpatialCellSizeM: number;
  buildingLodTickSeconds: number;
  bloomStrengthScale: number;
  useTaa: boolean;
  useSsao: boolean;
  useFxaa: boolean;
  spawnShadows: boolean;
  spotLightShadows: boolean;
  pbrDetail: PbrDetailLevel;
  synthwavePanelCap: number;
  wetPavementTickSkip: number;
  targetDrawCallsBudget: number;
  targetTriangleBudget: number;
  /** Reflector miroir Ombrière — résolution texture (visuel conservé, scale perf). */
  canopyReflectorTexSize: number;
  /** Directional light spawn — mapSize ombre. */
  shadowMapSize: number;
  /** Insertion OSM par paquets pour ne pas figer le main thread. */
  osmMeshBatchSize: number;
  osmMeshBatchDelayMs: number;
  /** Phase 20 — paquets OSM via requestIdleCallback (fallback timer). */
  osmMeshBatchUseIdle: boolean;
  /** SpotLights lampadaires actifs dans le shader (pool — parité visuelle mesh). */
  streetLampSpotCap: number;
  /** TAA sampleLevel (1 = moins de VRAM qu’à 2). */
  taaSampleLevel: number;
  /** Phase 15 — CPU simulation (0 = chaque frame). */
  mapSimTickSkip: number;
  mapSimIdleTickSkip: number;
  atmosphereTickSkip: number;
  networkTickSkip: number;
  foamTickSkip: number;
  waterAnimTickSkip: number;
  streamCheckIntervalMs: number;
  lodCameraMoveThresholdM: number;
}

export const MAP_PERF_PROFILES: Record<MapQuality, MapPerfProfile> = {
  'ultra-low': {
    pixelRatioCap: 1,
  /** Phase 23 — parité contenu : identique à `high` (perf via batch/LOD, pas via cap). */
  osmStreetCap: 600,
  osmBuildingCap: 2800,
    harborSubdivisions: 10,
    waterPlanarTexSize: 128,
    waterEnvMixScale: 0.72,
    skyDomeSegments: 12,
    streamingHazePanels: 4,
    useDepthHazePlanes: true,
    buildingLodEnforce: true,
    lodFullMaxM: 42,
    lodMassingMaxM: 120,
    lodImpostorMaxM: 320,
    lodSpatialCellSizeM: 40,
    buildingLodTickSeconds: 0.42,
    bloomStrengthScale: 0.26,
    useTaa: false,
    useSsao: false,
    useFxaa: true,
    spawnShadows: false,
    spotLightShadows: false,
    pbrDetail: 'albedo',
    synthwavePanelCap: 72,
    wetPavementTickSkip: 2,
    targetDrawCallsBudget: 180,
    targetTriangleBudget: 280_000,
    canopyReflectorTexSize: 192,
    shadowMapSize: 256,
    osmMeshBatchSize: 96,
    osmMeshBatchDelayMs: 0,
    osmMeshBatchUseIdle: true,
    streetLampSpotCap: 6,
    taaSampleLevel: 0,
    mapSimTickSkip: 1,
    mapSimIdleTickSkip: 4,
    atmosphereTickSkip: 3,
    networkTickSkip: 3,
    foamTickSkip: 3,
    waterAnimTickSkip: 2,
    streamCheckIntervalMs: 15_000,
    lodCameraMoveThresholdM: 3,
  },
  low: {
    pixelRatioCap: 1,
  /** Phase 23 — parité contenu. */
  osmStreetCap: 600,
  osmBuildingCap: 2800,
    harborSubdivisions: 18,
    waterPlanarTexSize: 192,
    waterEnvMixScale: 0.82,
    skyDomeSegments: 18,
    streamingHazePanels: 6,
    useDepthHazePlanes: true,
    buildingLodEnforce: true,
    lodFullMaxM: 54,
    lodMassingMaxM: 160,
    lodImpostorMaxM: 380,
    lodSpatialCellSizeM: 48,
    buildingLodTickSeconds: 0.28,
    bloomStrengthScale: 0.34,
    useTaa: false,
    useSsao: false,
    useFxaa: true,
    spawnShadows: false,
    spotLightShadows: false,
    pbrDetail: 'albedo',
    synthwavePanelCap: 72,
    wetPavementTickSkip: 1,
    targetDrawCallsBudget: 260,
    targetTriangleBudget: 420_000,
    canopyReflectorTexSize: 320,
    shadowMapSize: 384,
    osmMeshBatchSize: 80,
    osmMeshBatchDelayMs: 4,
    osmMeshBatchUseIdle: true,
    streetLampSpotCap: 8,
    taaSampleLevel: 0,
    mapSimTickSkip: 0,
    mapSimIdleTickSkip: 2,
    atmosphereTickSkip: 1,
    networkTickSkip: 1,
    foamTickSkip: 1,
    waterAnimTickSkip: 0,
    streamCheckIntervalMs: 10_000,
    lodCameraMoveThresholdM: 1.8,
  },
  medium: {
    pixelRatioCap: 1,
  /** Phase 23 — parité contenu. */
  osmStreetCap: 600,
  osmBuildingCap: 2800,
    harborSubdivisions: 28,
    waterPlanarTexSize: 256,
    waterEnvMixScale: 0.92,
    skyDomeSegments: 24,
    streamingHazePanels: 8,
    useDepthHazePlanes: true,
    buildingLodEnforce: true,
    lodFullMaxM: 64,
    lodMassingMaxM: 200,
    lodImpostorMaxM: 440,
    lodSpatialCellSizeM: 56,
    buildingLodTickSeconds: 0.22,
    bloomStrengthScale: 0.58,
    useTaa: false,
    useSsao: false,
    useFxaa: true,
    spawnShadows: false,
    spotLightShadows: false,
    pbrDetail: 'albedo',
    synthwavePanelCap: 72,
    wetPavementTickSkip: 0,
    targetDrawCallsBudget: 420,
    targetTriangleBudget: 720_000,
    canopyReflectorTexSize: 384,
    shadowMapSize: 512,
    osmMeshBatchSize: 72,
    osmMeshBatchDelayMs: 6,
    osmMeshBatchUseIdle: true,
    streetLampSpotCap: 10,
    taaSampleLevel: 0,
    mapSimTickSkip: 0,
    mapSimIdleTickSkip: 1,
    atmosphereTickSkip: 1,
    networkTickSkip: 1,
    foamTickSkip: 0,
    waterAnimTickSkip: 0,
    streamCheckIntervalMs: 8000,
    lodCameraMoveThresholdM: 1.2,
  },
  high: {
    pixelRatioCap: 1.25,
    osmStreetCap: 600,
    osmBuildingCap: 2800,
    harborSubdivisions: 36,
    waterPlanarTexSize: 384,
    waterEnvMixScale: 1,
    skyDomeSegments: 32,
    streamingHazePanels: 10,
    useDepthHazePlanes: true,
    buildingLodEnforce: true,
    lodFullMaxM: 72,
    lodMassingMaxM: 200,
    lodImpostorMaxM: 460,
    lodSpatialCellSizeM: 64,
    buildingLodTickSeconds: 0.26,
    bloomStrengthScale: 0.94,
    useTaa: true,
    useSsao: true,
    useFxaa: false,
    spawnShadows: true,
    spotLightShadows: false,
    pbrDetail: 'full',
    synthwavePanelCap: 72,
    wetPavementTickSkip: 0,
    targetDrawCallsBudget: 520,
    targetTriangleBudget: 980_000,
    canopyReflectorTexSize: 512,
    shadowMapSize: 512,
    osmMeshBatchSize: 48,
    osmMeshBatchDelayMs: 12,
    osmMeshBatchUseIdle: true,
    streetLampSpotCap: 14,
    taaSampleLevel: 1,
    mapSimTickSkip: 0,
    mapSimIdleTickSkip: 1,
    atmosphereTickSkip: 0,
    networkTickSkip: 0,
    foamTickSkip: 0,
    waterAnimTickSkip: 0,
    streamCheckIntervalMs: 8000,
    lodCameraMoveThresholdM: 0.8,
  },
};

export function mapPerfProfile(quality: MapQuality): MapPerfProfile {
  return MAP_PERF_PROFILES[quality];
}

/** Parité visuelle Phase 14 — jamais de coupure d’éléments décoratifs. */
export const MAP_VISUAL_PARITY = {
  quayProps: true,
  foamPlanes: true,
  synthwavePanels: true,
  cyberpunkOverlay: true,
  streetLamps: true,
  harborHaze: true,
  waterEnvReflection: true,
  waterPlanarReflection: true,
  wetPavement: true,
  heroLandmarks: true,
  urbanPropsFull: true,
  skyDome: true,
  volumetricFog: true,
  windowEmissive: true,
  postFx: true,
} as const;
