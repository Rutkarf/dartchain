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

const FLOOR_HEIGHT_FALLBACK = 140;
const PERF_DEBUG = isPerfDebugEnabled();

/** Noir plein — aligné fond app. */
const SCENE_BG = 0x000000;

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
  ],
  templateUrl: './three-floor.html',
  styleUrl: './three-floor.css',
})
export class ThreeFloor implements AfterViewInit, OnDestroy {
  @ViewChild('floorCanvas', { static: true })
  floorCanvas!: ElementRef<HTMLCanvasElement>;

  private readonly threeScene = inject(ThreeSceneService);
  private readonly characterControl = inject(CharacterControlService);
  private readonly cameraControl = inject(CameraControlService);
  private readonly zone = inject(NgZone);

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private animationId?: number;

  private neonFloor?: THREE.Mesh;
  private floorTexture?: THREE.CanvasTexture;
  private pathLine?: THREE.Line;
  private animating = false;
  private visibilityBinding?: { unsubscribe: () => void };
  private resizeBinding?: ContainerResizeBinding;
  private lastFrameMs = 0;
  private unsubControl?: () => void;
  private readonly profiler = new PerfProfiler();

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.initScene());
  }

  ngOnDestroy(): void {
    this.unsubControl?.();
    this.characterControl.unbindKeys();
    this.threeScene.unregister();
    this.visibilityBinding?.unsubscribe();
    this.resizeBinding?.unsubscribe();
    this.pauseAnimation();
    this.disposeFloor();
    this.disposePathLine();
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
      // Couleur unie assortie au fond CSS (pas d’alpha canvas = pas de seam CSS/WebGL)
      this.scene.background = new THREE.Color(SCENE_BG);
      // Fog lointain uniquement — near > bâtiments proches (évite toits lavés)
      this.scene.fog = new THREE.Fog(SCENE_BG, 90, 240);

      this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 250);
      this.camera.position.set(0, 2.2, 5);
      this.camera.lookAt(0, 0.4, -4);

      // Éclairage neutre — sol invert (clair) sur fond noir
      const ambient = new THREE.AmbientLight(0xffffff, 0.55);
      this.scene.add(ambient);

      const topLight = new THREE.DirectionalLight(0xffffff, 0.7);
      topLight.position.set(2, 10, 4);
      topLight.castShadow = false;
      this.scene.add(topLight);

      const fill = new THREE.DirectionalLight(0xd0d0d0, 0.35);
      fill.position.set(-4, 4, -2);
      fill.castShadow = false;
      this.scene.add(fill);

      const accent = new THREE.DirectionalLight(0xa0a0a0, 0.2);
      accent.position.set(-8, 6, -10);
      accent.castShadow = false;
      this.scene.add(accent);

      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: false,
        depth: true,
        stencil: false,
        powerPreference: 'low-power',
        preserveDrawingBuffer: false,
        logarithmicDepthBuffer: false,
        failIfMajorPerformanceCaveat: false,
      });
      // CSS reste 100% — résolution interne fixe 1× (pas de déformation layout)
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(width, height, false);
      this.renderer.setClearColor(SCENE_BG, 1);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
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

      this.createProfessionalFloor();
      this.createPathLine();

      this.threeScene.register(this.scene, this.camera, this.renderer);
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

  /**
   * Floor : surface + texture grille dense (maillage + accent soft GridHelper bakés).
   * Un seul mesh — pas de Lines GridHelper (même look, moins de draw calls).
   */
  private createProfessionalFloor(): void {
    if (!this.scene) return;

    this.floorTexture = this.createDenseGridTexture();
    this.floorTexture.wrapS = THREE.RepeatWrapping;
    this.floorTexture.wrapT = THREE.RepeatWrapping;
    // Maillage serré via repeat élevé
    this.floorTexture.repeat.set(48, 48);
    this.floorTexture.anisotropy = 1;
    this.floorTexture.generateMipmaps = false;
    this.floorTexture.minFilter = THREE.LinearFilter;
    this.floorTexture.magFilter = THREE.LinearFilter;
    this.floorTexture.colorSpace = THREE.SRGBColorSpace;

    // Sol « invert » LCD : base claire, grille sombre (noir↔blanc)
    const floorMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: this.floorTexture,
      side: THREE.FrontSide,
      transparent: false,
      opacity: 1,
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), floorMaterial);
    floor.name = 'neon-floor';
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = false;
    this.neonFloor = floor;
    this.scene.add(floor);

    if (PERF_DEBUG) {
      console.log('[PERF] Floor dense texture (grid baked) ready');
    }
  }

  /**
   * Texture grille invert rétro (LCD invert téléphone) :
   * base claire (ex-noir→blanc), traits sombres (ex-blanc/cyan→noir).
   */
  private createDenseGridTexture(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, size, size);
    // Maillage serré (8×8) — traits noirs
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.lineWidth = 1;
    const step = size / 8;
    for (let i = 0; i <= 8; i++) {
      const p = i * step + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    // Lignes majeures plus marquées
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.moveTo(0.5, 0);
    ctx.lineTo(0.5, size);
    ctx.moveTo(0, 0.5);
    ctx.lineTo(size, 0.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1.25;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.5)';
    ctx.beginPath();
    ctx.moveTo(size * 0.5 + 0.5, 0);
    ctx.lineTo(size * 0.5 + 0.5, size);
    ctx.moveTo(0, size * 0.5 + 0.5);
    ctx.lineTo(size, size * 0.5 + 0.5);
    ctx.stroke();
    return new THREE.CanvasTexture(canvas);
  }

  private createPathLine(): void {
    if (!this.scene) return;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.08, 5),
      new THREE.Vector3(0, 0.08, -40),
    ]);
    const pathLine = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({
        color: 0x111111,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      })
    );
    pathLine.name = 'path-line';
    pathLine.raycast = () => {};
    this.pathLine = pathLine;
    this.scene.add(pathLine);
  }

  private disposePathLine(): void {
    if (!this.pathLine) return;
    this.scene?.remove(this.pathLine);
    this.pathLine.geometry.dispose();
    (this.pathLine.material as THREE.Material).dispose();
    this.pathLine = undefined;
  }

  private disposeFloor(): void {
    if (this.neonFloor) {
      this.scene?.remove(this.neonFloor);
      this.neonFloor.geometry.dispose();
      (this.neonFloor.material as THREE.Material).dispose();
      this.neonFloor = undefined;
    }
    this.floorTexture?.dispose();
    this.floorTexture = undefined;
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
    this.renderer.setSize(width, height, false);
    this.renderFrame();
  }
}
