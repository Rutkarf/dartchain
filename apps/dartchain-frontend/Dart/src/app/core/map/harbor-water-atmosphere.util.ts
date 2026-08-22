import * as THREE from 'three';

import { activeAtmospherePreset } from './marseille-atmosphere.config';
import { MARSEILLE_HARBOR_WATER } from './map-configuration';
import type { MapQuality } from './map-configuration';
import { mapPerfProfile } from './marseille-perf.config';
import type { HarborWaterShaderMaterial } from './harbor-water.shader';

export interface HarborWaterColorSet {
  shallow: THREE.Color;
  deep: THREE.Color;
  foam: THREE.Color;
  horizon: THREE.Color;
}

/** Phase 9 — teintes eau alignées fog atmosphere (évite le décalage navy/cyan). */
export function resolveHarborWaterColorsFromAtmosphere(): HarborWaterColorSet {
  const preset = activeAtmospherePreset();
  const fog = new THREE.Color(preset.fogColor);

  const shallow = new THREE.Color(MARSEILLE_HARBOR_WATER.shallowColor);
  shallow.lerp(fog, 0.1);
  shallow.lerp(new THREE.Color(0x7adce8), 0.72);

  const deep = new THREE.Color(MARSEILLE_HARBOR_WATER.deepColor);
  deep.lerp(fog, 0.32);

  const foam = new THREE.Color(MARSEILLE_HARBOR_WATER.foamColor);
  foam.lerp(fog, 0.08);

  const horizon = fog.clone().lerp(new THREE.Color(0xa8e8ff), 0.35);

  return { shallow, deep, foam, horizon };
}

export function harborWaterReflectionMix(quality: MapQuality): number {
  const base = quality === 'high' ? 0.52 : 0.42;
  return base * mapPerfProfile(quality).waterEnvMixScale;
}

export function harborWaterShoreDistortion(quality: MapQuality): number {
  const profile = mapPerfProfile(quality);
  if (profile.harborSubdivisions <= 12) return 0.55;
  if (profile.pbrDetail === 'full') return 0.95;
  return 0.72;
}

export function applyHarborWaterAtmosphereColors(material: HarborWaterShaderMaterial): void {
  const colors = resolveHarborWaterColorsFromAtmosphere();
  material.uniforms.uShallowColor.value.copy(colors.shallow);
  material.uniforms.uDeepColor.value.copy(colors.deep);
  material.uniforms.uFoamColor.value.copy(colors.foam);
  material.uniforms.uHorizonTint.value.copy(colors.horizon);
}

export function bindHarborWaterEnvironmentMap(
  material: HarborWaterShaderMaterial,
  envMap: THREE.Texture | null,
  quality: MapQuality
): void {
  const mix = harborWaterReflectionMix(quality);
  material.uniforms.uReflectionMix.value = mix;

  if (!envMap || mix <= 0) {
    material.envMap = null;
    return;
  }

  material.envMap = envMap;
  material.envMapIntensity = quality === 'high' ? 1.05 : 0.82;
  material.envMapIntensity *= mapPerfProfile(quality).waterEnvMixScale;
  material.defines = { ...(material.defines ?? {}), USE_ENVMAP: '', ENVMAP_TYPE_CUBE_UV: '' };
  material.needsUpdate = true;
}
