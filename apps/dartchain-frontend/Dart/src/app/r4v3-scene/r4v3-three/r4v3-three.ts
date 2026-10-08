import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { hexToThree } from '../../core/constants/palette';
import {
  LOGO_HOLO,
  LOGO_HOLO_EMISSIVE_HEX,
  LOGO_HOLO_SHEEN_HEX,
  addLogoHoloLights,
  createLogoHoloMaterial,
  logoHoloPaletteVariant,
  tickLogoHoloAppearance,
  type LogoHoloCenterDarkUniforms,
} from '../../shared/logo-stl-viewer/logo-stl-holo';
import {
  bindContainerResize,
  type ContainerResizeBinding,
  readContainerSize,
} from '../../core/utils/three-container.util';
import {
  applyCanvasLayerStyles,
  createWebGlRenderer,
} from '../../core/utils/three-webgl.util';
import {
  bindWebGlVisibilityPause,
  shouldAnimateWebGl,
} from '../../core/utils/three-animation.util';

const LOGO_STL_PATHS = ['assets/logo.stl', 'logo.stl'] as const;

@Component({
  selector: 'app-r4v3-three',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './r4v3-three.html',
  styleUrl: './r4v3-three.css'
})
export class R4v3ThreeComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('logoContainer', { static: true })
  logoContainer!: ElementRef<HTMLDivElement>;

  @Input() externalRotation?: { x: number; y: number; z: number };
  /** Taille cible du mesh STL (navbar ~9, faucet ~11). */
  @Input() modelTargetSize = 10;
  /** Marge caméra — plus haut = mesh moins zoomé, entier en rotation. */
  @Input() cameraFitFactor = 1.72;
  /** Décale le mesh vers la gauche du viewport (0–1 × largeur du modèle). */
  @Input() frameBiasX = 0;
  /** Décale le mesh verticalement dans le viewport (0–1 × hauteur du modèle). */
  @Input() frameBiasY = 0;
  /** Rotation à la souris / touch (navbar). */
  @Input() enableOrbit = true;
  /** `navbar` : face caméra + spin sur axe Y centré ; `default` : inclinaison vitrine. */
  @Input() presentation: 'default' | 'navbar' = 'default';

  @Output() logoTapped = new EventEmitter<void>();

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private pivot!: THREE.Group;
  /** Axe de rotation idle / kick (Y world, centre géométrique). */
  private spinGroup!: THREE.Group;
  private mesh?: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  private presentationRotation!: THREE.Euler;
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

  private electricClickIndex = 0;
  private controlsActive = false;
  private pointerStart = { x: 0, y: 0 };
  private pointerDidDrag = false;
  private readonly dragThresholdSq = 36;

  private readonly idleSpinSpeed = 0.0105;
  private readonly orbitTarget = new THREE.Vector3();
  private animating = false;
  private visibilityBinding?: { unsubscribe: () => void };
  private resizeBinding?: ContainerResizeBinding;

  private readonly hostRef = inject(ElementRef<HTMLElement>);
  constructor(private ngZone: NgZone) {}

  private resolvePresentationRotation(): THREE.Euler {
    if (this.presentation === 'navbar') {
      return new THREE.Euler(-0.12, 0.38, 0, 'XYZ');
    }
    return new THREE.Euler(-0.95, 0.42, 0.18, 'XYZ');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['externalRotation'] && this.pivot && this.externalRotation) {
      this.pivot.rotation.set(
        this.externalRotation.x,
        this.externalRotation.y,
        this.externalRotation.z
      );
    }

    if (
      this.mesh &&
      this.pivot &&
      (changes['frameBiasX'] ||
        changes['frameBiasY'] ||
        changes['cameraFitFactor'] ||
        changes['modelTargetSize'] ||
        changes['presentation'])
    ) {
      this.fitCameraToPivot();
    }

    if (changes['presentation'] && this.mesh) {
      this.presentationRotation = this.resolvePresentationRotation();
      this.mesh.rotation.copy(this.presentationRotation);
      this.fitCameraToPivot();
    }

    if (changes['enableOrbit'] && this.controls) {
      this.controls.enabled = this.enableOrbit;
    }
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      try {
        this.initScene();
        this.initLights();
        this.initControls();
        this.initPivot();
        this.addPlaceholderMesh();
        this.loadLogoModel();
        this.resizeRendererToContainer();
        this.renderFrame();
        this.bindEvents();
        this.visibilityBinding = bindWebGlVisibilityPause(
          () => this.pauseAnimation(),
          () => this.resumeAnimation()
        );
        this.resumeAnimation();
      } catch (error) {
        console.error('[r4v3-three] Initialisation impossible.', error);
      }
    });
  }

  ngOnDestroy(): void {
    this.visibilityBinding?.unsubscribe();
    this.resizeBinding?.unsubscribe();
    this.pauseAnimation();

    const canvas = this.renderer?.domElement;
    if (canvas) {
      canvas.removeEventListener('pointerdown', this.onPointerDown);
      canvas.removeEventListener('pointermove', this.onPointerMove);
      canvas.removeEventListener('pointerup', this.onPointerUp);
      canvas.removeEventListener('pointercancel', this.onPointerUp);
    }

    this.controls?.dispose();

    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }

    this.scene?.clear();
    this.renderer?.dispose();
    this.holoClock.dispose();
  }

  randomizeFromParentClick(): void {
    this.changeLogoPalette();
    this.kickLogoRotation();
  }

  /** Impulse de spin — idle = Y ; Acheter utilise l'autre axe (X). */
  kickSpin(axis: 'x' | 'y' | 'z' = 'y'): void {
    if (!this.spinGroup) return;
    const impulse = THREE.MathUtils.randFloat(Math.PI * 0.85, Math.PI * 1.35);
    this.spinGroup.rotation[axis] += impulse;
    if (this.mesh) {
      this.coreLight.intensity = 4.8;
      this.rimLight.intensity = 3.6;
      this.mesh.material.emissiveIntensity = 1.5;
      setTimeout(() => {
        if (!this.mesh) return;
        this.mesh.material.emissiveIntensity = 1.35;
        this.coreLight.intensity = 4.2;
        this.rimLight.intensity = 3.2;
      }, 220);
    }
  }

  private initScene(): void {
    const host = this.logoContainer.nativeElement;
    const { width, height } = readContainerSize(this.hostRef.nativeElement);

    const created = createWebGlRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });
    if (!created) {
      throw new Error('WebGL indisponible');
    }

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 5000);
    this.camera.position.set(0, 0, 30);

    this.renderer = created.renderer;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.setClearColor(0x0d0630, 0);

    const rendererWithColorSpace = this.renderer as THREE.WebGLRenderer & {
      outputColorSpace?: THREE.ColorSpace;
    };

    if ('outputColorSpace' in rendererWithColorSpace) {
      rendererWithColorSpace.outputColorSpace = THREE.SRGBColorSpace;
    }

    applyCanvasLayerStyles(created.canvas, 'logo');
    host.innerHTML = '';
    host.appendChild(created.canvas);
  }

  private addPlaceholderMesh(): void {
    const geometry = new THREE.IcosahedronGeometry(4.5, 1);
    const { material } = createLogoHoloMaterial(THREE);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.copy(this.presentationRotation);
    this.mesh.scale.setScalar(Math.max(0.8, this.modelTargetSize / 10));
    this.spinGroup.add(this.mesh);
    this.applyPalette(logoHoloPaletteVariant(0), false);
    this.resetOrbitToFrontView();
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

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = this.enableOrbit;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.enableRotate = this.enableOrbit;
    this.controls.rotateSpeed = 0.65;
    this.controls.minPolarAngle = Math.PI * 0.22;
    this.controls.maxPolarAngle = Math.PI * 0.78;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.controls.addEventListener('start', () => {
      this.controlsActive = true;
    });
    this.controls.addEventListener('end', () => {
      this.controlsActive = false;
    });
  }

  private initPivot(): void {
    this.presentationRotation = this.resolvePresentationRotation();
    this.pivot = new THREE.Group();
    this.pivot.position.set(0, 0, 0);
    this.spinGroup = new THREE.Group();
    this.spinGroup.position.set(0, 0, 0);
    this.pivot.add(this.spinGroup);
    this.scene.add(this.pivot);
  }

  private loadLogoModel(pathIndex = 0): void {
    const loader = new STLLoader();
    const path = LOGO_STL_PATHS[pathIndex] ?? LOGO_STL_PATHS[0];

    loader.load(
      path,
      (geometry) => {
        if (!this.spinGroup) return;

        if (this.mesh) {
          this.spinGroup.remove(this.mesh);
          this.mesh.geometry.dispose();
          this.mesh.material.dispose();
        }

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
        this.mesh.rotation.copy(this.presentationRotation);

        const radius = Math.max(sphere.radius, 1);
        const targetSize = Math.max(8, this.modelTargetSize);
        const scale = targetSize / (radius * 2);

        this.mesh.scale.setScalar(scale);
        this.spinGroup.rotation.set(0, 0, 0);
        this.spinGroup.add(this.mesh);

        this.applyPalette(logoHoloPaletteVariant(0), false);
        this.resetOrbitToFrontView();
        this.resizeRendererToContainer();
        this.renderFrame();
      },
      undefined,
      () => {
        if (pathIndex + 1 < LOGO_STL_PATHS.length) {
          this.loadLogoModel(pathIndex + 1);
          return;
        }

        console.warn('[r4v3-three] Impossible de charger le modèle STL du logo.');
      }
    );
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

  /** Centre monde du mesh (cible OrbitControls = axe de rotation). */
  private syncOrbitTarget(): THREE.Vector3 {
    const root = this.spinGroup ?? this.pivot;
    if (!root) return this.orbitTarget.set(0, 0, 0);

    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getCenter(this.orbitTarget);
    box.getSize(size);

    if (this.frameBiasX !== 0) {
      this.orbitTarget.x += size.x * this.frameBiasX * 0.22;
    }

    if (this.frameBiasY !== 0) {
      this.orbitTarget.y += size.y * this.frameBiasY;
    }

    return this.orbitTarget;
  }

  private fitCameraDistance(): number {
    const root = this.spinGroup ?? this.pivot;
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxSize = Math.max(size.x, size.y, size.z, 0.001);
    const fitHeightDistance =
      maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)));
    const fitWidthDistance = fitHeightDistance / this.camera.aspect;
    return this.cameraFitFactor * Math.max(fitHeightDistance, fitWidthDistance);
  }

  /** Cadrage face caméra + cible orbit sur le centre du gem. */
  private resetOrbitToFrontView(): void {
    if (!this.camera || !this.controls) return;

    const target = this.syncOrbitTarget();
    const distance = this.fitCameraDistance();
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(this.spinGroup ?? this.pivot).getSize(size);

    const cameraOffsetX =
      this.frameBiasX !== 0 ? size.x * this.frameBiasX * 0.35 : 0;

    this.camera.position.set(
      target.x + cameraOffsetX,
      target.y,
      target.z + distance
    );
    this.camera.near = 0.1;
    this.camera.far = Math.max(1000, distance * 20);
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();

    this.controls.target.copy(target);
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.update();
  }

  private fitCameraToPivot(): void {
    this.resetOrbitToFrontView();
  }

  private bindEvents(): void {
    this.resizeBinding = bindContainerResize(
      this.hostRef.nativeElement,
      (width, height) => this.applyRendererSize(width, height)
    );

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.pointerDidDrag = false;
  };

  private onPointerMove = (event: PointerEvent): void => {
    const dx = event.clientX - this.pointerStart.x;
    const dy = event.clientY - this.pointerStart.y;
    if (dx * dx + dy * dy > this.dragThresholdSq) {
      this.pointerDidDrag = true;
    }
  };

  private onPointerUp = (): void => {
    if (this.pointerDidDrag) return;

    this.changeLogoPalette();
    this.kickLogoRotation();
    this.logoTapped.emit();
  };

  private changeLogoPalette(): void {
    if (!this.mesh) return;

    this.electricClickIndex =
      (this.electricClickIndex + 1) % LOGO_HOLO_EMISSIVE_HEX.length;
    this.applyPalette(logoHoloPaletteVariant(this.electricClickIndex), true);
  }

  private kickLogoRotation(): void {
    if (!this.spinGroup || !this.mesh) return;

    this.spinGroup.rotation.y += THREE.MathUtils.randFloat(0.35, 0.75);

    this.coreLight.intensity = 4.8;
    this.rimLight.intensity = 3.6;
    this.mesh.material.emissiveIntensity = 1.5;

    setTimeout(() => {
      this.mesh!.material.emissiveIntensity = 1.35;
      this.coreLight.intensity = 4.2;
      this.rimLight.intensity = 3.2;
    }, 220);
  }

  private resizeRendererToContainer(): void {
    if (!this.renderer || !this.camera) return;

    const { width, height } = readContainerSize(this.hostRef.nativeElement);
    this.applyRendererSize(width, height);
  }

  private applyRendererSize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;

    this.renderer.setSize(width, height, false);
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
      this.controls.update();
      this.renderFrame();
      return;
    }

    if (!this.externalRotation && this.spinGroup && !this.controlsActive) {
      this.spinGroup.rotation.y += this.idleSpinSpeed;
    }

    if (this.mesh && !this.controlsActive) {
      this.mesh.rotation.x = THREE.MathUtils.lerp(
        this.mesh.rotation.x,
        this.presentationRotation.x,
        0.08
      );
      this.mesh.rotation.y = THREE.MathUtils.lerp(
        this.mesh.rotation.y,
        this.presentationRotation.y,
        0.08
      );
      this.mesh.rotation.z = THREE.MathUtils.lerp(
        this.mesh.rotation.z,
        this.presentationRotation.z,
        0.08
      );
    }

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
    this.renderFrame();
  };

  private renderFrame(): void {
    if (!this.renderer || !this.scene || !this.camera) {
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private pauseAnimation(): void {
    this.renderFrame();

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

}