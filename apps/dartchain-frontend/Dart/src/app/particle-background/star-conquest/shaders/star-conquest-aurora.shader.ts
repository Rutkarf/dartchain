import * as THREE from 'three';

export const STAR_CONQUEST_AURORA_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const STAR_CONQUEST_AURORA_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uIntensity;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.07;
    a *= 0.52;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(1.7, 1.0);
  float n = fbm(p * 2.6 + vec2(uTime * 0.035, -uTime * 0.022));
  float ridges = smoothstep(0.52, 0.78, n) * (0.45 + 0.55 * n);
  float veins = pow(max(0.0, n - 0.42), 1.6);
  float mixAmt = clamp(ridges + veins * 0.65, 0.0, 1.0);
  vec3 col = mix(uColorB, uColorA, mixAmt);
  float vignette = pow(max(0.0, 1.0 - length(uv - 0.5) * 1.42), 1.25);
  float alpha = mixAmt * vignette * uIntensity * 0.36;
  gl_FragColor = vec4(col, alpha);
}
`;

export function createStarConquestAuroraMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(0.32, 0.9, 0.93) },
      uColorB: { value: new THREE.Color(0.65, 0.35, 0.98) },
      uIntensity: { value: 0.58 },
    },
    vertexShader: STAR_CONQUEST_AURORA_VERTEX,
    fragmentShader: STAR_CONQUEST_AURORA_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
