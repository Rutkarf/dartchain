import { Injectable } from '@angular/core';
import * as THREE from 'three';

import { FLOOR_HORIZON_BLEND } from '@metaverse/floor-horizon-blend.config';
import type { MapQuality } from './map-configuration';
import { mapPerfProfile } from './marseille-perf.config';
import { shouldRunSimTick } from './marseille-sim-throttle.util';
import {
  MARSEILLE_ATMOSPHERE_LIGHTS,
  activeAtmospherePreset,
  atmosphereShadowMapSize,
} from './marseille-atmosphere.config';
import { harborAccentIntensityAtDistance } from './night-lighting.config';
import { atmosphereFogExpDensity } from './sky-atmosphere.config';
import { buildSkyDome, followSkyDome, type SkyDomeBuildResult } from './sky-dome.util';
import { tickSkyDomeMaterial } from './sky-dome.shader';
import {
  buildStreamingDistrictHaze,
  updateStreamingDistrictHaze,
  type StreamingDistrictHazeResult,
} from './streaming-district-haze.util';

const HAZE_NEAR_OPACITY = 0.14;
const HAZE_FAR_OPACITY = 0.19;

/**
 * Phase 0 — source unique lumière / fog / IBL pour MetaVerseBB.
 * Branché depuis `three-floor` ; accents port depuis le map provider.
 */
@Injectable({ providedIn: 'root' })
export class MarseilleAtmosphereService {
  private scene: THREE.Scene | null = null;
  private keyLight: THREE.DirectionalLight | null = null;
  private keyTarget: THREE.Object3D | null = null;
  private cubeEnvironment: THREE.CubeTexture | null = null;
  private pmremEnvironment: THREE.Texture | null = null;
  private pmremGenerator: THREE.PMREMGenerator | null = null;
  private ownedTextures: THREE.Texture[] = [];
  private harborAccentsAttached = false;
  private currentQuality: MapQuality = 'medium';
  private harborCyan: THREE.PointLight | null = null;
  private harborMagenta: THREE.PointLight | null = null;
  private depthBlue: THREE.PointLight | null = null;
  private skyDome: SkyDomeBuildResult | null = null;
  private skyElapsedSeconds = 0;
  private streamingHaze: StreamingDistrictHazeResult | null = null;
  private depthHazePanels: THREE.Mesh[] = [];
  private atmosphereFrameIndex = 0;

  applyToScene(scene: THREE.Scene, quality: MapQuality): void {
    this.dispose();
    this.scene = scene;
    this.currentQuality = quality;

    const preset = activeAtmospherePreset();
    const perf = mapPerfProfile(quality);
    scene.background = new THREE.Color(FLOOR_HORIZON_BLEND.skyColor);

    if (preset.fogEnabled) {
      scene.fog = new THREE.FogExp2(
        preset.fogColor,
        atmosphereFogExpDensity(preset.fogFar)
      );
    } else {
      scene.fog = new THREE.Fog(
        FLOOR_HORIZON_BLEND.fog.color,
        FLOOR_HORIZON_BLEND.fog.near,
        FLOOR_HORIZON_BLEND.fog.far
      );
    }

    scene.environmentIntensity = preset.environmentIntensity;

    this.attachSkyDome(scene, quality);

    const L = MARSEILLE_ATMOSPHERE_LIGHTS;

    const ambient = new THREE.AmbientLight(L.ambient.color, L.ambient.intensity);
    ambient.name = 'metaverse-ambient';
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(L.hemi.sky, L.hemi.ground, L.hemi.intensity);
    hemi.name = 'metaverse-hemi';
    scene.add(hemi);

    this.keyTarget = new THREE.Object3D();
    this.keyTarget.name = 'metaverse-key-target';
    this.keyTarget.position.set(0, 1.2, 2);
    scene.add(this.keyTarget);

    this.keyLight = new THREE.DirectionalLight(L.key.color, L.key.intensity);
    this.keyLight.name = 'metaverse-key';
    this.keyLight.position.copy(L.key.position);
    this.keyLight.target = this.keyTarget;
    scene.add(this.keyLight);

    const fill = new THREE.DirectionalLight(L.fill.color, L.fill.intensity);
    fill.name = 'metaverse-fill';
    fill.position.copy(L.fill.position);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(L.rim.color, L.rim.intensity);
    rim.name = 'metaverse-rim';
    rim.position.copy(L.rim.position);
    scene.add(rim);

    this.configureSpawnShadows(quality);
  }

  /** Dôme ciel shader — cohérent PMREM / masque CSS (Phase 12). */
  attachSkyDome(scene: THREE.Scene, quality: MapQuality): void {
    this.skyDome?.geometry.dispose();
    this.skyDome?.material.dispose();
    this.skyDome = null;

    const built = buildSkyDome(quality);
    if (!built) return;
    this.skyDome = built;
    scene.add(built.mesh);
  }

