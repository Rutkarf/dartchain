import * as THREE from 'three';

export const SKY_DOME_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SKY_DOME_FRAGMENT = /* glsl */ `
uniform vec3 uZenithColor;
uniform vec3 uHorizonColor;
uniform vec3 uGlowColor;
uniform float uStarIntensity;
uniform float uTime;

varying vec3 vWorld;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

void main() {
  vec3 dir = normalize(vWorld);
  float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  float horizonBand = pow(1.0 - abs(dir.y), 3.2);

  vec3 col = mix(uHorizonColor, uZenithColor, pow(h, 0.72));
  col += uGlowColor * horizonBand * 0.22;

  vec3 starDir = dir * 820.0;
  float star = hash(floor(starDir * 0.35));
  float twinkle = 0.65 + 0.35 * sin(uTime * 1.4 + star * 40.0);
  float starMask = step(0.992, star) * smoothstep(0.08, 0.42, h);
  col += vec3(0.88, 0.92, 1.0) * starMask * twinkle * uStarIntensity;

  gl_FragColor = vec4(col, 1.0);
}
`;

export type SkyDomeMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uZenithColor: { value: THREE.Color };
    uHorizonColor: { value: THREE.Color };
    uGlowColor: { value: THREE.Color };
    uStarIntensity: { value: number };
    uTime: { value: number };
  };
};

export function createSkyDomeMaterial(): SkyDomeMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: SKY_DOME_VERTEX,
    fragmentShader: SKY_DOME_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenithColor: { value: new THREE.Color(0x0a1018) },
      uHorizonColor: { value: new THREE.Color(0x1a2840) },
      uGlowColor: { value: new THREE.Color(0x3a88cc) },
      uStarIntensity: { value: 0.8 },
      uTime: { value: 0 },
    },
  }) as SkyDomeMaterial;
}

export function tickSkyDomeMaterial(material: SkyDomeMaterial, elapsedSeconds: number): void {
  material.uniforms.uTime.value = elapsedSeconds;
}

export function applySkyDomeColors(
  material: SkyDomeMaterial,
  colors: {
    zenith: THREE.Color;
    horizon: THREE.Color;
    glow: THREE.Color;
    starIntensity: number;
  }
): void {
  material.uniforms.uZenithColor.value.copy(colors.zenith);
  material.uniforms.uHorizonColor.value.copy(colors.horizon);
  material.uniforms.uGlowColor.value.copy(colors.glow);
  material.uniforms.uStarIntensity.value = colors.starIntensity;
}
