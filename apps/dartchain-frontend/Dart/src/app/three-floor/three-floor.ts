import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import * as THREE from 'three';
import { CameraControlService } from '../core/services/camera-control.service';
import { CharacterControlService } from '../core/services/character-control.service';
import { ThreeSceneService } from '../core/services/three-scene.service';
import { MapConfigService } from '../core/map/map-config.service';
import { FLOOR_HORIZON_BLEND, floorHorizonMaskImage } from './floor-horizon-blend.config';
import {
  bindContainerResize,
  type ContainerResizeBinding,
  readContainerSize,
} from '../core/utils/three-container.util';
import {
  bindWebGlVisibilityPause,
  shouldAnimateWebGl,
} from '../core/utils/three-animation.util';
import { applyCanvasLayerStyles } from '../core/utils/three-webgl.util';
import {
  PerfProfiler,
  isPerfDebugEnabled,
  markRafLoopStart,
  markRafLoopStop,
  resetCollisionChecks,
} from '../core/utils/perf-profiler.util';
import { CharacterComponent } from './character/character.component';
import { CitySceneComponent } from './city-scene/city-scene.component';
import { JoystickMoveComponent } from './joystick-move/joystick-move.component';
import { JoystickViewComponent } from './joystick-view/joystick-view.component';
import { PlacementDetailsPanel } from './placement-details-panel/placement-details-panel';

const FLOOR_HEIGHT_FALLBACK = 420;
const PERF_DEBUG = isPerfDebugEnabled();

function getTargetPixelRatio(
  quality: 'low' | 'medium' | 'high',
  devicePixelRatio: number
): number {
  if (quality === 'low') return 1;
  if (quality === 'high') return Math.min(devicePixelRatio, 2);
  return Math.min(devicePixelRatio, 1.5);
}

/**
 * Floor Three.js — boucle unique hors NgZone, pixelRatio 1 (même look CSS 100%).
 */
@Component({
  selector: 'app-three-floor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CharacterComponent,
    CitySceneComponent,
    JoystickMoveComponent,
    JoystickViewComponent,
    PlacementDetailsPanel,
  ],
  templateUrl: './three-floor.html',
  styleUrl: './three-floor.css',
})
export class ThreeFloor implements AfterViewInit, OnDestroy {
  @ViewChild('floorCanvas', { static: true })
  floorCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('floorWrapper', { static: true })
  floorWrapper!: ElementRef<HTMLElement>;

  private readonly threeScene = inject(ThreeSceneService);
  private readonly characterControl = inject(CharacterControlService);
  private readonly cameraControl = inject(CameraControlService);
  private readonly mapConfig = inject(MapConfigService);
  private readonly zone = inject(NgZone);

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private animationId?: number;

