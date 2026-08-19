import * as THREE from 'three';

import { WIGLE_GEO_CONFIG } from '../wigle-visual.config';

/** Shader unifié pour ondes ripple / pulse — animation GPU via uniform time. */
export const WIGLE_WAVE_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uEffectSeed;
  varying float vFade;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave = sin(uTime * 3.0 + length(pos.xz) * 4.0 + uEffectSeed) * 0.08 * uIntensity;
    pos.y += wave;
    float dist = length(pos.xz);
    vFade = 1.0 - smoothstep(0.2, 1.0, dist);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const WIGLE_WAVE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uEffectSeed;
  varying float vFade;
  varying vec2 vUv;

  void main() {
    float ring = sin(length(vUv - 0.5) * 30.0 - uTime * 4.0 + uEffectSeed);
    float alpha = uOpacity * vFade * (0.45 + 0.55 * max(ring, 0.0));
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function createWigleWaveMaterial(color: THREE.ColorRepresentation): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.72 },
      uIntensity: { value: 1 },
      uEffectSeed: { value: 0 },
    },
    vertexShader: WIGLE_WAVE_VERTEX_SHADER,
    fragmentShader: WIGLE_WAVE_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

export function colorForNetworkType(type: string): number {
  switch (type.toUpperCase()) {
    case 'WIFI':
      return 0x00f3ff;
    case 'CELL':
      return 0xff00ff;
    case 'BLE':
      return 0x7b2cbf;
    default:
      return 0x8f9bb3;
  }
}

export function buildingHeightFromSignal(signalStrength: number): number {
  const normalized = THREE.MathUtils.clamp((signalStrength + 90) / 50, 0, 1);
  return (
    WIGLE_GEO_CONFIG.buildingHeightMin +
    normalized * (WIGLE_GEO_CONFIG.buildingHeightMax - WIGLE_GEO_CONFIG.buildingHeightMin)
  );
}
