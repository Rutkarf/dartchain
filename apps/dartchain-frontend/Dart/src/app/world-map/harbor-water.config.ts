import * as THREE from 'three';

import { MARSEILLE_HARBOR_WATER } from './map-configuration';

/** Paramètres shader eau Phase 2 — profondeur / fresnel / houle. */
export const HARBOR_WATER_SHADER_CONFIG = {
  waveHeight: 0.045,
  waveSpeed: 1.15,
  fresnelStrength: 0.38,
  fresnelPower: 3.2,
  foamShoreThreshold: 0.18,
  foamStrength: 0.72,
  /** < 1 = gradient profondeur plus marqué près des quais. */
  depthContrast: 0.52,
  opacity: 0.96,
  subdivisions: 36,
  shoreDistortion: 0.72,
  bobAmplitude: 0.014,
  bobSpeed: 0.00055,
  shallowColor: new THREE.Color(MARSEILLE_HARBOR_WATER.shallowColor),
  deepColor: new THREE.Color(MARSEILLE_HARBOR_WATER.deepColor),
  foamColor: new THREE.Color(MARSEILLE_HARBOR_WATER.foamColor),
} as const;

import type { MapQuality } from './map-configuration';
import { mapPerfProfile } from './marseille-perf.config';

export function harborWaterSubdivisionsForQuality(quality: MapQuality): number {
  return mapPerfProfile(quality).harborSubdivisions;
}

export const HARBOR_WATER_DEEP_VISUAL = {
  basinMaxDepthSpan: 95,
  channelMaxDepthSpan: 72,
  deepBedInset: 0.06,
} as const;