  private animating = false;
  private visibilityBinding?: { unsubscribe: () => void };
  private resizeBinding?: ContainerResizeBinding;
  private lastFrameMs = 0;
  private lastPerfReportMs = 0;
  private unsubControl?: () => void;
  private readonly profiler = new PerfProfiler();

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.initScene());
  }

  ngOnDestroy(): void {
    this.unsubControl?.();
    this.characterControl.unbindKeys();
    this.cameraControl.detachOrbit();
    this.threeScene.unregister();
    this.visibilityBinding?.unsubscribe();
    this.resizeBinding?.unsubscribe();
    this.pauseAnimation();
    if (this.renderer) {
      this.renderer.renderLists.dispose();
      this.renderer.dispose();
      this.renderer = undefined;
    }
    this.scene?.clear();
    this.scene = undefined;
    this.camera = undefined;
  }

  private initScene(): void {
    try {
      if (PERF_DEBUG) console.log('[PERF] Game component created', 'ThreeFloor');

      const canvas = this.floorCanvas.nativeElement;
      const container = canvas.parentElement ?? canvas;
      const { width, height } = readContainerSize(container, {
        width: window.innerWidth,
        height: FLOOR_HEIGHT_FALLBACK,
      });

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(FLOOR_HORIZON_BLEND.skyColor);
      this.scene.fog = new THREE.Fog(
        FLOOR_HORIZON_BLEND.fog.color,
        FLOOR_HORIZON_BLEND.fog.near,
        FLOOR_HORIZON_BLEND.fog.far
      );

      this.camera = new THREE.PerspectiveCamera(52, width / height, 0.18, 1600);
      this.camera.position.set(0, 14, 18);
      this.camera.lookAt(0, 2, -14);

      const ambient = new THREE.AmbientLight(0xb7c8ff, 0.28);
      ambient.name = 'floor-night-ambient';
      this.scene.add(ambient);

      const topLight = new THREE.DirectionalLight(0xc5d4ff, 0.48);
      topLight.name = 'floor-moon-key';
      topLight.position.set(2, 10, 4);
      topLight.castShadow = false;
      this.scene.add(topLight);

      const fill = new THREE.DirectionalLight(0x7aa6ff, 0.22);
      fill.name = 'floor-urban-fill';
      fill.position.set(-4, 4, -2);
      fill.castShadow = false;
      this.scene.add(fill);

      const accent = new THREE.DirectionalLight(0xff6ad5, 0.12);
      accent.name = 'floor-neon-rim';
      accent.position.set(-8, 6, -10);
      accent.castShadow = false;
      this.scene.add(accent);

      const hemi = new THREE.HemisphereLight(0x08090c, 0x050508, 0.16);
      hemi.name = 'floor-hemi-fill';
      this.scene.add(hemi);

      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        depth: true,
        stencil: false,
        powerPreference: 'low-power',
        preserveDrawingBuffer: false,
        logarithmicDepthBuffer: false,
        failIfMajorPerformanceCaveat: false,
      });
      this.renderer.setPixelRatio(
        getTargetPixelRatio(this.mapConfig.configuration.quality, window.devicePixelRatio || 1)
      );
      this.renderer.setSize(width, height, false);
      this.renderer.setClearColor(
        FLOOR_HORIZON_BLEND.skyColor,
        FLOOR_HORIZON_BLEND.clearAlpha
      );
      this.applyHorizonBlendMask();
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.02;
      this.renderer.shadowMap.enabled = false;
      applyCanvasLayerStyles(canvas, 'floor');

      if (PERF_DEBUG) console.log('[PERF] Three.js renderer created');

      if (PERF_DEBUG) {
        console.log('[BACKGROUND] Active Angular component:', this.constructor.name);
        console.log(
          '[BACKGROUND] Renderer alpha:',
          this.renderer.getContextAttributes()?.alpha
        );
        console.log('[BACKGROUND] Scene fog:', this.scene.fog);
        console.log('[BACKGROUND] Scene background:', this.scene.background);
      }

      // Sol + monde runner : LegacyFloorMapProvider via MapLoadingService (city-scene).

      this.threeScene.register(this.scene, this.camera, this.renderer);
      this.cameraControl.attachOrbit(this.camera, canvas);
      this.cameraControl.resetOrbit();
      this.unsubControl = this.threeScene.registerUpdate((dt) => {
        this.characterControl.update(dt);
      });

      this.renderFrame();

      this.resizeBinding = bindContainerResize(
        container,
        (nextWidth, nextHeight) => this.applyRendererSize(nextWidth, nextHeight),
        { width: window.innerWidth, height: FLOOR_HEIGHT_FALLBACK }
      );

      this.visibilityBinding = bindWebGlVisibilityPause(
        () => this.pauseAnimation(),
        () => this.resumeAnimation()
      );
      this.lastFrameMs = performance.now();
      this.resumeAnimation();

      if (PERF_DEBUG) {
        console.log('[PERF] Render loop started');
        console.log('[PERF] Scene children:', this.scene.children.length);
        console.log('[PERF] Renderer info:', this.renderer.info);
      }
    } catch (error) {
      console.error('[three-floor] Initialisation impossible.', error);
    }
  }

  private animate = (): void => {
    if (!this.animating || !this.scene || !this.camera || !this.renderer) {
      return;
    }

    this.animationId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const deltaSeconds = Math.min(0.05, (now - this.lastFrameMs) / 1000);
    this.lastFrameMs = now;

    if (shouldAnimateWebGl()) {
      if (PERF_DEBUG) resetCollisionChecks();
      this.threeScene.tick(deltaSeconds);
      this.renderFrame();
    }

    if (PERF_DEBUG) {
      this.profiler.sample(deltaSeconds * 1000);
      this.profiler.maybeReport(this.renderer, this.scene.children.length, 'floor');
      if (now - this.lastPerfReportMs > 1000) {
        this.lastPerfReportMs = now;
        console.log('[METAVERSE:BASELINE]', {
          mapQuality: this.mapConfig.configuration.quality,
          fps: Math.round(deltaSeconds > 0 ? 1 / deltaSeconds : 0),
          drawCalls: this.renderer.info.render.calls,
          triangles: this.renderer.info.render.triangles,
          geometries: this.renderer.info.memory.geometries,
          textures: this.renderer.info.memory.textures,
          programs: this.renderer.info.programs?.length,
          canvasWidth: this.renderer.domElement.width,
          canvasHeight: this.renderer.domElement.height,
          pixelRatio: this.renderer.getPixelRatio(),
          firstRenderReady: this.scene.children.length > 0,
        });
      }
    }
  };

  private renderFrame(): void {
    if (!this.scene || !this.camera || !this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }

  private pauseAnimation(): void {
    this.renderFrame();
    this.animating = false;
    if (this.animationId != null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = undefined;
    }
    markRafLoopStop();
  }

  private resumeAnimation(): void {
    if (this.animating) return;
    this.animating = true;
    this.lastFrameMs = performance.now();
    markRafLoopStart();
    this.animate();
  }

  private applyRendererSize(width: number, height: number): void {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(
      getTargetPixelRatio(this.mapConfig.configuration.quality, window.devicePixelRatio || 1)
    );
    this.renderer.setSize(width, height, false);
    this.renderFrame();
  }

  private applyHorizonBlendMask(): void {
    const wrapper = this.floorWrapper?.nativeElement;
    if (!wrapper) return;
    const mask = floorHorizonMaskImage();
    wrapper.style.setProperty('-webkit-mask-image', mask);
    wrapper.style.setProperty('mask-image', mask);
  }
}
