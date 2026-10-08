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
  THREE_SCENE_CLEAR_LIGHT,
  hexToThree,
} from '../core/constants/palette';
import {
  LOGO_HOLO,
  LOGO_HOLO_EMISSIVE_HEX,
  LOGO_HOLO_SHEEN_HEX,
  addLogoHoloLights,
  createLogoHoloMaterial,
  logoHoloPaletteVariant,
  tickLogoHoloAppearance,
  type LogoHoloCenterDarkUniforms,
} from '../shared/logo-stl-viewer/logo-stl-holo';
import {
  bindWebGlVisibilityPause,
  shouldAnimateWebGl,
} from '../core/utils/three-animation.util';

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
  private fillLight?: THREE.DirectionalLight;
  private rimLightB?: THREE.PointLight;
  private holoCenterDark?: LogoHoloCenterDarkUniforms;
  private holoEmissiveStops: THREE.Color[] = [];
  private holoSheenStops: THREE.Color[] = [];
  private holoScratchA = new THREE.Color();
  private holoScratchB = new THREE.Color();
  private holoEdgeBright = new THREE.Color(LOGO_HOLO.edgeBright);
  private holoEdgeGlow = new THREE.Color(LOGO_HOLO.edgeGlow);
  private readonly holoClock = new THREE.Timer();

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private paletteIndex = 0;
  private animating = false;
  private visibilityBinding?: { unsubscribe: () => void };

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
      this.visibilityBinding = bindWebGlVisibilityPause(
        () => this.pauseAnimation(),
        () => this.resumeAnimation()
      );
      this.resumeAnimation();
    });
  }

  ngOnDestroy(): void {
    this.visibilityBinding?.unsubscribe();
    this.pauseAnimation();
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
    this.holoClock.dispose();
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
    const lights = addLogoHoloLights(THREE, this.scene, 28);
    this.ambientLight = lights.ambient;
    this.frontLight = lights.key;
    this.fillLight = lights.fill;
    this.rimLight = lights.rimA;
    this.rimLightB = lights.rimB;
    this.coreLight = lights.core;
    this.holoEmissiveStops = LOGO_HOLO_EMISSIVE_HEX.map((hex) => new THREE.Color(hexToThree(hex)));
    this.holoSheenStops = LOGO_HOLO_SHEEN_HEX.map((hex) => new THREE.Color(hexToThree(hex)));
    this.holoClock.connect(document);
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
      color: 0xede7d9,
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

        const { material, centerDark } = createLogoHoloMaterial(THREE, geometry);
        this.holoCenterDark = centerDark;

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 0, 0);
        this.mesh.rotation.set(-0.95, 0.42, 0.18);

        const radius = Math.max(sphere.radius, 1);
        const targetSize = 20;
        const scale = targetSize / (radius * 2);

        this.mesh.scale.setScalar(scale);
        this.pivot.add(this.mesh);
        this.applyPalette(logoHoloPaletteVariant(0), false);

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

    this.paletteIndex = (this.paletteIndex + 1) % LOGO_HOLO_EMISSIVE_HEX.length;
    this.applyPalette(logoHoloPaletteVariant(this.paletteIndex), true);
  }

  private applyPalette(
    palette: ReturnType<typeof logoHoloPaletteVariant>,
    electricBoost: boolean
  ): void {
    if (!this.mesh) return;

    this.mesh.material.color.setHex(palette.color);
    this.mesh.material.emissive.setHex(palette.emissive);
    this.mesh.material.emissiveIntensity = electricBoost ? 1.15 : 0.7;
    this.holoEdgeBright.setHex(palette.color);
    this.holoEdgeGlow.setHex(palette.emissive);
    this.rimLight.color.setHex(palette.rim);
    this.coreLight.color.setHex(palette.core);
    if (this.rimLightB) this.rimLightB.color.setHex(LOGO_HOLO.rimB);
    this.mesh.material.needsUpdate = true;

    this.coreLight.intensity = electricBoost ? 3.6 : 2.55;
    this.rimLight.intensity = electricBoost ? 2.8 : 2.15;
  }

  private kickLogoRotation(): void {
    this.pivot.rotation.z += THREE.MathUtils.randFloat(0.12, 0.28);
    this.pivot.rotation.y += THREE.MathUtils.randFloat(0.08, 0.2);
    this.pivot.rotation.x += THREE.MathUtils.randFloat(-0.04, 0.04);

    this.coreLight.intensity = 3.2;
    this.rimLight.intensity = 2.6;

    setTimeout(() => {
      this.coreLight.intensity = 2.55;
      this.rimLight.intensity = 2.15;
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

  private animate = (now = performance.now()): void => {
    if (!this.animating) {
      return;
    }

    this.frameId = requestAnimationFrame(this.animate);
    this.holoClock.update(now);

    if (!shouldAnimateWebGl()) {
      return;
    }

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

    if (this.mesh) {
      tickLogoHoloAppearance({
        material: this.mesh.material,
        centerDark: this.holoCenterDark,
        emissiveStops: this.holoEmissiveStops,
        sheenStops: this.holoSheenStops,
        scratchA: this.holoScratchA,
        scratchB: this.holoScratchB,
        edgeBright: this.holoEdgeBright,
        edgeGlow: this.holoEdgeGlow,
        elapsed: this.holoClock.getElapsed(),
        bright: 0.62,
      });
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private pauseAnimation(): void {
    this.animating = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  private resumeAnimation(): void {
    if (this.animating) {
      return;
    }

    this.animating = true;
    this.animate();
  }

  private onResize = (): void => {
    this.resizeRendererToContainer();
  };
}