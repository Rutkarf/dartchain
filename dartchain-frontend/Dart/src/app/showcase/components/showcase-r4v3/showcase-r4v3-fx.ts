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
import { createFxLineMaterial, STROKE } from '@core/constants/stroke-bevel';

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

const CYAN = 0x09814a;
const MAGENTA = 0x7b0d1e;
const PARTICLE_COUNT = 420;
const SPARK_COUNT = 64;

/**
 * Fond WebGL cyberpunk pour le hub R4V3 :
 * grille perspective profonde, particules, balayage énergétique, parallaxe pointeur.
 */
@Component({
  selector: 'app-showcase-r4v3-fx',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-r4v3-fx.html',
  styleUrl: './showcase-r4v3-fx.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseR4v3FxComponent implements AfterViewInit, OnDestroy {
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

  private gridMesh: THREE.Mesh | null = null;
  private wallMesh: THREE.Mesh | null = null;
  private particles: THREE.Points | null = null;
  private sparks: THREE.Points | null = null;
  private sweepLight: THREE.PointLight | null = null;
  private rimLight: THREE.PointLight | null = null;
  private energyLines: THREE.LineSegments | null = null;
  private vignette: THREE.Mesh | null = null;

  private pointerTarget = { x: 0, y: 0 };
  private pointerSmooth = { x: 0, y: 0 };
  private visibilityBinding?: { unsubscribe: () => void };
  private resizeBinding?: ContainerResizeBinding;
  private disposed = false;

  private readonly onPointerMove = (event: PointerEvent): void => {
    const host = this.hostRef.nativeElement;
    const rect = host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!inside) {
      this.pointerTarget.x *= 0.92;
      this.pointerTarget.y *= 0.92;
      return;
    }

    this.pointerTarget.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerTarget.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  };

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      whenContainerReady(this.fxHost.nativeElement, () => {
        if (this.disposed) {
          return;
        }
        this.init();
      });
    });
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.visibilityBinding?.unsubscribe();
    this.resizeBinding?.unsubscribe();
    this.pauseAnimation();
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
    created.canvas.setAttribute('aria-hidden', 'true');

    host.innerHTML = '';
    host.appendChild(created.canvas);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0d0630, 0.055);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    this.camera.position.set(0, 1.35, 6.2);
    this.camera.lookAt(0, 0.2, -2.5);

    this.scene.add(new THREE.AmbientLight(0x18314f, 0.55));

    const key = new THREE.DirectionalLight(0xede7d9, 0.55);
    key.position.set(-2.5, 4, 3);
    this.scene.add(key);

    this.sweepLight = new THREE.PointLight(CYAN, 1.8, 12, 2);
    this.sweepLight.position.set(-3, 1.2, 1);
    this.scene.add(this.sweepLight);

    this.rimLight = new THREE.PointLight(MAGENTA, 1.1, 10, 2);
    this.rimLight.position.set(3.2, 0.8, -1);
    this.scene.add(this.rimLight);

    this.buildDeepGrid();
    this.buildWallField();
    this.buildParticles();
    this.buildSparks();
    this.buildEnergyLines();
    this.buildVignette();

    // pointer-events: none sur le host — écoute fenêtre pour la parallaxe HUD.
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });

    this.resizeBinding = bindContainerResize(host, (w, h) => this.resize(w, h));
    this.visibilityBinding = bindWebGlVisibilityPause(
      () => this.pauseAnimation(),
      () => this.resumeAnimation()
    );
    this.resumeAnimation();
  }

  private buildDeepGrid(): void {
    if (!this.scene) {
      return;
    }

    const uniforms = {
      uTime: { value: 0 },
      uCyan: { value: new THREE.Color(CYAN) },
      uMagenta: { value: new THREE.Color(MAGENTA) },
      uPointer: { value: new THREE.Vector2(0, 0) },
    };

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms,
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
        uniform vec3 uMagenta;
        uniform vec2 uPointer;
        varying vec2 vUv;
        varying vec3 vWorld;

        float gridLine(vec2 p, float scale, float width) {
          vec2 g = abs(fract(p * scale) - 0.5);
          vec2 a = smoothstep(width, 0.0, g);
          return max(a.x, a.y);
        }

        void main() {
          vec2 p = vWorld.xz * 0.45;
          p += uPointer * 0.12;

          float major = gridLine(p, 1.0, 0.035);
          float minor = gridLine(p, 4.0, 0.018);
          float pulse = 0.55 + 0.45 * sin(uTime * 1.4 + p.y * 2.2);

          float depthFade = smoothstep(-8.0, 1.5, vWorld.z);
          float sideFade = 1.0 - smoothstep(3.8, 6.2, abs(vWorld.x));
          float horizon = smoothstep(0.02, 0.55, vUv.y) * (1.0 - smoothstep(0.72, 1.0, vUv.y));

          float scan = 0.35 + 0.65 * sin(vWorld.z * 3.5 - uTime * 2.8);
          float ripples = sin(length(p + uPointer * 0.4) * 7.0 - uTime * 3.2);
          ripples = pow(max(ripples, 0.0), 8.0);

          vec3 col = uCyan * (major * 0.75 + minor * 0.28) * pulse;
          col += uMagenta * ripples * 0.55;
          col += mix(uCyan, uMagenta, 0.4) * scan * 0.08;

          float alpha = (major * 0.42 + minor * 0.16 + ripples * 0.35)
            * depthFade * sideFade * horizon;
          alpha = clamp(alpha, 0.0, 0.72);

          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    this.gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(18, 14, 1, 1), material);
    this.gridMesh.rotation.x = -Math.PI * 0.5;
    this.gridMesh.position.set(0, -1.15, -2.4);
    this.scene.add(this.gridMesh);
  }

  private buildWallField(): void {
    if (!this.scene) {
      return;
    }

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uCyan: { value: new THREE.Color(CYAN) },
        uMagenta: { value: new THREE.Color(MAGENTA) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uCyan;
        uniform vec3 uMagenta;
        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;
          float columns = abs(fract(uv.x * 28.0) - 0.5);
          float rows = abs(fract(uv.y * 16.0 + uTime * 0.08) - 0.5);
          float lattice = smoothstep(0.48, 0.5, max(columns, rows));

          float rain = fract(uv.y * 22.0 - uTime * 0.55 + sin(uv.x * 40.0) * 0.2);
          rain = pow(1.0 - rain, 6.0) * step(0.92, fract(uv.x * 18.0));

          float bloom = 0.15 + 0.85 * sin(uTime * 0.9 + uv.x * 6.0);
          vec3 col = mix(uCyan, uMagenta, uv.x) * (lattice * 0.35 + rain * 0.8) * bloom;
          float alpha = (lattice * 0.18 + rain * 0.45) * smoothstep(0.0, 0.2, uv.y) * (1.0 - uv.y);
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.55));
        }
      `,
    });

    this.wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 9, 1, 1), material);
    this.wallMesh.position.set(0, 1.6, -7.5);
    this.scene.add(this.wallMesh);
  }

  private buildParticles(): void {
    if (!this.scene) {
      return;
    }

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const speeds = new Float32Array(PARTICLE_COUNT);
    const cyan = new THREE.Color(CYAN);
    const magenta = new THREE.Color(MAGENTA);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = THREE.MathUtils.randFloatSpread(10);
      positions[i3 + 1] = THREE.MathUtils.randFloat(-1.2, 4.2);
      positions[i3 + 2] = THREE.MathUtils.randFloat(-8, 2.5);
      speeds[i] = THREE.MathUtils.randFloat(0.08, 0.35);

      const tint = Math.random() > 0.72 ? magenta : cyan;
      colors[i3] = tint.r;
      colors[i3 + 1] = tint.g;
      colors[i3 + 2] = tint.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.035,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  private buildSparks(): void {
    if (!this.scene) {
      return;
    }

    const positions = new Float32Array(SPARK_COUNT * 3);
    for (let i = 0; i < SPARK_COUNT; i++) {
      positions[i * 3] = THREE.MathUtils.randFloatSpread(8);
      positions[i * 3 + 1] = THREE.MathUtils.randFloat(-0.8, 3.5);
      positions[i * 3 + 2] = THREE.MathUtils.randFloat(-6, 1.5);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xede7d9,
      size: 0.07,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.sparks = new THREE.Points(geo, mat);
    this.scene.add(this.sparks);
  }

  private buildEnergyLines(): void {
    if (!this.scene) {
      return;
    }

    const segments = 48;
    const positions = new Float32Array(segments * 2 * 3);

    for (let i = 0; i < segments; i++) {
      const x = THREE.MathUtils.randFloatSpread(9);
      const z = THREE.MathUtils.randFloat(-7, 1);
      const y0 = THREE.MathUtils.randFloat(-0.9, 0.4);
      const y1 = y0 + THREE.MathUtils.randFloat(0.8, 2.8);
      const base = i * 6;
      positions[base] = x;
      positions[base + 1] = y0;
      positions[base + 2] = z;
      positions[base + 3] = x + THREE.MathUtils.randFloat(-0.15, 0.15);
      positions[base + 4] = y1;
      positions[base + 5] = z + THREE.MathUtils.randFloat(-0.2, 0.2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = createFxLineMaterial(STROKE.ok);

    this.energyLines = new THREE.LineSegments(geo, mat);
    this.scene.add(this.energyLines);
  }

  private buildVignette(): void {
    if (!this.scene || !this.camera) {
      return;
    }

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float vig = smoothstep(1.35, 0.25, length(p * vec2(1.1, 1.25)));
          float scan = 0.04 * sin((vUv.y + uTime * 0.15) * 420.0);
          float alpha = (1.0 - vig) * 0.55 + scan;
          gl_FragColor = vec4(0.01, 0.03, 0.05, clamp(alpha, 0.0, 0.65));
        }
      `,
    });

    this.vignette = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    this.vignette.frustumCulled = false;
    this.vignette.renderOrder = 999;
    this.scene.add(this.vignette);
  }

  private resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) {
      return;
    }
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private resumeAnimation(): void {
    if (this.animating || !shouldAnimateWebGl() || !this.renderer) {
      return;
    }
    this.animating = true;
    this.clock.start();
    this.tick();
  }

  private pauseAnimation(): void {
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
    this.pointerSmooth.x += (this.pointerTarget.x - this.pointerSmooth.x) * 0.06;
    this.pointerSmooth.y += (this.pointerTarget.y - this.pointerSmooth.y) * 0.06;

    this.camera.position.x = this.pointerSmooth.x * 0.35;
    this.camera.position.y = 1.35 + this.pointerSmooth.y * 0.18;
    this.camera.lookAt(this.pointerSmooth.x * 0.2, 0.15 + this.pointerSmooth.y * 0.1, -2.5);

    if (this.sweepLight) {
      this.sweepLight.position.x = Math.sin(t * 0.7) * 3.4;
      this.sweepLight.position.z = Math.cos(t * 0.55) * 2.2 - 1.2;
      this.sweepLight.intensity = 1.4 + Math.sin(t * 2.1) * 0.45;
    }

    if (this.rimLight) {
      this.rimLight.position.x = Math.cos(t * 0.45) * 3.1;
      this.rimLight.intensity = 0.85 + Math.sin(t * 1.7 + 1.2) * 0.35;
    }

    const gridMat = this.gridMesh?.material as THREE.ShaderMaterial | undefined;
    if (gridMat?.uniforms) {
      gridMat.uniforms['uTime'].value = t;
      (gridMat.uniforms['uPointer'].value as THREE.Vector2).set(
        this.pointerSmooth.x,
        this.pointerSmooth.y
      );
    }

    const wallMat = this.wallMesh?.material as THREE.ShaderMaterial | undefined;
    if (wallMat?.uniforms) {
      wallMat.uniforms['uTime'].value = t;
    }

    const vigMat = this.vignette?.material as THREE.ShaderMaterial | undefined;
    if (vigMat?.uniforms) {
      vigMat.uniforms['uTime'].value = t;
    }

    if (this.particles) {
      this.particles.rotation.y = t * 0.04;
      const pos = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const speeds = this.particles.geometry.getAttribute('aSpeed') as THREE.BufferAttribute;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let y = pos.getY(i) + speeds.getX(i) * 0.016;
        if (y > 4.4) {
          y = -1.3;
        }
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    if (this.sparks) {
      this.sparks.rotation.y = -t * 0.07;
      const mat = this.sparks.material as THREE.PointsMaterial;
      mat.opacity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 4.2));
    }

    if (this.energyLines) {
      this.energyLines.rotation.y = Math.sin(t * 0.2) * 0.04;
      const mat = this.energyLines.material as THREE.LineBasicMaterial;
      mat.opacity = 0.12 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.8));
    }

    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.tick);
  };

  private disposeScene(): void {
    const disposeObject = (obj: THREE.Object3D | null): void => {
      if (!obj) {
        return;
      }
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.LineSegments) {
          child.geometry?.dispose();
          const material = child.material;
          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose());
          } else {
            material?.dispose();
          }
        }
      });
    };

    disposeObject(this.gridMesh);
    disposeObject(this.wallMesh);
    disposeObject(this.particles);
    disposeObject(this.sparks);
    disposeObject(this.energyLines);
    disposeObject(this.vignette);

    this.scene?.clear();
    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.gridMesh = null;
    this.wallMesh = null;
    this.particles = null;
    this.sparks = null;
    this.energyLines = null;
    this.vignette = null;
    this.sweepLight = null;
    this.rimLight = null;
  }
}
