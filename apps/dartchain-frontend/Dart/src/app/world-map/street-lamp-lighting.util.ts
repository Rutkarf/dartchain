import * as THREE from 'three';

import type { GroundCorridorDef } from './ground-layout.data';
import { NIGHT_LIGHTING_DEFAULTS } from './night-lighting.config';

export interface StreetLampSpec {
  x: number;
  y: number;
  z: number;
}

export interface StreetLampLightsResult {
  group: THREE.Group;
  lights: THREE.SpotLight[];
}

/** SpotLights discrets — pas de shadow map (budget mobile). */
export function createStreetLampSpotLights(
  lamps: StreetLampSpec[],
  options: {
    intensity?: number;
    distance?: number;
    castShadow?: boolean;
  } = {}
): StreetLampLightsResult {
  const group = new THREE.Group();
  group.name = 'marseille-street-lamp-lights';
  const lights: THREE.SpotLight[] = [];
  const D = NIGHT_LIGHTING_DEFAULTS;

  for (let i = 0; i < lamps.length; i++) {
    const lamp = lamps[i];
    const spot = new THREE.SpotLight(
      D.spotColor,
      options.intensity ?? D.spotIntensity,
      options.distance ?? D.spotDistance,
      D.spotAngle,
      D.spotPenumbra,
      D.spotDecay
    );
    spot.name = `marseille-street-lamp-spot-${i}`;
    spot.position.set(lamp.x, lamp.y, lamp.z);
    if (options.castShadow) {
      spot.castShadow = true;
      spot.shadow.mapSize.set(256, 256);
    }

    const target = new THREE.Object3D();
    target.name = `marseille-street-lamp-target-${i}`;
    target.position.set(lamp.x + 0.4, lamp.y - 2.8, lamp.z - 1.6);
    spot.target = target;

    group.add(spot);
    group.add(target);
    lights.push(spot);
  }

  return { group, lights };
}

/** Lampadaires le long des trottoirs d'un corridor (spawn + Canebière). */
export function corridorStreetLampSpecs(
  corridor: GroundCorridorDef,
  lampHeadY: number,
  options: {
    spacing?: number;
    maxRadiusFromOrigin?: number;
    sides?: 'both' | 'east' | 'west';
  } = {}
): StreetLampSpec[] {
  const spacing = options.spacing ?? NIGHT_LIGHTING_DEFAULTS.lampSpacingM;
  const maxR = options.maxRadiusFromOrigin ?? NIGHT_LIGHTING_DEFAULTS.spawnLampRadiusM;
  const sides = options.sides ?? 'both';
  const specs: StreetLampSpec[] = [];

  const halfLen = corridor.length * 0.5 - 6;
  const lateral = corridor.roadWidth * 0.5 + corridor.sidewalkWidth * 0.42;
  const cos = Math.cos(corridor.rotationY);
  const sin = Math.sin(corridor.rotationY);

  for (let along = -halfLen; along <= halfLen; along += spacing) {
    const sideList: number[] =
      sides === 'both' ? [-1, 1] : sides === 'east' ? [1] : [-1];

    for (const side of sideList) {
      const localX = side * lateral;
      const localZ = along;
      const x = corridor.centerX + localX * cos + localZ * sin;
      const z = corridor.centerZ + -localX * sin + localZ * cos;
      if (Math.hypot(x, z) > maxR) continue;
      specs.push({ x, y: lampHeadY, z });
    }
  }

  return specs;
}

export function disposeStreetLampLights(result: StreetLampLightsResult): void {
  for (const light of result.lights) {
    light.dispose?.();
  }
  result.group.clear();
}
