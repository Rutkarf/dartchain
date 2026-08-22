import * as THREE from 'three';

import { HARBOR_WATER_SHADER_CONFIG } from './harbor-water.config';

export const HARBOR_WATER_VERTEX_SHADER = /* glsl */ `
  #include <common>

  uniform float uTime;
  uniform float uWaveHeight;
  uniform float uShoreDistortion;

  attribute float aShoreDepth;
  varying float vShoreDepth;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  void main() {
    vShoreDepth = aShoreDepth;
    vec3 pos = position;

    float shore = 1.0 - clamp(aShoreDepth, 0.0, 1.0);
    float waveScale = 1.0 + shore * uShoreDistortion;

    float w1 = sin(uTime * 1.2 + pos.x * 0.09 + pos.z * 0.07) * uWaveHeight * waveScale;
    float w2 = cos(uTime * 0.85 - pos.x * 0.06 + pos.z * 0.11) * uWaveHeight * 0.55 * waveScale;
    pos.y += w1 + w2;

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPos = world.xyz;

    float dx = 0.09 * cos(uTime * 1.2 + pos.x * 0.09 + pos.z * 0.07) * uWaveHeight * waveScale
             - 0.06 * sin(uTime * 0.85 - pos.x * 0.06 + pos.z * 0.11) * uWaveHeight * 0.55 * waveScale;
    float dz = 0.07 * cos(uTime * 1.2 + pos.x * 0.09 + pos.z * 0.07) * uWaveHeight * waveScale
             + 0.11 * sin(uTime * 0.85 - pos.x * 0.06 + pos.z * 0.11) * uWaveHeight * 0.55 * waveScale;
    vec3 waveNormal = normalize(vec3(-dx, 1.0, -dz));
    vWorldNormal = normalize(mat3(modelMatrix) * waveNormal);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const HARBOR_WATER_FRAGMENT_SHADER = /* glsl */ `
  #include <common>
  #include <cube_uv_reflection_fragment>

  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform vec3 uFoamColor;
  uniform vec3 uHorizonTint;
  uniform float uFoamThreshold;
  uniform float uFoamStrength;
  uniform float uFresnelStrength;
  uniform float uFresnelPower;
  uniform float uDepthContrast;
  uniform float uOpacity;
  uniform float uReflectionMix;
  uniform float envMapIntensity;

  #ifdef USE_ENVMAP
    uniform sampler2D envMap;
  #endif

  varying float vShoreDepth;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  void main() {
    float depth = clamp(vShoreDepth, 0.0, 1.0);
    float depthVis = pow(depth, uDepthContrast);
    vec3 waterColor = mix(uShallowColor, uDeepColor, depthVis);

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 normal = normalize(vWorldNormal);
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), uFresnelPower);

    waterColor = mix(waterColor, uHorizonTint, fresnel * uFresnelStrength * 0.55);
    waterColor = mix(waterColor, vec3(0.88, 0.97, 1.0), fresnel * uFresnelStrength * 0.45);

    #ifdef USE_ENVMAP
      vec3 reflectVec = reflect(-viewDir, normal);
      reflectVec = normalize(reflectVec);
      vec4 envSample = textureCubeUV(envMap, reflectVec, 0.0);
      waterColor = mix(waterColor, envSample.rgb, fresnel * uReflectionMix * envMapIntensity);
    #endif

    float foam = 1.0 - smoothstep(0.0, uFoamThreshold, depth);
    waterColor = mix(waterColor, uFoamColor, foam * uFoamStrength);

    gl_FragColor = vec4(waterColor, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface HarborWaterShaderMaterial extends THREE.ShaderMaterial {
  envMap: THREE.Texture | null;
  envMapIntensity: number;
  uniforms: {
    uTime: { value: number };
    uWaveHeight: { value: number };
    uShoreDistortion: { value: number };
    uShallowColor: { value: THREE.Color };
    uDeepColor: { value: THREE.Color };
    uFoamColor: { value: THREE.Color };
    uHorizonTint: { value: THREE.Color };
    uFoamThreshold: { value: number };
    uFoamStrength: { value: number };
    uFresnelStrength: { value: number };
    uFresnelPower: { value: number };
    uDepthContrast: { value: number };
    uOpacity: { value: number };
    uReflectionMix: { value: number };
    envMapIntensity: { value: number };
  };
}

export function createHarborWaterShaderMaterial(
  shoreDistortion: number = HARBOR_WATER_SHADER_CONFIG.shoreDistortion
): HarborWaterShaderMaterial {
  const cfg = HARBOR_WATER_SHADER_CONFIG;
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWaveHeight: { value: cfg.waveHeight },
      uShoreDistortion: { value: shoreDistortion },
      uShallowColor: { value: cfg.shallowColor.clone() },
      uDeepColor: { value: cfg.deepColor.clone() },
      uFoamColor: { value: cfg.foamColor.clone() },
      uHorizonTint: { value: new THREE.Color(0xa8e8ff) },
      uFoamThreshold: { value: cfg.foamShoreThreshold },
      uFoamStrength: { value: cfg.foamStrength },
      uFresnelStrength: { value: cfg.fresnelStrength },
      uFresnelPower: { value: cfg.fresnelPower },
      uDepthContrast: { value: cfg.depthContrast },
      uOpacity: { value: cfg.opacity },
      uReflectionMix: { value: 0 },
      envMapIntensity: { value: 0.85 },
    },
    vertexShader: HARBOR_WATER_VERTEX_SHADER,
    fragmentShader: HARBOR_WATER_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  }) as HarborWaterShaderMaterial;
}

export function tickHarborWaterShader(
  material: HarborWaterShaderMaterial,
  elapsedSeconds: number
): void {
  material.uniforms.uTime.value = elapsedSeconds * HARBOR_WATER_SHADER_CONFIG.waveSpeed;
}
