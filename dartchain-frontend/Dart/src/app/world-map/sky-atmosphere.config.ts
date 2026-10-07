import * as THREE from 'three';

import { activeAtmospherePreset } from './metaverse-atmosphere.config';

export interface SkyAtmosphereColors {
  zenith: THREE.Color;
  horizon: THREE.Color;
  glow: THREE.Color;
  starIntensity: number;
}

/** Phase 12 — teintes ciel alignées PMREM / fog. */
export function resolveSkyAtmosphereColors(): SkyAtmosphereColors {
  const preset = activeAtmospherePreset();
  const fog = new THREE.Color(preset.fogColor);

  const zenith = fog.clone().lerp(new THREE.Color(0x0d0630), 0.55);
  zenith.lerp(new THREE.Color(0x0d0630), 0.35);

  const horizon = fog.clone().lerp(new THREE.Color(0x18314f), 0.42);
  const glow = new THREE.Color(0x8a95a5).lerp(fog, 0.62);

  const starIntensity =
    'starIntensity' in preset && typeof preset.starIntensity === 'number'
      ? preset.starIntensity
      : preset.nightShift
        ? 0.82
        : 0.35;

  return { zenith, horizon, glow, starIntensity };
}

/** FogExp2 — densité dérivée du fogFar gameplay. */
export function atmosphereFogExpDensity(fogFar: number): number {
  return THREE.MathUtils.clamp(2.1 / Math.max(fogFar, 120), 0.0018, 0.0085);
}
