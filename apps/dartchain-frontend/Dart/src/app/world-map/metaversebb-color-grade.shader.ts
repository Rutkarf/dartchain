import * as THREE from 'three';

/** Color grade nuit portuaire — ombres cyan doux, reflets chauds. */
export const MetaverseBbColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    shadowTint: { value: new THREE.Vector3(0.86, 0.94, 1.06) },
    highlightTint: { value: new THREE.Vector3(1.04, 1.02, 0.98) },
    mixStrength: { value: 0.38 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec3 shadowTint;
    uniform vec3 highlightTint;
    uniform float mixStrength;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadowed = color.rgb * shadowTint;
      vec3 highlighted = color.rgb * highlightTint;
      vec3 graded = mix(shadowed, highlighted, smoothstep(0.08, 0.72, luma));
      color.rgb = mix(color.rgb, graded, mixStrength);
      gl_FragColor = color;
    }
  `,
};

import type { MapQuality } from './map-configuration';

export function colorGradeMixForQuality(quality: MapQuality): number {
  if (quality === 'high') return 0.44;
  if (quality === 'medium') return 0.36;
  return 0;
}
