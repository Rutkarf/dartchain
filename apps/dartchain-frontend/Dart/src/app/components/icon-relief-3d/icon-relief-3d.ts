import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import { createWebGlRenderer } from '../../core/utils/three-webgl.util';

export type IconReliefKind = 'refresh' | 'chevron';

@Component({
  selector: 'app-icon-relief-3d',
  standalone: true,
  templateUrl: './icon-relief-3d.html',
  styleUrl: './icon-relief-3d.css',
})
export class IconRelief3dComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true })
  private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input({ required: true }) kind: IconReliefKind = 'refresh';
  /** Chevron: true = pointe vers le bas (panneau replié). */
  @Input() flipped = false;
  /** Refresh: rotation continue pendant un refresh. */
  @Input() spinning = false;

  webglFailed = false;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private root: THREE.Group | null = null;
  private material: THREE.MeshStandardMaterial | null = null;
  private disposed = false;
  private spinRaf = 0;
  private readonly cssW = 28;
  private readonly cssH = 24;

  ngAfterViewInit(): void {
    this.boot();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.disposed || !this.root) {
      return;
    }
    if (changes['kind'] && !changes['kind'].firstChange) {
      this.rebuildIcon();
    }
    if (changes['flipped']) {
      this.applyFlip();
      this.renderOnce();
    }
    if (changes['spinning']) {
      this.syncSpin();
    }
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.stopSpin();
    this.disposeScene();
  }

  private boot(): void {
    const canvas = this.canvasRef.nativeElement;
    const result = createWebGlRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });

    if (!result) {
      this.webglFailed = true;
      return;
    }

    this.renderer = result.renderer;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.cssW, this.cssH, false);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, this.cssW / this.cssH, 0.1, 40);
    this.camera.position.set(0.35, 0.55, 7.2);
    this.camera.lookAt(0, 0, 0);

    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(-2.4, 3.6, 5);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0xd8f6ff, 0.55);
    rim.position.set(2.8, -1.4, 2.2);
    this.scene.add(rim);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.22,
      roughness: 0.28,
      emissive: 0xffffff,
      emissiveIntensity: 0.12,
    });

    this.rebuildIcon();
    this.syncSpin();
  }

  private rebuildIcon(): void {
    if (!this.scene || !this.material) {
      return;
    }

    if (this.root) {
      this.disposeObject(this.root);
      this.scene.remove(this.root);
      this.root = null;
    }

    this.root = this.kind === 'chevron' ? this.buildChevron() : this.buildRefresh();
    this.applyFlip();
    this.scene.add(this.root);
    this.frameCamera(this.root);
    this.renderOnce();
  }

  private buildRefresh(): THREE.Group {
    const group = new THREE.Group();
    const mat = this.material!;

    // Classic refresh: two opposing circular arrows (↻)
    const arrowGeo = this.extrudeShape(this.refreshArrowShape());
    const arrowA = new THREE.Mesh(arrowGeo, mat);
    group.add(arrowA);

    const arrowB = new THREE.Mesh(arrowGeo.clone(), mat);
    arrowB.rotation.z = Math.PI;
    group.add(arrowB);

    group.rotation.x = -0.16;
    group.rotation.y = 0.2;
    return group;
  }

  private buildChevron(): THREE.Group {
    const group = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(-1.25, -0.45);
    shape.lineTo(0, 0.7);
    shape.lineTo(1.25, -0.45);
    shape.lineTo(0.92, -0.72);
    shape.lineTo(0, 0.18);
    shape.lineTo(-0.92, -0.72);
    shape.closePath();

    const mesh = new THREE.Mesh(this.extrudeShape(shape), this.material!);
    group.add(mesh);
    group.rotation.x = -0.2;
    group.rotation.y = 0.18;
    return group;
  }

  /** One circular arrow of a refresh pair (arc + triangular tip). */
  private refreshArrowShape(): THREE.Shape {
    const shape = new THREE.Shape();
    const r = 1.05;
    const half = 0.2;
    const a0 = (28 * Math.PI) / 180;
    const a1 = (158 * Math.PI) / 180;
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const x = Math.cos(a) * (r + half);
      const y = Math.sin(a) * (r + half);
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }

    // Tangent at a1 (counter-clockwise): (-sin, cos)
    const tx = -Math.sin(a1);
    const ty = Math.cos(a1);
    const cx = Math.cos(a1) * r;
    const cy = Math.sin(a1) * r;
    const wing = half + 0.28;
    const tip = 0.58;

    shape.lineTo(Math.cos(a1) * (r + wing), Math.sin(a1) * (r + wing));
    shape.lineTo(cx + tx * tip, cy + ty * tip);
    shape.lineTo(Math.cos(a1) * (r - wing), Math.sin(a1) * (r - wing));

    for (let i = steps; i >= 0; i--) {
      const a = a0 + ((a1 - a0) * i) / steps;
      shape.lineTo(Math.cos(a) * (r - half), Math.sin(a) * (r - half));
    }
    shape.closePath();
    return shape;
  }

  private extrudeShape(shape: THREE.Shape): THREE.ExtrudeGeometry {
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.06,
      bevelSegments: 2,
      curveSegments: 2,
    });
  }

  private applyFlip(): void {
    if (!this.root || this.kind !== 'chevron') {
      return;
    }
    this.root.rotation.z = this.flipped ? Math.PI : 0;
  }

  private frameCamera(object: THREE.Object3D): void {
    if (!this.camera) {
      return;
    }
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const fit = Math.max(size.x / (this.cssW / this.cssH), size.y, 0.01) * 1.2;
    const dist = fit / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    this.camera.position.set(0.25, 0.35, dist + 0.35);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  private syncSpin(): void {
    this.stopSpin();
    const reduceMotion =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!this.spinning || this.kind !== 'refresh' || !this.root || reduceMotion) {
      if (this.root && this.kind === 'refresh') {
        this.root.rotation.z = 0;
        this.renderOnce();
      }
      return;
    }

    const tick = (): void => {
      if (this.disposed || !this.root || !this.spinning) {
        return;
      }
      this.root.rotation.z -= 0.12;
      this.renderOnce();
      this.spinRaf = requestAnimationFrame(tick);
    };
    this.spinRaf = requestAnimationFrame(tick);
  }

  private stopSpin(): void {
    if (this.spinRaf) {
      cancelAnimationFrame(this.spinRaf);
      this.spinRaf = 0;
    }
  }

  private renderOnce(): void {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    });
  }

  private disposeScene(): void {
    if (this.root) {
      this.disposeObject(this.root);
      this.root = null;
    }
    this.material?.dispose();
    this.material = null;
    this.scene = null;
    this.camera = null;
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
