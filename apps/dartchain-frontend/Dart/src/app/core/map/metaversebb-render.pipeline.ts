import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { TAARenderPass } from 'three/examples/jsm/postprocessing/TAARenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

import type { MapQuality } from './map-configuration';
import { mapPerfProfile } from './marseille-perf.config';
import { mapQualityTier } from './map-configuration';
import {
  districtColorGradeMix,
  resolveDistrictColorGrade,
} from './district-color-grade.util';
import {
  MetaverseBbColorGradeShader,
  colorGradeMixForQuality,
} from './metaversebb-color-grade.shader';
import {
  adaptiveSsaoSettings,
  VALIDATION_DOF,
} from './metaversebb-ssao.util';
import {
  atmosphereBloomRadius,
  atmosphereBloomStrength,
  atmosphereBloomThreshold,
} from './marseille-atmosphere.config';

export interface MetaverseBbRenderPipelineOptions {
  quality: MapQuality;
  pixelRatio?: number;
}

export interface MetaverseBbFrameState {
  focusX: number;
  focusZ: number;
  focusY?: number;
  cameraDistance?: number;
  validationDof?: boolean;
}

/**
 * Phase 5 + 13 — TAA (high), bloom, SSAO adaptatif, color grade district, DOF validation.
 */
export class MetaverseBbRenderPipeline {
  private readonly composer: EffectComposer;
  private readonly scenePass: RenderPass | TAARenderPass;
  private readonly fxaaPass: ShaderPass;
  private readonly colorGradePass: ShaderPass;
  private bloomPass: UnrealBloomPass | null = null;
  private ssaoPass: SSAOPass | null = null;
  private bokehPass: BokehPass | null = null;
  private readonly quality: MapQuality;
  private pixelRatio = 1;
  private lastFocusX = 0;
  private lastFocusZ = 0;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: MetaverseBbRenderPipelineOptions
  ) {
    this.quality = options.quality;
    this.pixelRatio = options.pixelRatio ?? renderer.getPixelRatio();
    this.composer = new EffectComposer(renderer);

    const perf = mapPerfProfile(options.quality);
    const width = renderer.domElement.width;
    const height = renderer.domElement.height;

    if (perf.useTaa) {
      const taa = new TAARenderPass(scene, camera);
      taa.unbiased = false;
      taa.accumulate = true;
      taa.sampleLevel = perf.taaSampleLevel;
      this.scenePass = taa;
    } else {
      this.scenePass = new RenderPass(scene, camera);
    }
    this.composer.addPass(this.scenePass);

    if (perf.useSsao) {
      this.ssaoPass = new SSAOPass(scene, camera, width, height, 24);
      this.ssaoPass.kernelRadius = 6;
      this.ssaoPass.minDistance = 0.004;
      this.ssaoPass.maxDistance = 0.065;
      this.composer.addPass(this.ssaoPass);
    }

    if (mapQualityTier(options.quality).bloom) {
      const size = new THREE.Vector2(width, height);
      this.bloomPass = new UnrealBloomPass(
        size,
        atmosphereBloomStrength(options.quality) * perf.bloomStrengthScale,
        atmosphereBloomRadius(options.quality),
        atmosphereBloomThreshold(options.quality)
      );
      this.composer.addPass(this.bloomPass);
    }

    this.colorGradePass = new ShaderPass(MetaverseBbColorGradeShader);
    const gradeMix = colorGradeMixForQuality(options.quality);
    this.colorGradePass.enabled = gradeMix > 0;
    this.colorGradePass.uniforms['mixStrength'].value = gradeMix;
    this.composer.addPass(this.colorGradePass);

    if (mapQualityTier(options.quality).validationDof) {
      this.bokehPass = new BokehPass(scene, camera, {
        focus: VALIDATION_DOF.focus,
        aperture: VALIDATION_DOF.aperture,
        maxblur: VALIDATION_DOF.maxblur,
      });
      this.bokehPass.enabled = false;
      this.composer.addPass(this.bokehPass);
    }

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    this.fxaaPass = new ShaderPass(FXAAShader);
    this.updateFxaaResolution(renderer.domElement.width, renderer.domElement.height);
    if (usesFxaaPass(options.quality)) {
      this.composer.addPass(this.fxaaPass);
    }
  }

  usesComposer(): boolean {
    return shouldUseRenderPipeline(this.quality);
  }

  updateFrame(state: MetaverseBbFrameState): void {
    const district = resolveDistrictColorGrade(state.focusX, state.focusZ);
    const baseMix = colorGradeMixForQuality(this.quality);
    this.colorGradePass.uniforms['mixStrength'].value = districtColorGradeMix(baseMix, district);
    this.colorGradePass.uniforms['shadowTint'].value.copy(district.shadowTint);
    this.colorGradePass.uniforms['highlightTint'].value.copy(district.highlightTint);

    if (this.ssaoPass && state.cameraDistance != null) {
      const ssao = adaptiveSsaoSettings(state.cameraDistance, state.focusY ?? 0);
      this.ssaoPass.kernelRadius = ssao.kernelRadius;
      this.ssaoPass.maxDistance = ssao.maxDistance;
    }

    if (this.bokehPass) {
      this.bokehPass.enabled = state.validationDof === true;
    }

    if (this.scenePass instanceof TAARenderPass) {
      const moved =
        Math.hypot(state.focusX - this.lastFocusX, state.focusZ - this.lastFocusZ) > 0.35;
      if (moved) {
        this.scenePass.accumulate = false;
      } else {
        this.scenePass.accumulate = true;
      }
    }
    this.lastFocusX = state.focusX;
    this.lastFocusZ = state.focusZ;
  }

  setSize(width: number, height: number, pixelRatio?: number): void {
    if (pixelRatio != null) {
      this.pixelRatio = pixelRatio;
    }
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(this.pixelRatio);
    this.updateFxaaResolution(width, height);
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width * this.pixelRatio, height * this.pixelRatio);
    }
    if (this.ssaoPass) {
      this.ssaoPass.setSize(width * this.pixelRatio, height * this.pixelRatio);
    }
  }

  render(): void {
    this.composer.render();
  }

  dispose(): void {
    this.composer.dispose();
    this.bloomPass = null;
    this.ssaoPass = null;
    this.bokehPass = null;
  }

  private updateFxaaResolution(width: number, height: number): void {
    const res = this.fxaaPass.material.uniforms['resolution'].value as THREE.Vector2;
    res.x = 1 / (width * this.pixelRatio);
    res.y = 1 / (height * this.pixelRatio);
  }
}

export function shouldUseRenderPipeline(_quality: MapQuality): boolean {
  return true;
}

export function shouldUseTaa(quality: MapQuality): boolean {
  return mapPerfProfile(quality).useTaa;
}

export function usesFxaaPass(quality: MapQuality): boolean {
  const perf = mapPerfProfile(quality);
  return perf.useFxaa && !perf.useTaa;
}
