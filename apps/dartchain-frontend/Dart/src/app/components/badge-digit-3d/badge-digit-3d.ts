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
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { createWebGlRenderer } from '../../core/utils/three-webgl.util';

@Component({
  selector: 'app-badge-digit-3d',
  standalone: true,
  templateUrl: './badge-digit-3d.html',
  styleUrl: './badge-digit-3d.css',
})
export class BadgeDigit3dComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true })
  private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  /** Digits to render (e.g. "12", "99+"). */
  @Input({ required: true }) text = '';

  webglFailed = false;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private mesh: THREE.Mesh | null = null;
  private font: Font | null = null;
  private fontPromise: Promise<Font | null> | null = null;
  private disposed = false;
  private readonly cssW = 20;
  private readonly cssH = 14;

  ngAfterViewInit(): void {
    void this.boot();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['text'] && !changes['text'].firstChange) {
      void this.rebuildText();
    }
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.disposeScene();
  }

  private async boot(): Promise<void> {
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
    this.camera = new THREE.PerspectiveCamera(28, this.cssW / this.cssH, 0.1, 40);
    this.camera.position.set(0, 0.05, 6.4);
    this.camera.lookAt(0, 0, 0);

    const key = new THREE.DirectionalLight(0xffffff, 1.85);
    key.position.set(-1.8, 2.8, 4.2);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.7);
    fill.position.set(2.2, -0.8, 2.4);
    this.scene.add(fill);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));

    const font = await this.loadFont();
    if (this.disposed || !font) {
      this.webglFailed = true;
      this.disposeScene();
      return;
    }

    this.font = font;
    await this.rebuildText();
  }

  private loadFont(): Promise<Font | null> {
    if (this.font) {
      return Promise.resolve(this.font);
    }
    if (!this.fontPromise) {
      this.fontPromise = new Promise((resolve) => {
        const loader = new FontLoader();
        loader.load(
          'assets/fonts/helvetiker_bold.typeface.json',
          (font) => resolve(font),
          undefined,
          () => resolve(null)
        );
      });
    }
    return this.fontPromise;
  }

  private async rebuildText(): Promise<void> {
    if (!this.renderer || !this.scene || !this.camera) {
      return;
    }

    const font = this.font ?? (await this.loadFont());
    if (this.disposed || !font) {
      return;
    }
    this.font = font;

    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
      this.mesh = null;
    }

    const label = (this.text || '0').slice(0, 3);
    const geometry = new TextGeometry(label, {
      font,
      size: 2.55,
      depth: 0.48,
      curveSegments: 3,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.06,
      bevelOffset: 0,
      bevelSegments: 2,
    });
    geometry.computeBoundingBox();
    geometry.center();

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.12,
      roughness: 0.22,
      emissive: 0xffffff,
      emissiveIntensity: 0.18,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -0.06;
    this.mesh.rotation.y = 0.12;
    this.scene.add(this.mesh);

    const box = geometry.boundingBox;
    if (box && this.camera) {
      const w = Math.max(box.max.x - box.min.x, 0.01);
      const h = Math.max(box.max.y - box.min.y, 0.01);
      const fit = Math.max(w / (this.cssW / this.cssH), h) * 1.08;
      const dist = fit / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
      this.camera.position.set(0, 0.02, dist);
      this.camera.lookAt(0, 0, 0);
      this.camera.updateProjectionMatrix();
    }

    this.renderer.render(this.scene, this.camera);
  }

  private disposeScene(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
      this.mesh = null;
    }
    this.scene = null;
    this.camera = null;
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