  /** PMREM — reflets PBR plus crédibles (sol mouillé, quais, vitrines). */
  buildPmremEnvironment(renderer: THREE.WebGLRenderer): void {
    if (!this.scene) return;

    this.pmremGenerator?.dispose();
    this.pmremEnvironment?.dispose();

    this.cubeEnvironment = this.createNightEnvironmentMap();
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.pmremGenerator.compileCubemapShader();
    this.pmremEnvironment = this.pmremGenerator.fromCubemap(this.cubeEnvironment).texture;
    this.scene.environment = this.pmremEnvironment;
    this.cubeEnvironment.dispose();
    this.cubeEnvironment = null;
  }

  /** Accents port + brumes de profondeur — attachés au root map. */
  attachHarborAccents(mapRoot: THREE.Group): void {
    if (this.harborAccentsAttached) return;
    this.harborAccentsAttached = true;

    const L = MARSEILLE_ATMOSPHERE_LIGHTS;
    const scene = this.scene;
    if (!scene) return;

    const perf = mapPerfProfile(this.currentQuality);

    const harborCyan = new THREE.PointLight(
      L.harborCyan.color,
      L.harborCyan.intensity,
      120,
      2
    );
    harborCyan.position.copy(L.harborCyan.position);
    harborCyan.name = 'metaverse-harbor-cyan';
    scene.add(harborCyan);
    this.harborCyan = harborCyan;

    const harborMagenta = new THREE.PointLight(
      L.harborMagenta.color,
      L.harborMagenta.intensity,
      110,
      2
    );
    harborMagenta.position.copy(L.harborMagenta.position);
    harborMagenta.name = 'metaverse-harbor-magenta';
    scene.add(harborMagenta);
    this.harborMagenta = harborMagenta;

    const depthBlue = new THREE.PointLight(L.depthBlue.color, L.depthBlue.intensity, 220, 2);
    depthBlue.position.copy(L.depthBlue.position);
    depthBlue.name = 'metaverse-canebiere-depth';
    scene.add(depthBlue);
    this.depthBlue = depthBlue;

    if (!perf.useDepthHazePlanes) {
      this.attachStreamingDistrictHaze(mapRoot);
      this.attachSpawnContactShadow(mapRoot);
      return;
    }

    const preset = activeAtmospherePreset();
    const hazeTint = preset.fogColor;

    const hazeNear = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 84),
      new THREE.MeshBasicMaterial({
        color: hazeTint,
        transparent: true,
        opacity: HAZE_NEAR_OPACITY,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: true,
      })
    );
    hazeNear.name = 'metaverse-depth-haze';
    hazeNear.position.set(0, 26, -210);
    mapRoot.add(hazeNear);

    const hazeFar = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 110),
      new THREE.MeshBasicMaterial({
        color: hazeTint,
        transparent: true,
        opacity: HAZE_FAR_OPACITY,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: true,
      })
    );
    hazeFar.name = 'metaverse-depth-haze-far';
    hazeFar.position.set(0, 34, -270);
    mapRoot.add(hazeFar);
    this.depthHazePanels.push(hazeNear, hazeFar);

    this.attachStreamingDistrictHaze(mapRoot);

    this.attachSpawnContactShadow(mapRoot);
  }

  /** Brume anneau streaming ↔ cœur geo (Phase 12). */
  attachStreamingDistrictHaze(mapRoot: THREE.Group): void {
    if (this.streamingHaze) return;
    const perf = mapPerfProfile(this.currentQuality);
    this.streamingHaze = buildStreamingDistrictHaze(perf.streamingHazePanels);
    mapRoot.add(this.streamingHaze.group);
  }

  /** Ombre contact discrète au spawn — ancrage visuel sans collider. */
  private attachSpawnContactShadow(mapRoot: THREE.Group): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.34)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.11)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(4.4, 36), material);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.012, 0);
    shadow.renderOrder = 2;
    shadow.name = 'metaverse-spawn-contact-shadow';
    mapRoot.add(shadow);
  }

  /** Ombres + ciel + brume streaming — frustum centré sur la caméra. */
  updateRuntime(focusX: number, focusZ: number, quality: MapQuality, focusY = 0): void {
    this.currentQuality = quality;
    this.atmosphereFrameIndex++;
    const perf = mapPerfProfile(quality);
    if (
      perf.atmosphereTickSkip > 0 &&
      this.atmosphereFrameIndex % (perf.atmosphereTickSkip + 1) !== 0
    ) {
      return;
    }

    this.skyElapsedSeconds += 0.016 * (perf.atmosphereTickSkip + 1);
    const L = MARSEILLE_ATMOSPHERE_LIGHTS;

    if (this.skyDome) {
      followSkyDome(this.skyDome.mesh, focusX, focusY, focusZ);
      tickSkyDomeMaterial(this.skyDome.material, this.skyElapsedSeconds);
    }

    if (this.streamingHaze) {
      updateStreamingDistrictHaze(this.streamingHaze.panels, focusX, focusZ);
    }

    if (perf.useDepthHazePlanes && this.depthHazePanels.length > 0) {
      const dist = Math.hypot(focusX, focusZ);
      const hazeBoost = THREE.MathUtils.clamp(1.05 - dist / 280, 0.72, 1.08);
      for (const panel of this.depthHazePanels) {
        const mat = panel.material;
        if (!(mat instanceof THREE.MeshBasicMaterial)) continue;
        const base = panel.name.includes('far') ? HAZE_FAR_OPACITY : HAZE_NEAR_OPACITY;
        mat.opacity = base * hazeBoost;
      }
    }

    if (this.harborCyan) {
      this.harborCyan.intensity = harborAccentIntensityAtDistance(
        L.harborCyan.intensity,
        focusX,
        focusZ,
        L.harborCyan.position.x,
        L.harborCyan.position.z
      );
    }
    if (this.harborMagenta) {
      this.harborMagenta.intensity = harborAccentIntensityAtDistance(
        L.harborMagenta.intensity,
        focusX,
        focusZ,
        L.harborMagenta.position.x,
        L.harborMagenta.position.z
      );
    }
    if (this.depthBlue) {
      this.depthBlue.intensity = harborAccentIntensityAtDistance(
        L.depthBlue.intensity,
        focusX,
        focusZ,
        L.depthBlue.position.x,
        L.depthBlue.position.z,
        80,
        220
      );
    }
    if (!this.keyLight?.castShadow || !this.keyTarget) return;

    const tx = THREE.MathUtils.clamp(focusX, -22, 22);
    const tz = THREE.MathUtils.clamp(focusZ, -16, 36);
    this.keyTarget.position.set(tx, 1.1, tz);

    const span = quality === 'high' ? 36 : 40;
    const cam = this.keyLight.shadow.camera as THREE.OrthographicCamera;
    cam.left = -span;
    cam.right = span;
    cam.top = span;
    cam.bottom = -span;
    cam.updateProjectionMatrix();
  }

  configureSpawnShadows(quality: MapQuality): void {
    const perf = mapPerfProfile(quality);
    if (!this.keyLight) return;

    if (!perf.spawnShadows) {
      this.keyLight.castShadow = false;
      return;
    }

    const mapSize = atmosphereShadowMapSize(quality);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(mapSize, mapSize);
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.014;
    this.keyLight.shadow.radius = quality === 'high' ? 2.2 : 1.4;

    const cam = this.keyLight.shadow.camera as THREE.OrthographicCamera;
    cam.near = 0.5;
    cam.far = 68;
    cam.left = -40;
    cam.right = 40;
    cam.top = 40;
    cam.bottom = -40;
    cam.updateProjectionMatrix();
  }

  configureRendererShadows(renderer: THREE.WebGLRenderer, quality: MapQuality): void {
    renderer.shadowMap.enabled = mapPerfProfile(quality).spawnShadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  getToneMappingExposure(): number {
    return activeAtmospherePreset().toneMappingExposure;
  }

  /** PMREM IBL — réflexions eau Phase 9. */
  getEnvironmentMap(): THREE.Texture | null {
    return this.pmremEnvironment;
  }

  enableShadowsOnObject(root: THREE.Object3D, options?: { cast?: boolean; receive?: boolean }): void {
    const cast = options?.cast ?? true;
    const receive = options?.receive ?? true;
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (cast) mesh.castShadow = true;
      if (receive) mesh.receiveShadow = true;
    });
  }

  dispose(): void {
    this.keyLight = null;
    this.keyTarget = null;
    this.scene = null;
    this.harborAccentsAttached = false;
    this.harborCyan = null;
    this.harborMagenta = null;
    this.depthBlue = null;
    this.skyDome?.geometry.dispose();
    this.skyDome?.material.dispose();
    this.skyDome = null;
    this.streamingHaze = null;
    this.depthHazePanels = [];
    this.pmremEnvironment?.dispose();
    this.pmremEnvironment = null;
    this.pmremGenerator?.dispose();
    this.pmremGenerator = null;
    this.cubeEnvironment?.dispose();
    this.cubeEnvironment = null;
    for (const tex of this.ownedTextures) {
      tex.dispose();
    }
    this.ownedTextures.length = 0;
  }

  private createNightEnvironmentMap(): THREE.CubeTexture {
    const makeFace = (
      top: string,
      bottom: string,
      options?: { glow?: boolean }
    ): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) return canvas;
      const gradient = ctx.createLinearGradient(0, 0, 0, 128);
      gradient.addColorStop(0, top);
      gradient.addColorStop(1, bottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);

      if (options?.glow) {
        const radial = ctx.createRadialGradient(64, 96, 8, 64, 96, 72);
        radial.addColorStop(0, 'rgba(66, 220, 255, 0.22)');
        radial.addColorStop(1, 'rgba(66, 220, 255, 0)');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, 128, 128);
      }

      for (let i = 0; i < 28; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 72;
        ctx.fillStyle = `rgba(220,230,255,${0.04 + Math.random() * 0.08})`;
        ctx.fillRect(x, y, 1, 1);
      }
      return canvas;
    };

    const faces = [
      makeFace('#0a1018', '#050508'),
      makeFace('#0c1420', '#06060a'),
      makeFace('#101828', '#080810'),
      makeFace('#080c10', '#040408', { glow: true }),
      makeFace('#0e1624', '#060608'),
      makeFace('#0a1220', '#07090e', { glow: true }),
    ];

    const texture = new THREE.CubeTexture(faces);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }
}
