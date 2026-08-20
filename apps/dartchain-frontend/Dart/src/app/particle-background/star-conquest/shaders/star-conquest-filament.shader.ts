import * as THREE from 'three';
import { STAR_CONQUEST_SCALE } from '../star-conquest-scale';

const FILAMENT_VERTEX = /* glsl */ `
attribute vec3 other;
attribute float side;
attribute float along;
uniform vec2 uResolution;
uniform float uWidthPx;
uniform float uTime;
uniform float uQuantum;
varying vec3 vColor;
varying float vAlong;
varying float vSide;

void main() {
  vColor = color;
  vAlong = along;
  vSide = side;
  vec4 clipA = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec4 clipB = projectionMatrix * modelViewMatrix * vec4(other, 1.0);
  float wa = max(abs(clipA.w), 1e-4);
  float wb = max(abs(clipB.w), 1e-4);
  vec2 ndcA = clipA.xy / wa;
  vec2 ndcB = clipB.xy / wb;
  vec2 dir = ndcB - ndcA;
  float len = length(dir);
  if (len < 1e-6) dir = vec2(1.0, 0.0);
  else dir /= len;
  vec2 n = vec2(-dir.y, dir.x);
  float aspect = uResolution.y / max(uResolution.x, 1.0);
  float px = (uWidthPx / max(uResolution.y, 1.0)) * 2.0;
  vec4 clip = clipA;
  clip.xy += n * side * px * clip.w * vec2(aspect, 1.0);
  float ghost = sin(uTime * 1.7 + along * 6.28318) * uQuantum;
  clip.xy += n * ghost * clip.w * 0.003;
  gl_Position = clip;
}
`;

const FILAMENT_FRAGMENT = /* glsl */ `
uniform float uOpacity;
uniform float uTime;
varying vec3 vColor;
varying float vAlong;
varying float vSide;

void main() {
  float fade = smoothstep(0.0, 0.12, vAlong) * smoothstep(1.0, 0.88, vAlong);
  float edge = 1.0 - abs(vSide);
  float core = smoothstep(0.15, 0.92, edge);
  float glow = pow(max(edge, 0.0), 1.45);
  float sparkT = fract(vAlong * 1.35 - uTime * 0.38);
  float spark = smoothstep(0.0, 0.08, sparkT) * smoothstep(0.22, 0.1, sparkT);
  float pulse = 0.78 + 0.22 * sin(uTime * 2.05 + vAlong * 12.566);
  float alpha = uOpacity * fade * (glow * 0.5 + core * 0.85 + spark * 0.95) * pulse;
  vec3 col = vColor * (0.55 + core * 0.85 + spark * 1.35);
  gl_FragColor = vec4(col, alpha);
}
`;

const LINE_VERTEX = /* glsl */ `
attribute float along;
varying vec3 vColor;
varying float vAlong;
void main() {
  vColor = color;
  vAlong = along;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const LINE_FRAGMENT = /* glsl */ `
uniform float uOpacity;
uniform float uTime;
varying vec3 vColor;
varying float vAlong;
void main() {
  float fade = smoothstep(0.0, 0.08, vAlong) * smoothstep(1.0, 0.92, vAlong);
  float sparkT = fract(vAlong * 1.1 - uTime * 0.32);
  float spark = smoothstep(0.0, 0.06, sparkT) * smoothstep(0.16, 0.08, sparkT);
  float pulse = 0.88 + 0.12 * sin(uTime * 1.55 + vAlong * 6.28318);
  vec3 col = vColor * (0.9 + spark * 0.85);
  gl_FragColor = vec4(col, uOpacity * fade * pulse);
}
`;

export function createFilamentRibbonMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uResolution: { value: new THREE.Vector2(250, 550) },
      uWidthPx: { value: STAR_CONQUEST_SCALE.filamentWidthPx },
      uOpacity: { value: 0.68 },
      uTime: { value: 0 },
      uQuantum: { value: 0.38 },
    },
    vertexShader: FILAMENT_VERTEX,
    fragmentShader: FILAMENT_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
}

export function createFilamentCoreLineMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0.9 },
      uTime: { value: 0 },
    },
    vertexShader: LINE_VERTEX,
    fragmentShader: LINE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });
}
