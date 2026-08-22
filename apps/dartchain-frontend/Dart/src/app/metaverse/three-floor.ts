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
import { CameraControlService } from '@metaverse/services/camera-control.service';
import { CharacterControlService } from '@metaverse/services/character-control.service';
import { ThreeSceneService } from '@metaverse/services/three-scene.service';
import { MapConfigService } from '@world-map/map-config.service';
import type { MapQuality } from '@world-map/map-configuration';
import { mapPerfProfile } from '@world-map/marseille-perf.config';
import { MarseilleAtmosphereService } from '@world-map/marseille-atmosphere.service';
import {
  MetaverseBbRenderPipeline,
  shouldUseRenderPipeline,
} from '@world-map/metaversebb-render.pipeline';
import { harmonizedHorizonMaskImage, harmonizedHorizonSkyCssColor } from '@world-map/floor-horizon-atmosphere.util';
import { FLOOR_HORIZON_BLEND } from './floor-horizon-blend.config';
import {
  bindContainerResize,
  type ContainerResizeBinding,
  readContainerSize,
} from '../core/utils/three-container.util';
import { applyCanvasLayerStyles } from '../core/utils/three-webgl.util';
import {
  PerfProfiler,
  isPerfDebugEnabled,
  resetCollisionChecks,
} from '../core/utils/perf-profiler.util';
import {
  WebGlAnimationSchedulerService,
  type WebGlFrameContext,
} from '../core/utils/web-gl-animation-scheduler.service';
import { CombinedPerfHudService } from '../core/utils/combined-perf-hud.service';
import { CharacterComponent } from './character/character.component';
import { CitySceneComponent } from './city-scene/city-scene.component';
import { JoystickMoveComponent } from './input/joystick-move/joystick-move.component';
import { JoystickViewComponent } from './input/joystick-view/joystick-view.component';
import { PlacementDetailsPanel } from './placement-details-panel/placement-details-panel';

const FLOOR_HEIGHT_FALLBACK = 420;
const PERF_DEBUG = isPerfDebugEnabled();

function getTargetPixelRatio(
  quality: MapQuality,
  devicePixelRatio: number
): number {
  const cap = mapPerfProfile(quality).pixelRatioCap;
  return Math.min(devicePixelRatio, cap);
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
  private readonly atmosphere = inject(MarseilleAtmosphereService);
  private readonly zone = inject(NgZone);
  private readonly animationScheduler = inject(WebGlAnimationSchedulerService);
  private readonly combinedPerfHud = inject(CombinedPerfHudService);

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private renderPipeline?: MetaverseBbRenderPipeline;
  private schedulerUnregister?: () => void;

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
    this.schedulerUnregister?.();
    this.schedulerUnregister = undefined;
    this.animationScheduler.pauseSubscriber('metaverse-floor');
    this.resizeBinding?.unsubscribe();
    if (this.renderer) {
      this.renderer.renderLists.dispose();
      this.renderer.dispose();
      this.renderer = undefined;
    }
    this.scene?.clear();
    this.scene = undefined;
    this.camera = undefined;
    this.renderPipeline?.dispose();
    this.renderPipeline = undefined;
    this.atmosphere.dispose();
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

      this.camera = new THREE.PerspectiveCamera(52, width / height, 0.18, 1600);
      this.camera.position.set(0, 14, 18);
      this.camera.lookAt(0, 2, -14);

      const quality = this.mapConfig.configuration.quality;

      console.info('[ThreeFloor] mapQuality:', quality, '(verrouillé ultra-low produit)');

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

      this.atmosphere.applyToScene(this.scene, quality);
      this.atmosphere.buildPmremEnvironment(this.renderer);
      this.atmosphere.configureRendererShadows(this.renderer, quality);
      this.renderer.toneMappingExposure = this.atmosphere.getToneMappingExposure();

      applyCanvasLayerStyles(canvas, 'floor');

      const pixelRatio = getTargetPixelRatio(quality, window.devicePixelRatio || 1);
      if (shouldUseRenderPipeline(quality)) {
        this.renderPipeline = new MetaverseBbRenderPipeline(this.renderer, this.scene, this.camera, {
          quality,
          pixelRatio,
        });
      }

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

      this.schedulerUnregister = this.animationScheduler.register({
        id: 'metaverse-floor',
        order: 20,
        onFrame: (ctx) => this.onSchedulerFrame(ctx),
        onPause: () => this.renderFrame(),
        onResume: () => {
          this.lastPerfReportMs = performance.now();
        },
      });
      this.animationScheduler.resumeSubscriber('metaverse-floor');

      if (PERF_DEBUG) {
        console.log('[PERF] Render loop started');
        console.log('[PERF] Scene children:', this.scene.children.length);
        console.log('[PERF] Renderer info:', this.renderer.info);
      }
    } catch (error) {
      console.error('[three-floor] Initialisation impossible.', error);
    }
  }

  private onSchedulerFrame(ctx: WebGlFrameContext): void {
    if (!this.scene || !this.camera || !this.renderer) return;

    if (ctx.animating) {
      if (PERF_DEBUG) resetCollisionChecks();
      this.threeScene.tick(ctx.deltaSeconds);
      const cam = this.camera.position;
      this.atmosphere.updateRuntime(
        cam.x,
        cam.z,
        this.mapConfig.configuration.quality,
        cam.y
      );
      if (this.renderPipeline) {
        this.renderPipeline.updateFrame({
          focusX: cam.x,
          focusZ: cam.z,
          focusY: cam.y,
          cameraDistance: Math.hypot(cam.x, cam.z),
          validationDof: this.cameraControl.isValidationViewActive(),
        });
      }
      this.renderFrame();
    }

    this.combinedPerfHud.reportFloor(this.renderer.info);

    if (PERF_DEBUG) {
      this.profiler.sample(ctx.deltaMs);
      this.profiler.maybeReport(this.renderer, this.scene.children.length, 'floor');
      const now = performance.now();
      if (now - this.lastPerfReportMs > 1000) {
        this.lastPerfReportMs = now;
        console.log('[METAVERSE:BASELINE]', {
          mapQuality: this.mapConfig.configuration.quality,
          fps: Math.round(ctx.deltaMs > 0 ? 1000 / ctx.deltaMs : 0),
          combinedFrameMs: Math.round(this.animationScheduler.getLastCombinedFrameMs() * 10) / 10,
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
  }

  private renderFrame(): void {
    if (!this.scene || !this.camera || !this.renderer) return;
    if (this.renderPipeline?.usesComposer()) {
      this.renderPipeline.render();
      return;
    }
    this.renderer.render(this.scene, this.camera);
  }

  private applyRendererSize(width: number, height: number): void {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(
      getTargetPixelRatio(this.mapConfig.configuration.quality, window.devicePixelRatio || 1)
    );
    this.renderer.setSize(width, height, false);
    this.renderPipeline?.setSize(width, height, this.renderer.getPixelRatio());
    this.renderFrame();
  }

  private applyHorizonBlendMask(): void {
    const wrapper = this.floorWrapper?.nativeElement;
    if (!wrapper) return;
    const mask = harmonizedHorizonMaskImage();
    wrapper.style.setProperty('-webkit-mask-image', mask);
    wrapper.style.setProperty('mask-image', mask);
    wrapper.style.backgroundColor = harmonizedHorizonSkyCssColor();
  }
}
