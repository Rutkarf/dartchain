import * as THREE from 'three';

import { FLOOR_HORIZON_BLEND } from '@metaverse/floor-horizon-blend.config';
import type { MapQuality } from './map-configuration';
import { mapQualityTier } from './map-configuration';
import { mapPerfProfile } from './metaverse-perf.config';

export const METAVERSE_ATMOSPHERE_PRESETS = {
  currentGameplay: {
    id: 'current-gameplay',
    fogEnabled: false,
    fogColor: FLOOR_HORIZON_BLEND.fog.color,
    fogNear: FLOOR_HORIZON_BLEND.fog.near,
    fogFar: FLOOR_HORIZON_BLEND.fog.far,
    toneMappingExposure: 1.02,
    environmentIntensity: 0.58,
    nightShift: false,
  },
  nightHarbor: {
    id: 'night-harbor',
    fogEnabled: true,
    fogColor: 0x0d0630,
    fogNear: 80,
    fogFar: 380,
    toneMappingExposure: 1.08,
    environmentIntensity: 0.65,
    nightShift: true,
    starIntensity: 0.85,
  },
  /** Preset actif — profondeur portuaire sans masquer le spawn. */
  nightHarborGameplay: {
    id: 'night-harbor-gameplay',
    fogEnabled: true,
    fogColor: 0x0d0630,
    fogNear: 132,
    fogFar: 580,
    toneMappingExposure: 1.06,
    environmentIntensity: 0.68,
    nightShift: true,
    starIntensity: 0.82,
  },
  /** Phase 8 — contraste renforcé (validation / cinematic). */
  nightHarborCinematic: {
    id: 'night-harbor-cinematic',
    fogEnabled: true,
    fogColor: 0x0d0630,
    fogNear: 118,
    fogFar: 520,
    toneMappingExposure: 1.1,
    environmentIntensity: 0.72,
    nightShift: true,
    starIntensity: 0.92,
  },
  /** Phase 12 — crépuscule portuaire (masque CSS + ciel). */
  twilightHarbor: {
    id: 'twilight-harbor',
    fogEnabled: true,
    fogColor: 0x18314f,
    fogNear: 160,
    fogFar: 680,
    toneMappingExposure: 1.02,
    environmentIntensity: 0.62,
    nightShift: false,
    starIntensity: 0.18,
  },
  /**
   * Profil arène MetaVerseBB — night-tech ciné (verre / neon).
   * Activé uniquement si metaverseArenaEnabled.
   */
  nightTechArena: {
    id: 'night-tech-arena',
    fogEnabled: true,
    fogColor: 0x0d0630,
    fogNear: 100,
    fogFar: 480,
    toneMappingExposure: 1.06,
    environmentIntensity: 0.68,
    nightShift: true,
    starIntensity: 0.75,
  },
} as const;

export type MetaverseAtmospherePresetId = keyof typeof METAVERSE_ATMOSPHERE_PRESETS;

export const ACTIVE_ATMOSPHERE_PRESET_ID: MetaverseAtmospherePresetId = 'nightHarborGameplay';

export function activeAtmospherePreset(arenaProfileActive = false) {
  if (arenaProfileActive) {
    return METAVERSE_ATMOSPHERE_PRESETS.nightTechArena;
  }
  return METAVERSE_ATMOSPHERE_PRESETS[ACTIVE_ATMOSPHERE_PRESET_ID];
}

/** Lumières unifiées — ex-floor + accents port (intensités calibrées une seule fois). */
export const METAVERSE_ATMOSPHERE_LIGHTS = {
  ambient: { color: 0xede7d9, intensity: 0.2 },
  hemi: { sky: 0x0d0630, ground: 0x0d0630, intensity: 0.2 },
  key: { color: 0xede7d9, intensity: 0.58, position: new THREE.Vector3(8, 18, 10) },
  fill: { color: 0x8a95a5, intensity: 0.14, position: new THREE.Vector3(-6, 6, -4) },
  rim: { color: 0x7b0d1e, intensity: 0.11, position: new THREE.Vector3(-10, 8, -12) },
  spawnBounce: { color: 0xede7d9, intensity: 0.34, position: new THREE.Vector3(0, 2.2, 4) },
  harborCyan: { color: 0x8a95a5, intensity: 0.54, position: new THREE.Vector3(-22, 9, 22) },
  harborMagenta: { color: 0x7b0d1e, intensity: 0.42, position: new THREE.Vector3(24, 8, 12) },
  depthBlue: { color: 0x8a95a5, intensity: 0.24, position: new THREE.Vector3(0, 16, -150) },
} as const;

export const METAVERSE_BLOOM_PROFILE = {
  'ultra-low': { strength: 0, radius: 0.28, threshold: 0.96 },
  low: { strength: 0, radius: 0.32, threshold: 0.92 },
  medium: { strength: 0.36, radius: 0.4, threshold: 0.84 },
  high: { strength: 0.48, radius: 0.46, threshold: 0.8 },
} as const;

export function atmosphereShadowMapSize(quality: MapQuality): number {
  return mapPerfProfile(quality).shadowMapSize;
}

function bloomProfileFor(quality: MapQuality) {
  return METAVERSE_BLOOM_PROFILE[quality];
}

export function atmosphereBloomStrength(quality: MapQuality): number {
  return bloomProfileFor(quality).strength;
}

export function atmosphereBloomRadius(quality: MapQuality): number {
  return bloomProfileFor(quality).radius;
}

export function atmosphereBloomThreshold(quality: MapQuality): number {
  return bloomProfileFor(quality).threshold;
}

export function atmosphereUsesPostFx(quality: MapQuality): boolean {
  return mapQualityTier(quality).fxaa || mapQualityTier(quality).bloom;
}
