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
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

import {
  bindContainerResize,
  readContainerSize,
  type ContainerResizeBinding,
  whenContainerReady,
} from '@core/utils/three-container.util';
import {
  bindWebGlVisibilityPause,
  shouldAnimateWebGl,
} from '@core/utils/three-animation.util';
import {
  applyCanvasLayerStyles,
  createWebGlRenderer,
} from '@core/utils/three-webgl.util';

const CYAN = 0x8a95a5;
const PARTICLE_COUNT = 280;

/** Fond WebGL sobre/premium pour le drawer Launch Lab. */
@Component({
  selector: 'app-launch-form-drawer-fx',
  standalone: true,
  imports: [CommonModule],
  template: `<div #fxHost class="launch-drawer-fx__canvas" aria-hidden="true"></div>`,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        z-index: 0;
        display: block;
        overflow: hidden;
        pointer-events: none;
      }

      .launch-drawer-fx__canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaunchFormDrawerFxComponent implements AfterViewInit, OnDestroy {
  @ViewChild('fxHost', { static: true })
  private readonly fxHost!: ElementRef<HTMLDivElement>;

  private readonly ngZone = inject(NgZone);
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private clock = new THREE.Clock();
  private frameId = 0;
  private animating = false;
  private disposed = false;

  private grid: THREE.Mesh | null = null;
  private particles: THREE.Points | null = null;
  private sweep: THREE.PointLight | null = null;
  private visibilityBinding?: { unsubscribe: () => void };
  private resizeBinding?: ContainerResizeBinding;

  private readonly onPointerMove = (event: PointerEvent): void => {
    const rect = this.hostRef.nativeElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || !this.camera) {
      return;
    }
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    this.camera.position.x = x * 0.18;
    this.camera.position.y = 0.35 + y * 0.08;
    this.camera.lookAt(0, 0, -2);
  };

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      whenContainerReady(this.fxHost.nativeElement, () => {
        if (!this.disposed) {
          this.init();
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.visibilityBinding?.unsubscribe();
    this.resizeBinding?.unsubscribe();
    this.pause();
    window.removeEventListener('pointermove', this.onPointerMove);
    this.disposeScene();
  }

  private init(): void {
    const host = this.fxHost.nativeElement;
    const created = createWebGlRenderer({ antialias: false, alpha: true });
    if (!created) {
      return;
    }

    const { width, height } = readContainerSize(host);
    this.renderer = created.renderer;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(width, height, false);
    this.renderer.setClearColor(0x0d0630, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    applyCanvasLayerStyles(created.canvas, 'floor');
    created.canvas.style.position = 'absolute';
    created.canvas.style.inset = '0';
    host.innerHTML = '';
    host.appendChild(created.canvas);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0d0630, 0.08);
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 40);
    this.camera.position.set(0, 0.35, 4.2);
    this.camera.lookAt(0, 0, -2);

    this.scene.add(new THREE.AmbientLight(0x18314f, 0.7));
    this.sweep = new THREE.PointLight(CYAN, 1.4, 10, 2);
    this.sweep.position.set(-2, 1, 1);
    this.scene.add(this.sweep);

    const gridMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uCyan: { value: new THREE.Color(CYAN) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vUv = uv;
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uCyan;
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vec2 p = vWorld.xz * 0.55;
          vec2 g = abs(fract(p) - 0.5);
          float line = max(
            smoothstep(0.04, 0.0, g.x),
            smoothstep(0.04, 0.0, g.y)
          );
          float pulse = 0.55 + 0.45 * sin(uTime * 1.2 + p.y * 2.0);
          float fade = smoothstep(-6.0, 1.0, vWorld.z) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
          float alpha = line * 0.28 * pulse * fade;
          gl_FragColor = vec4(uCyan, clamp(alpha, 0.0, 0.55));
        }
      `,
    });
    this.grid = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), gridMat);
    this.grid.rotation.x = -Math.PI * 0.5;
    this.grid.position.set(0, -1.1, -2);
    this.scene.add(this.grid);

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = THREE.MathUtils.randFloatSpread(8);
      positions[i * 3 + 1] = THREE.MathUtils.randFloat(-0.8, 3.2);
      positions[i * 3 + 2] = THREE.MathUtils.randFloat(-6, 1.5);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: CYAN,
        size: 0.028,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    );
    this.scene.add(this.particles);

    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    this.resizeBinding = bindContainerResize(host, (w, h) => this.resize(w, h));
    this.visibilityBinding = bindWebGlVisibilityPause(
      () => this.pause(),
      () => this.resume()
    );
    this.resume();
  }

  private resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) {
      return;
    }
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private resume(): void {
    if (this.animating || !shouldAnimateWebGl() || !this.renderer) {
      return;
    }
    this.animating = true;
    this.clock.start();
    this.tick();
  }

  private pause(): void {
    this.animating = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  private tick = (): void => {
    if (!this.animating || !this.renderer || !this.scene || !this.camera) {
      return;
    }
    const t = this.clock.getElapsedTime();
    const gridMat = this.grid?.material as THREE.ShaderMaterial | undefined;
    if (gridMat?.uniforms) {
      gridMat.uniforms['uTime'].value = t;
    }
    if (this.particles) {
      this.particles.rotation.y = t * 0.035;
    }
    if (this.sweep) {
      this.sweep.position.x = Math.sin(t * 0.6) * 2.4;
      this.sweep.intensity = 1.1 + Math.sin(t * 1.8) * 0.3;
    }
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.tick);
  };

  private disposeScene(): void {
    const dispose = (obj: THREE.Object3D | null): void => {
      if (!obj) {
        return;
      }
      obj.traverse((child) => {
        if (
          child instanceof THREE.Mesh ||
          child instanceof THREE.Points ||
          child instanceof THREE.LineSegments
        ) {
          child.geometry?.dispose();
          const mat = child.material;
          if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose());
          } else {
            mat?.dispose();
          }
        }
      });
    };
    dispose(this.grid);
    dispose(this.particles);
    this.scene?.clear();
    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.grid = null;
    this.particles = null;
    this.sweep = null;
  }
}
