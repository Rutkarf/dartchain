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

float wave(vec2 uv, float speed, float freq, float amp) {
  return sin(uv.x * freq + uTime * speed) * amp
       + cos(uv.y * freq * 0.7 + uTime * speed * 0.8) * amp * 0.6;
}

void main() {
  vec2 uv = vUv;
  float w1 = wave(uv, 0.35, 3.2, 0.12);
  float w2 = wave(uv + vec2(0.3, 0.1), 0.22, 5.5, 0.08);
  float w3 = wave(uv * 1.5 - vec2(0.1, 0.4), 0.18, 2.8, 0.1);
  float blend = clamp(w1 + w2 + w3 + 0.35, 0.0, 1.0);

  vec3 col = mix(uColorB, uColorA, blend);
  float vignette = 1.0 - length(uv - 0.5) * 0.85;
  float alpha = blend * vignette * uIntensity * 0.38;
  gl_FragColor = vec4(col, alpha);
}
`;

export function createStarConquestAuroraMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(0.32, 0.9, 0.93) },
      uColorB: { value: new THREE.Color(0.65, 0.35, 0.98) },
      uIntensity: { value: 1 },
    },
    vertexShader: STAR_CONQUEST_AURORA_VERTEX,
    fragmentShader: STAR_CONQUEST_AURORA_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
