import * as THREE from 'three';

import { NIGHT_LIGHTING_DEFAULTS } from './night-lighting.config';
import type { StreetLampSpec } from './street-lamp-lighting.util';

export interface StreetLampLightPool {
  group: THREE.Group;
  lights: THREE.SpotLight[];
  /** Repositionne le pool sur les lampadaires les plus proches du focus. */
  update: (focusX: number, focusZ: number) => void;
  dispose: () => void;
}

/**
 * Pool de SpotLights — même look local, shader WebGL borné (évite « too many uniforms »).
 * Les lampadaires mesh (emissive) restent ; seules les N lumières les plus proches sont actives.
 */
export function createStreetLampLightPool(
  specs: StreetLampSpec[],
  cap: number,
  options: {
    intensity?: number;
    distance?: number;
    castShadow?: boolean;
  } = {}
): StreetLampLightPool | null {
  if (specs.length === 0 || cap <= 0) return null;

  const group = new THREE.Group();
  group.name = 'marseille-street-lamp-lights';
  const effectiveCap = Math.min(cap, specs.length);
  const lights: THREE.SpotLight[] = [];
  const targets: THREE.Object3D[] = [];
  const D = NIGHT_LIGHTING_DEFAULTS;

  for (let i = 0; i < effectiveCap; i++) {
    const spot = new THREE.SpotLight(
      D.spotColor,
      options.intensity ?? D.spotIntensity,
      options.distance ?? D.spotDistance,
      D.spotAngle,
      D.spotPenumbra,
      D.spotDecay
    );
    spot.name = `marseille-street-lamp-spot-${i}`;
    if (options.castShadow) {
      spot.castShadow = true;
      spot.shadow.mapSize.set(256, 256);
    }

    const target = new THREE.Object3D();
    target.name = `marseille-street-lamp-target-${i}`;
    spot.target = target;

    group.add(spot);
    group.add(target);
    lights.push(spot);
    targets.push(target);
  }

  const ranked: Array<{ spec: StreetLampSpec; distSq: number }> = [];
  let lastAssignmentKey = '';

  const assignSpec = (spec: StreetLampSpec, light: THREE.SpotLight, target: THREE.Object3D): void => {
    light.position.set(spec.x, spec.y, spec.z);
    target.position.set(spec.x + 0.4, spec.y - 2.8, spec.z - 1.6);
  };

  const update = (focusX: number, focusZ: number): void => {
    ranked.length = 0;
    for (const spec of specs) {
      const dx = spec.x - focusX;
      const dz = spec.z - focusZ;
      ranked.push({ spec, distSq: dx * dx + dz * dz });
    }
    ranked.sort((a, b) => a.distSq - b.distSq);

    const key = ranked
      .slice(0, effectiveCap)
      .map((entry) => `${Math.round(entry.spec.x * 2)}_${Math.round(entry.spec.z * 2)}`)
      .join('|');
    if (key === lastAssignmentKey) return;
    lastAssignmentKey = key;

    for (let i = 0; i < effectiveCap; i++) {
      assignSpec(ranked[i]!.spec, lights[i]!, targets[i]!);
    }
  };

  update(0, 0);

  return {
    group,
    lights,
    update,
    dispose: () => {
      for (const light of lights) {
        light.dispose?.();
      }
      group.clear();
    },
  };
}
