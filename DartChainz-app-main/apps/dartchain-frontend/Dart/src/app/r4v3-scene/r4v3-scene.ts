import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  NgZone,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  PALETTE_STOPS,
  THREE_CORE_DEFAULT,
  THREE_GLASS_MATERIAL,
  THREE_RIM_DEFAULT,
  THREE_SCENE_BG,
  THREE_SCENE_CLEAR_LIGHT,
  hexToThree,
  threePaletteVariant,
} from '../core/constants/palette';

@Component({
  selector: 'app-r4v3-scene',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './r4v3-scene.html',
  styleUrl: './r4v3-scene.css'
})
export class R4v3SceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('sceneContainer', { static: true })
  sceneContainer!: ElementRef<HTMLDivElement>;

  @Output() rotationChange = new EventEmitter<{ x: number; y: number; z: number }>();

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private pivot!: THREE.Group;
  private mesh?: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  private stars?: THREE.Points;
  private frameId = 0;

  private ambientLight!: THREE.AmbientLight;
  private frontLight!: THREE.DirectionalLight;
  private rimLight!: THREE.PointLight;
  private coreLight!: THREE.PointLight;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private readonly palettes = PALETTE_STOPS.map((_, index) =>
    threePaletteVariant(index)
  );

  private paletteIndex = 0;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initScene();
      this.initLights();
      this.initStars();
      this.initControls();
      this.initPivot();
      this.loadLogoModel();
      this.resizeRendererToContainer();
      this.bindEvents();
      this.animate();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onResize);

    if (this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('click', this.onCanvasClick);
    }

    this.controls?.dispose();

    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }

    if (this.stars) {
      this.stars.geometry.dispose();
      (this.stars.material as THREE.Material).dispose();
    }

    this.scene?.clear();
    this.renderer?.dispose();
  }

  public randomizePalette(): void {
    this.changeLogoPalette();
    this.kickLogoRotation();
  }

  private initScene(): void {
    const host = this.sceneContainer.nativeElement;
    const width = Math.max(Math.round(host.clientWidth || window.innerWidth || 800), 32);
    const height = Math.max(Math.round(host.clientHeight || window.innerHeight || 600), 32);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(THREE_SCENE_CLEAR_LIGHT, 55, 140);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 5000);
    this.camera.position.set(0, 0, 34);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.setViewport(0, 0, width, height);
    this.renderer.setScissor(0, 0, width, height);
    this.renderer.setScissorTest(true);
    this.renderer.setClearColor(THREE_SCENE_CLEAR_LIGHT, 1);

    const rendererWithColorSpace = this.renderer as THREE.WebGLRenderer & {
      outputColorSpace?: THREE.ColorSpace;
    };

    if ('outputColorSpace' in rendererWithColorSpace) {
      rendererWithColorSpace.outputColorSpace = THREE.SRGBColorSpace;
    }

    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    host.innerHTML = '';
    host.appendChild(canvas);
  }

  private initLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    this.scene.add(this.ambientLight);

    this.frontLight = new THREE.DirectionalLight(0xffffff, 1.7);
    this.frontLight.position.set(40, 30, 80);
    this.scene.add(this.frontLight);

    this.rimLight = new THREE.PointLight(THREE_RIM_DEFAULT, 1.6, 240);
    this.rimLight.position.set(-22, 6, 45);
    this.scene.add(this.rimLight);

    this.coreLight = new THREE.PointLight(THREE_CORE_DEFAULT, 1.9, 220);
    this.coreLight.position.set(12, 10, 36);
    this.scene.add(this.coreLight);
  }

  private initStars(): void {
    const starCount = 1400;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = THREE.MathUtils.randFloatSpread(220);
      positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(150);
      positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(220);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.38,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.8;
    this.controls.rotateSpeed = 0.65;
    this.controls.minDistance = 18;
    this.controls.maxDistance = 85;
    this.controls.minPolarAngle = Math.PI * 0.18;
    this.controls.maxPolarAngle = Math.PI * 0.82;
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private initPivot(): void {
    this.pivot = new THREE.Group();
    this.pivot.position.set(0, 0, 0);
    this.scene.add(this.pivot);
  }

  private loadLogoModel(): void {
    const loader = new STLLoader();

    loader.load(
      'assets/logo.stl',
      (geometry) => {
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();

        const box = geometry.boundingBox;
        if (!box) return;

        const center = new THREE.Vector3();
        box.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);
        geometry.computeBoundingSphere();

        const sphere = geometry.boundingSphere;
        if (!sphere) return;

        const material = new THREE.MeshPhysicalMaterial({
          color: this.palettes[0].color,
          emissive: this.palettes[0].emissive,
          ...THREE_GLASS_MATERIAL,
          reflectivity: 0.85,
          side: THREE.DoubleSide,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 0, 0);
        this.mesh.rotation.set(-0.95, 0.42, 0.18);

        const radius = Math.max(sphere.radius, 1);
        const targetSize = 20;
        const scale = targetSize / (radius * 2);

        this.mesh.scale.setScalar(scale);
        this.pivot.add(this.mesh);

        this.fitCameraToPivot();
      }
    );
  }

  private fitCameraToPivot(): void {
    const box = new THREE.Box3().setFromObject(this.pivot);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance =
      maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)));
    const fitWidthDistance = fitHeightDistance / this.camera.aspect;
    const distance = 1.75 * Math.max(fitHeightDistance, fitWidthDistance);

    this.camera.position.set(center.x, center.y, center.z + distance);
    this.camera.near = 0.1;
    this.camera.far = Math.max(1000, distance * 20);
    this.camera.lookAt(center);

    this.controls.target.copy(center);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize, { passive: true });
    this.renderer.domElement.addEventListener('click', this.onCanvasClick);
  }

  private onCanvasClick = (event: MouseEvent): void => {
    if (!this.mesh) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.mesh, true);

    if (hits.length > 0) {
      this.changeLogoPalette();
      this.kickLogoRotation();
    }
  };

  private changeLogoPalette(): void {
    if (!this.mesh) return;

    this.paletteIndex = (this.paletteIndex + 1) % this.palettes.length;
    const palette = this.palettes[this.paletteIndex];

    this.mesh.material.color.setHex(palette.color);
    this.mesh.material.emissive.setHex(palette.emissive);
    this.rimLight.color.setHex(palette.rim);
    this.coreLight.color.setHex(palette.core);
    this.mesh.material.needsUpdate = true;
  }

  private kickLogoRotation(): void {
    this.pivot.rotation.z += THREE.MathUtils.randFloat(0.12, 0.28);
    this.pivot.rotation.y += THREE.MathUtils.randFloat(0.08, 0.2);
    this.pivot.rotation.x += THREE.MathUtils.randFloat(-0.04, 0.04);

    this.coreLight.intensity = 2.7;
    this.rimLight.intensity = 2.0;

    setTimeout(() => {
      this.coreLight.intensity = 1.9;
      this.rimLight.intensity = 1.6;
    }, 180);
  }

  private resizeRendererToContainer(): void {
    if (!this.renderer || !this.camera || !this.sceneContainer) return;

    const rect = this.sceneContainer.nativeElement.getBoundingClientRect();
    const width = Math.max(Math.round(rect.width), 32);
    const height = Math.max(Math.round(rect.height), 32);

    this.renderer.setSize(width, height, false);
    this.renderer.setViewport(0, 0, width, height);
    this.renderer.setScissor(0, 0, width, height);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    if (this.pivot) {
      this.fitCameraToPivot();
    }
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);

    this.pivot.rotation.z += 0.0015;
    this.pivot.rotation.y += 0.0012;

    if (this.stars) {
      this.stars.rotation.y += 0.00025;
    }

    this.rotationChange.emit({
      x: this.pivot.rotation.x,
      y: this.pivot.rotation.y,
      z: this.pivot.rotation.z
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private onResize = (): void => {
    this.resizeRendererToContainer();
  };
}