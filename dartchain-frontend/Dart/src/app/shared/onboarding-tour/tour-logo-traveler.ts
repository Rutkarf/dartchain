import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  input,
  signal,
} from '@angular/core';
import type {
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { LogoStlCacheService } from '../logo-stl-viewer/logo-stl-cache.service';
import {
  LOGO_HOLO,
  LOGO_HOLO_EMISSIVE_HEX,
  LOGO_HOLO_SHEEN_HEX,
  addLogoHoloLights,
  createLogoHoloMaterial,
  tickLogoHoloAppearance,
  type LogoHoloCenterDarkUniforms,
} from '../logo-stl-viewer/logo-stl-holo';
import { hexToThree } from '../../core/constants/palette';

/**
 * Mini traveler logo.stl pour le tutoriel hub (T1).
 * Réutilise le cache STL + look holo intro/navbar.
 */
@Component({
  selector: 'app-tour-logo-traveler',
  standalone: true,
  template: `
    <div #host class="tour-logo-traveler__host" aria-hidden="true"></div>
    @if (failed()) {
      <div class="tour-logo-traveler__fallback" aria-hidden="true"></div>
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .tour-logo-traveler__host {
      width: 100%;
      height: 100%;
    }
    .tour-logo-traveler__host canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }
    .tour-logo-traveler__fallback {
      position: absolute;
      inset: 12%;
      border-radius: 28%;
      background:
        radial-gradient(circle at 32% 28%, rgba(237, 231, 217, 0.95), transparent 42%),
        linear-gradient(145deg, #09814a 0%, #09814a 45%, #8b9dad 100%);
      box-shadow:
        0 0 0 1px rgba(9, 129, 74, 0.45),
        0 0 14px rgba(9, 129, 74, 0.5);
      clip-path: polygon(
        50% 6%,
        78% 18%,
        94% 48%,
        78% 82%,
        50% 94%,
        22% 82%,
        6% 48%,
        22% 18%
      );
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TourLogoTraveler implements AfterViewInit, OnDestroy {
  private readonly cache = inject(LogoStlCacheService);

  readonly reducedMotion = input(false);
  readonly spinning = input(true);

  @ViewChild('host', { static: true })
  private hostRef!: ElementRef<HTMLDivElement>;

  readonly ready = signal(false);
  readonly failed = signal(false);

  private disposed = false;
  private frameId = 0;
  private three?: typeof import('three');
  private scene?: Scene;
  private camera?: PerspectiveCamera;
  private renderer?: WebGLRenderer;
  private mesh?: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private pivot?: Group;
  private centerDark?: LogoHoloCenterDarkUniforms;
  private emissiveStops: Color[] = [];
  private sheenStops: Color[] = [];
  private scratchA?: Color;
  private scratchB?: Color;
  private edgeBright?: Color;
  private edgeGlow?: Color;
  private startMs = 0;
  private visibilityHandler?: () => void;

  ngAfterViewInit(): void {
    void this.mount();
    this.visibilityHandler = () => {
      if (document.hidden) this.stopLoop();
      else if (this.renderer && !this.disposed) this.startLoop();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  ngOnDestroy(): void {
    this.disposed = true;
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    this.teardown();
  }

  private async mount(): Promise<void> {
    try {
      const [THREE, geometry] = await Promise.all([
        import('three'),
        this.cache.load(),
      ]);
      if (this.disposed) {
        geometry.dispose();
        return;
      }
      this.three = THREE;
      const host = this.hostRef.nativeElement;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
      camera.position.set(0, 0.18, 3.55);
      const renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'low-power',
        stencil: false,
      });
      renderer.setPixelRatio(1);
      renderer.setSize(128, 128, false);
      renderer.setClearColor(0x0d0630, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const canvas = renderer.domElement;
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      host.replaceChildren(canvas);

      addLogoHoloLights(THREE, scene, 1);

      const radius = Math.max(geometry.boundingSphere?.radius ?? 1, 1);
      const { material, centerDark } = createLogoHoloMaterial(THREE, geometry);
      this.centerDark = centerDark;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.set(-0.55, 0.42, 0.12);
      mesh.scale.setScalar(1.7 / (radius * 2));
      const pivot = new THREE.Group();
      pivot.add(mesh);
      scene.add(pivot);

      this.scene = scene;
      this.camera = camera;
      this.renderer = renderer;
      this.mesh = mesh;
      this.pivot = pivot;
      this.emissiveStops = LOGO_HOLO_EMISSIVE_HEX.map(
        (hex) => new THREE.Color(hexToThree(hex)),
      );
      this.sheenStops = LOGO_HOLO_SHEEN_HEX.map(
        (hex) => new THREE.Color(hexToThree(hex)),
      );
      this.scratchA = new THREE.Color();
      this.scratchB = new THREE.Color();
      this.edgeBright = new THREE.Color(LOGO_HOLO.edgeBright);
      this.edgeGlow = new THREE.Color(LOGO_HOLO.edgeGlow);
      this.startMs = performance.now();
      this.ready.set(true);
      this.failed.set(false);
      this.startLoop();
    } catch {
      if (!this.disposed) this.failed.set(true);
    }
  }

  private startLoop(): void {
    this.stopLoop();
    const tick = () => {
      if (this.disposed || !this.renderer || !this.scene || !this.camera) return;
      const elapsed = (performance.now() - this.startMs) / 1000;
      if (this.pivot && this.spinning() && !this.reducedMotion()) {
        this.pivot.rotation.y += 0.024;
      }
      if (
        this.mesh &&
        this.scratchA &&
        this.scratchB &&
        this.edgeBright &&
        this.edgeGlow
      ) {
        tickLogoHoloAppearance({
          material: this.mesh.material,
          centerDark: this.centerDark,
          emissiveStops: this.emissiveStops,
          sheenStops: this.sheenStops,
          scratchA: this.scratchA,
          scratchB: this.scratchB,
          edgeBright: this.edgeBright,
          edgeGlow: this.edgeGlow,
          elapsed,
          bright: 0.58,
        });
      }
      this.renderer.render(this.scene, this.camera);
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  private teardown(): void {
    this.stopLoop();
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.scene = undefined;
    this.camera = undefined;
    this.renderer = undefined;
    this.mesh = undefined;
    this.pivot = undefined;
    this.centerDark = undefined;
  }
}
