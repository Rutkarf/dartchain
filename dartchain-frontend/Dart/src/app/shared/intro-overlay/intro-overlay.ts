import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import * as THREE from 'three';
import { LogoStlCacheService } from '../logo-stl-viewer/logo-stl-cache.service';
import { LogoRelayService } from '../logo-relay/logo-relay.service';
import { IntroService } from './intro.service';
import { AgeGateService } from '../age-call-gate/age-gate.service';
import { AgeIntroHandoffService } from '../age-call-gate/age-intro-handoff.service';
import { OnboardingTourService } from '../onboarding-tour/onboarding-tour.service';
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
import { LOGO_TIP6_EULER, LOGO_TIP6_PITCH } from '../logo-stl-viewer/logo-stl-orient';

/** Teinte brouillard alignée sur l’atmosphère d’appel (pas de noir plein). */
const FOG = 0x0d0630;
const PARTICLE_OPACITY = 0.58;
/** Durée traveling zoom → dézoom (sync age-call FLIGHT_MS) — un cran plus long = fluidité. */
const BRIDGE_CAM_MS = 2400;
/**
 * Micro-sync frame (pas un hold perceptible) — le dézoom part tout de suite.
 * Ancien 0.22 ≈ 440 ms d’immobilisation ultra-zoom (= bug ressenti).
 */
const BRIDGE_HOLD = 0.03;

type Phase =
  | 'idle'
  | 'load'
  | 'insert'
  | 'moon'
  | 'recede'
  | 'to-header'
  | 'tour-handoff'
  | 'exit';

/** Suite du décollage token une fois le boost lancé. */
const MOON_MS = 1250;
/**
 * Pad token façon fusée : caméra fixe, logo face-caméra, marges L/R.
 * L’envol « page » est surtout CSS (pas de coupe canvas en plein vol).
 */
const TOKEN_REST_Y = -0.35;
const TOKEN_PAD_W = 220;
const TOKEN_PAD_H = 220;
const TOKEN_CAM_Y = 0.08;
const TOKEN_LOOK_Y = -0.12;
const TOKEN_CAM_Z = 4.2;
/** Petite montée 3D locale (étincelles) — le vrai décollage est CSS. */
const TOKEN_CLIMB_INSERT = 0.42;
const TOKEN_CLIMB_MOON = 0.95;
/** Pose pad : slerp depuis le traveling → tip-6h (pas de snap à plat au centre). */
/** Settle décrocher → pad : un peu plus court pour enchaîner le spin sans pause. */
const COIN_PARK_MS = 820;

/**
 * Intro : loader → lancement token (logo.stl) → rideau → caméra qui plonge.
 */
@Component({
  selector: 'app-intro-overlay',
  standalone: true,
  templateUrl: './intro-overlay.html',
  styleUrl: './intro-overlay.scss',
})
export class IntroOverlay implements AfterViewInit, OnDestroy {
  @ViewChild('gl') private glRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('coin') private coinRef?: ElementRef<HTMLDivElement>;
  @ViewChild('hintPad') private hintPadRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('traveler') private travelerRef?: ElementRef<HTMLDivElement>;

  private readonly cache = inject(LogoStlCacheService);
  private readonly intro = inject(IntroService);
  private readonly ageGate = inject(AgeGateService);
  protected readonly handoff = inject(AgeIntroHandoffService);
  private readonly relay = inject(LogoRelayService);
  private readonly tour = inject(OnboardingTourService);
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly visible = signal(false);
  protected readonly fontsIn = signal(false);
  protected readonly ready = signal(false);
  protected readonly inserting = signal(false);
  protected readonly moonBoost = signal(false);
  /** Décollage CSS en cours (insert + moon) — ne pas reset le transform entre les phases. */
  protected readonly launching = signal(false);
  protected readonly receding = signal(false);
  protected readonly toHeader = signal(false);
  /** Handoff Feed The R4V3 → tutoriel hub (pas de vol logo). */
  protected readonly tourHandoff = signal(false);
  protected readonly powerOn = signal(false);
  protected readonly exiting = signal(false);
  protected readonly progress = signal(8);
  /** Jeton déjà posé après le vol depuis l’appel d’âge. */
  protected readonly coinParked = signal(false);
  /** Dernière phase du pont : coin pad en fondu pendant que le mesh GL s’efface. */
  protected readonly bridgeSettle = signal(false);
  /** Survol / armement tactile du bouton Feed. */
  protected readonly feedHover = signal(false);
  private feedPointerId: number | null = null;

  private phase: Phase = 'idle';
  private disposed = false;
  private frameId = 0;
  private clock = new THREE.Timer();
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private pivot?: THREE.Group;
  private mesh?: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  private holoCenterDark?: LogoHoloCenterDarkUniforms;
  private holoEmissiveStops: THREE.Color[] = [];
  private holoSheenStops: THREE.Color[] = [];
  private holoScratchA = new THREE.Color();
  private holoScratchB = new THREE.Color();
  private holoEdgeBright = new THREE.Color(LOGO_HOLO.edgeBright);
  private holoEdgeGlow = new THREE.Color(LOGO_HOLO.edgeGlow);
  private coinHoloCenterDark?: LogoHoloCenterDarkUniforms;
  private coinMesh?: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  private coinPivot?: THREE.Group;
  /** Groupe token + FX (étincelles / propulsion). */
  private coinLaunch?: THREE.Group;
  private coinRenderer?: THREE.WebGLRenderer;
  private coinScene?: THREE.Scene;
  private coinCamera?: THREE.PerspectiveCamera;
  private particles?: THREE.Points;
  private tokenStars?: THREE.Points;
  private tokenIdleSparks?: THREE.Points;
  /** Étincelles sur le mesh GL pendant le pont appel → Feed. */
  private bridgeSparks?: THREE.Points;
  private bridgeSparkVel: Float32Array<ArrayBufferLike> = new Float32Array(0);
  private starVel = new Float32Array(0);
  private idleSparkVel: Float32Array<ArrayBufferLike> = new Float32Array(0);
  private nozzleEmbers: THREE.Mesh[] = [];
  /** Apparition progressive des étincelles de propulsion. */
  private starReveal = 0;
  /** Boost étincelles à l’arrivée pad (1 → 0 une fois le token centré). */
  private sparkArrivalBoost = 0;
  private scFollowRaf = 0;
  private emberVel = new Float32Array(0);
  /** Slerp pad : orientation traveler → tip-6h pendant le settle. */
  private coinParkSettling = false;
  private coinParkSettleStart = 0;
  private readonly coinParkQuatFrom = new THREE.Quaternion();
  private readonly coinParkQuatTo = new THREE.Quaternion();
  private coinParkFromPitch = -0.35;
  private coinParkFromX = 0.03;
  private coinParkFromY = TOKEN_REST_Y + 0.28;
  private coinParkScaleFrom = 1.18;
  private coinMeshBaseScale = 1;
  private insertStart = 0;
  private moonStart = 0;
  private recedeT = 0;
  private recedeHold = 0;
  private headerT = 0;
  private headerFrom = { x: 0, y: 0, s: 240 };
  private headerTo = { x: 28, y: 28, s: 38 };
  private handoffT = 0;
  private handoffFrom = { x: 0, y: 0, s: 240 };
  private handoffTo = { x: 0, y: 0, s: 68 };
  /** Tour déjà démarré pendant le handoff (évite double start dans finish). */
  private tourStartedFromHandoff = false;
  private lastPose = { x: 0, y: 0, s: 240 };
  private travelerGeo?: THREE.BufferGeometry;
  private mouse = new THREE.Vector2();
  private mouseSmooth = new THREE.Vector2();
  private camCoin = new THREE.Vector3(0.15, 0.55, 4.6);
  private lookCoin = new THREE.Vector3(0, 0.15, 0);
  /** Gros plan collé au token (marge L/R — pas de coupe). */
  private bridgeCamFrom = new THREE.Vector3(0.42, 0.18, 2.45);
  /** Point haut de l’arc caméra — moins excentré pour un traveling plus fluide. */
  private bridgeCamMid = new THREE.Vector3(0.58, 0.48, 3.35);
  private bridgeLookFrom = new THREE.Vector3(0, 0.1, 0);
  private camFrom = new THREE.Vector3(-5.2, 10.5, 16);
  private camTo = new THREE.Vector3(0.38, 0.48, 3.7);
  private lookFrom = new THREE.Vector3(0.4, -0.2, -1.2);
  private lookTo = new THREE.Vector3(0, 0, 0);
  private camPos = this.camCoin.clone();
  private camLook = this.lookCoin.clone();
  private bridgeCamStart = 0;
  private bridgeMeshArmed = false;
  private bridgeFovFrom = 52;
  private bridgeFovTo = 42;
  private meshBase = 1;
  private readonly bridgeLookTarget = new THREE.Vector3();
  private readonly bridgeCamScratch = new THREE.Vector3();
  private bridgeExposureBase = 1.05;
  /** Catch-light lissé (continuité flare appel → Feed). */
  private bridgeBrightSmooth = 0.7;
  private exitTimer = 0;
  private progressTimer = 0;
  private launched = false;
  private warmStarted = false;
  private booting = false;
  private booted = false;
  private loopOn = false;
  private sidesReady = false;
  private bridgeSettled = false;
  private parkFlip = false;
  private pixelScale = 1;
  private readonly viewReady = signal(false);
  private readonly onResize = () => this.resize();

  constructor() {
    this.clock.connect(document);
    if (this.intro.shouldPlay(this.router.url)) {
      this.relay.armForIntro();
    }
    effect(() => {
      if (this.handoff.landed()) {
        untracked(() => {
          this.coinParked.set(true);
          // Étincelles encore présentes à l’arrivée → fondu jusqu’à 0 (avant Feed click).
          if (this.sparkArrivalBoost < 0.35) this.sparkArrivalBoost = 1;
          this.syncFeedStarConquestBand();
        });
      }
    });
    effect(() => {
      // Scène Feed parked : coin visible, hors pont / insert.
      const feedReady =
        (this.coinParked() || this.ready()) &&
        this.visible() &&
        this.fontsIn() &&
        !this.handoff.flying() &&
        !this.inserting() &&
        !this.launching() &&
        !this.receding() &&
        !this.exiting();
      if (feedReady) untracked(() => this.syncFeedStarConquestBand());
    });
    effect(() => {
      const ready = this.viewReady();
      const ageOk = this.ageGate.passed();
      const gateBusy = this.ageGate.active();
      if (!ready || this.disposed) return;
      // Prépare WebGL pendant l’appel, avant le clic vert — le vol ne paie plus le chargement.
      if (!this.warmStarted && !this.launched) {
        untracked(() => this.scheduleWarm());
      }
      if (!ageOk || gateBusy || this.launched) return;
      untracked(() => this.launchIntro());
    });
  }

  ngAfterViewInit(): void {
    if (!this.intro.shouldPlay(this.router.url)) {
      this.intro.skipMark();
      return;
    }
    this.viewReady.set(true);
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('intro-token-entering');
    this.clearFeedStarConquestBand();
    this.teardown();
    if (this.intro.playing()) this.intro.complete();
  }

  /** WebGL + shaders pendant que l’appel sonne, sans boucle de rendu. */
  private scheduleWarm(): void {
    if (this.warmStarted || this.launched || this.disposed) return;
    this.warmStarted = true;
    const start = () => {
      if (this.disposed || this.booted || this.booting) return;
      this.zone.runOutsideAngular(() => this.boot());
    };
    const ric = window.requestIdleCallback;
    if (typeof ric === 'function') ric(() => start(), { timeout: 650 });
    else window.setTimeout(start, 280);
  }

  private launchIntro(): void {
    if (this.launched || this.disposed) return;
    this.launched = true;
    this.zone.run(() => {
      this.visible.set(true);
      this.intro.begin();
      this.relay.armForIntro();
      this.phase = 'load';
      this.cdr.detectChanges();
    });

    this.zone.runOutsideAngular(() => {
      if (this.booted) {
        this.onLaunchedGl();
        this.ensureLoop();
        return;
      }
      if (!this.booting) {
        this.warmStarted = true;
        this.boot();
      }
    });
  }

  private onLaunchedGl(): void {
    this.showHudSoon();
    if (!this.ready()) this.fakeProgress();
  }

  private ensureLoop(): void {
    if (this.loopOn || this.disposed || !this.renderer) return;
    this.loopOn = true;
    this.zone.runOutsideAngular(() => this.animate());
  }

  @HostListener('window:resize')
  onFeedScResize(): void {
    if (document.documentElement.classList.contains('intro-feed-sc')) {
      this.syncFeedStarConquestBand();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.visible() || this.exiting()) return;
    if ((event.key === 'Enter' || event.key === ' ') && this.ready() && this.phase === 'load') {
      event.preventDefault();
      this.startInsert();
    }
  }

  protected onFeedPointerEnter(event: PointerEvent): void {
    if (!this.ready() || this.inserting() || this.moonBoost()) return;
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      this.feedHover.set(true);
    }
  }

  protected onFeedPointerLeave(event: PointerEvent): void {
    this.feedHover.set(false);
    if (this.feedPointerId === event.pointerId) {
      this.releaseFeedPointer(event);
    }
  }

  protected onFeedPointerDown(event: PointerEvent): void {
    if (!this.ready() || this.inserting() || this.moonBoost()) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    this.feedHover.set(true);
    this.feedPointerId = event.pointerId;
    try {
      (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    } catch {
      /* ignore */
    }
  }

  protected onFeedPointerUp(event: PointerEvent): void {
    if (this.feedPointerId !== event.pointerId) return;
    this.releaseFeedPointer(event);
    this.startInsert(event);
  }

  protected onFeedPointerCancel(event: PointerEvent): void {
    if (this.feedPointerId === event.pointerId) {
      this.releaseFeedPointer(event);
    } else {
      this.feedHover.set(false);
    }
  }

  private releaseFeedPointer(event: PointerEvent): void {
    this.feedPointerId = null;
    this.feedHover.set(false);
    try {
      (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
    } catch {
      /* ignore */
    }
  }

  protected startInsert(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.phase !== 'load' || !this.ready() || this.inserting()) return;
    this.beginInsert();
  }

  private boot(): void {
    if (this.disposed || this.booted || this.booting) return;
    const canvas = this.glRef?.nativeElement;
    if (!canvas) {
      if (this.launched) this.finish(true);
      return;
    }
    this.booting = true;

    const scene = new THREE.Scene();
    // Fond CSS (appel + grille) visible derrière — pas de clear noir.
    scene.background = null;
    scene.fog = new THREE.FogExp2(FOG, 0.028);
    this.scene = scene;

    const startWide = this.handoff.flying();
    const camera = new THREE.PerspectiveCamera(
      startWide ? this.bridgeFovFrom : this.bridgeFovTo,
      this.aspect(),
      0.1,
      200,
    );
    if (startWide) {
      // Gros plan prêt — le chrono démarre quand le mesh STL est armé.
      this.camPos.copy(this.bridgeCamFrom);
      this.camLook.copy(this.bridgeLookFrom);
      camera.position.copy(this.bridgeCamFrom);
      camera.lookAt(this.bridgeLookFrom);
    } else {
      camera.position.copy(this.camCoin);
      camera.lookAt(this.lookCoin);
    }
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    // Buffer plafonné : le vol reste net en 1080p et ne sature pas un écran 4K.
    this.pixelScale = this.surfaceScale(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(this.pixelScale);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x0d0630, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = this.bridgeExposureBase;
    this.renderer = renderer;

    addLogoHoloLights(THREE, scene, 1);
    this.holoEmissiveStops = LOGO_HOLO_EMISSIVE_HEX.map((hex) => new THREE.Color(hexToThree(hex)));
    this.holoSheenStops = LOGO_HOLO_SHEEN_HEX.map((hex) => new THREE.Color(hexToThree(hex)));

    const pivot = new THREE.Group();
    scene.add(pivot);
    this.pivot = pivot;

    this.spawnParticles(scene);
    // Pad token : différé après le pont (évite 2 WebGL simultanés).
    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('pointermove', this.onPointer, { passive: true });

    this.booting = false;
    this.booted = true;
    void this.loadLogo();
    if (this.launched) {
      this.onLaunchedGl();
      this.ensureLoop();
    }
  }

  private async loadLogo(): Promise<void> {
    try {
      this.zone.run(() => this.progress.set(36));
      const geometry = await this.cache.load();
      if (this.disposed || !this.pivot) {
        geometry.dispose();
        return;
      }
      const radius = Math.max(geometry.boundingSphere?.radius ?? 1, 1);
      const { material, centerDark } = createLogoHoloMaterial(THREE, geometry);
      this.holoCenterDark = centerDark;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.set(-0.55, 0.42, 0.12);
      this.meshBase = 1.7 / (radius * 2);
      mesh.scale.setScalar(this.meshBase * 1.8);
      mesh.position.y = 0;
      mesh.visible = false;
      mesh.frustumCulled = true;
      this.pivot.add(mesh);
      this.mesh = mesh;
      // Même buffer que le gros plan — pas de second clone 162k au moment du vol.
      this.travelerGeo = geometry;
      this.zone.run(() => {
        this.progress.set(100);
        this.ready.set(true);
      });
      if (!this.launched && this.renderer && this.scene && this.camera) {
        this.primeBridgePose();
        const mat = mesh.material;
        // Les deux variantes (opaque + fondu) sont compilées avant le clic.
        mat.transparent = true;
        mat.opacity = 1;
        const renderer = this.renderer;
        const scene = this.scene;
        const camera = this.camera;
        void renderer.compileAsync(scene, camera).then(() => {
          if (this.disposed || this.renderer !== renderer) return;
          renderer.render(scene, camera);
          if (this.launched || this.bridgeMeshArmed) {
            this.ensureLoop();
            return;
          }
          mat.transparent = false;
          mat.depthWrite = true;
          mat.opacity = 1;
          renderer.render(scene, camera);
          this.scheduleSideWarm();
        });
      }
      if (this.launched) this.ensureLoop();
    } catch {
      if (this.launched) this.finish(true);
    }
  }

  private beginInsert(): void {
    if (this.phase !== 'load' || this.disposed) return;
    this.phase = 'insert';
    this.insertStart = performance.now();
    // SC suit le token vers le haut puis s’efface — pas de cut net.
    this.startStarConquestFollowUp();
    this.zone.run(() => {
      this.inserting.set(true);
      this.launching.set(true);
      this.ready.set(true);
    });
  }

  /** Boost token lancé : propulsion vers le haut, on enchaîne. */
  private beginMoon(): void {
    if (this.phase !== 'insert' || this.disposed) return;
    this.phase = 'moon';
    this.moonStart = performance.now();
    this.zone.run(() => {
      this.inserting.set(false);
      this.moonBoost.set(true);
      this.launching.set(true);
    });
  }

  /** Braises visibles, plus grosses que les points, sur les chapeaux. */
  private spawnEmbers(host: THREE.Group): void {
    const count = 12;
    this.emberVel = new Float32Array(count * 3);
    const geo = new THREE.SphereGeometry(0.07, 8, 6);
    for (let i = 0; i < count; i += 1) {
      const ember = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: i % 3 === 0 ? 0xede7d9 : i % 3 === 1 ? 0xd5a021 : 0xd5a021, // Blanc cassé / Jaune doré
          transparent: true,
          opacity: 0.95,
        }),
      );
      host.add(ember);
      this.nozzleEmbers.push(ember);
      this.placeEmber(i);
    }
  }

  private placeEmber(i: number): void {
    const ember = this.nozzleEmbers[i];
    if (!ember) return;
    const a = Math.random() * Math.PI * 2;
    const r = 0.16 + Math.random() * 0.14;
    ember.position.set(
      Math.cos(a) * r,
      -0.04 - Math.random() * 0.1,
      Math.sin(a) * r * 0.5 + 0.06,
    );
    ember.scale.setScalar(0.9 + Math.random() * 0.85);
    this.emberVel[i * 3] = Math.cos(a) * (0.4 + Math.random() * 0.7);
    this.emberVel[i * 3 + 1] = 0.04 + Math.random() * 0.28;
    this.emberVel[i * 3 + 2] = Math.sin(a) * (0.2 + Math.random() * 0.35);
    const mat = ember.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.95;
  }

  /** Étincelles locales, collées aux chapeaux arrière. */
  private makeNozzleSparks(count: number): {
    points: THREE.Points;
    vel: Float32Array<ArrayBufferLike>;
  } {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      this.seedNozzleSpark(i, pos, vel);
      const warm = Math.random();
      if (warm > 0.55) {
        col[i * 3] = 1;
        col[i * 3 + 1] = 0.42 + Math.random() * 0.2;
        col[i * 3 + 2] = 0.08;
      } else if (warm > 0.25) {
        col[i * 3] = 1;
        col[i * 3 + 1] = 0.72 + Math.random() * 0.2;
        col[i * 3 + 2] = 0.2;
      } else {
        col[i * 3] = 1;
        col[i * 3 + 1] = 0.92;
        col[i * 3 + 2] = 0.55 + Math.random() * 0.3;
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    return { points, vel };
  }

  private seedNozzleSpark(i: number, pos: Float32Array, vel: Float32Array): void {
    const a = Math.random() * Math.PI * 2;
    const r = 0.18 + Math.random() * 0.16;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = -0.12 - Math.random() * 0.14;
    pos[i * 3 + 2] = Math.sin(a) * r * 0.55 + (Math.random() - 0.5) * 0.06;
    vel[i * 3] = Math.cos(a) * (0.35 + Math.random() * 0.75);
    vel[i * 3 + 1] = -0.08 - Math.random() * 0.42;
    vel[i * 3 + 2] = Math.sin(a) * (0.25 + Math.random() * 0.45);
  }

  private disposeTokenFx(): void {
    for (const ember of this.nozzleEmbers) {
      ember.geometry.dispose();
      (ember.material as THREE.Material).dispose();
      ember.parent?.remove(ember);
    }
    if (this.tokenStars) {
      this.tokenStars.geometry.dispose();
      (this.tokenStars.material as THREE.Material).dispose();
      this.tokenStars.parent?.remove(this.tokenStars);
    }
    if (this.tokenIdleSparks) {
      this.tokenIdleSparks.geometry.dispose();
      (this.tokenIdleSparks.material as THREE.Material).dispose();
      this.tokenIdleSparks.parent?.remove(this.tokenIdleSparks);
    }
    this.disposeBridgeSparks();
    this.tokenStars = undefined;
    this.tokenIdleSparks = undefined;
    this.starReveal = 0;
    this.starVel = new Float32Array(0);
    this.idleSparkVel = new Float32Array(0);
    this.nozzleEmbers = [];
    this.emberVel = new Float32Array(0);
  }

  private mountCoinPreview(source: THREE.BufferGeometry): void {
    const host = this.coinRef?.nativeElement;
    if (!host || this.coinRenderer) return;

    const w = TOKEN_PAD_W;
    const h = TOKEN_PAD_H;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 40);
    camera.position.set(0, TOKEN_CAM_Y, TOKEN_CAM_Z);
    camera.lookAt(0, TOKEN_LOOK_Y, 0);
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
      stencil: false,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x0d0630, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    host.appendChild(canvas);

    addLogoHoloLights(THREE, scene, 1);

    const geo = source;
    const radius = Math.max(geo.boundingSphere?.radius ?? 1, 1);
    const { material, centerDark } = createLogoHoloMaterial(THREE, geo);
    this.coinHoloCenterDark = centerDark;
    const mesh = new THREE.Mesh(geo, material);
    // Pose tip-6h cible ; le settle depuis le traveling peut écraser avant le 1er paint.
    mesh.rotation.set(LOGO_TIP6_EULER.x, LOGO_TIP6_EULER.y, LOGO_TIP6_EULER.z);
    this.coinMeshBaseScale = 1.45 / (radius * 2);
    mesh.scale.setScalar(this.coinMeshBaseScale);
    const pivot = new THREE.Group();
    pivot.rotation.y = 0;
    pivot.add(mesh);

    const launch = new THREE.Group();
    launch.position.set(0, TOKEN_REST_Y, 0);
    launch.rotation.x = LOGO_TIP6_PITCH;
    launch.add(pivot);

    const idleSparks = this.makeNozzleSparks(48);
    launch.add(idleSparks.points);
    this.spawnEmbers(launch);

    const starCount = 64;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starVel = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const spread = 0.08 + Math.random() * 0.55;
      starPos[i * 3] = Math.cos(a) * spread * 0.35;
      starPos[i * 3 + 1] = -0.55 - Math.random() * 0.15;
      starPos[i * 3 + 2] = Math.sin(a) * spread * 0.35;
      starVel[i * 3] = Math.cos(a) * (0.35 + Math.random() * 0.9);
      starVel[i * 3 + 1] = -(0.55 + Math.random() * 1.6);
      starVel[i * 3 + 2] = Math.sin(a) * (0.35 + Math.random() * 0.9);
      const warm = Math.random();
      if (warm > 0.65) {
        starCol[i * 3] = 1;
        starCol[i * 3 + 1] = 0.85 + Math.random() * 0.15;
        starCol[i * 3 + 2] = 0.45 + Math.random() * 0.25;
      } else if (warm > 0.3) {
        starCol[i * 3] = 0.75 + Math.random() * 0.25;
        starCol[i * 3 + 1] = 0.9;
        starCol[i * 3 + 2] = 1;
      } else {
        starCol[i * 3] = 1;
        starCol[i * 3 + 1] = 1;
        starCol[i * 3 + 2] = 0.95 + Math.random() * 0.05;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 0.055,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    launch.add(stars);
    scene.add(launch);

    this.coinScene = scene;
    this.coinCamera = camera;
    this.coinRenderer = renderer;
    this.coinMesh = mesh;
    this.coinPivot = pivot;
    this.coinLaunch = launch;
    this.tokenStars = stars;
    this.tokenIdleSparks = idleSparks.points;
    this.idleSparkVel = idleSparks.vel;
    this.starVel = starVel;
  }

  private beginRecede(): void {
    this.disposeTokenFx();
    if (this.coinLaunch) this.coinLaunch.position.set(0, 0, 0);
    if (this.coinPivot) this.coinPivot.rotation.set(0, 0, 0);
    this.phase = 'recede';
    this.recedeT = 1; // pas d’anim traveler visible — le pad CSS a déjà disparu en haut
    this.recedeHold = 0;
    this.markOverlay('intro--recede');
    // Important : aucun mountTraveler / showTraveler ici (évite le pop logo.stl mid-écran).
    this.zone.run(() => {
      this.moonBoost.set(false);
      this.launching.set(false);
      this.receding.set(true);
      this.powerOn.set(false);
    });
  }

  private beginToHeader(): void {
    this.phase = 'to-header';
    this.headerT = 0;
    this.intro.revealPage();
    this.intro.revealHeader();
    const mark = this.relay.sourceEl();
    const r = mark?.getBoundingClientRect();
    const size = 38;
    const vw = window.innerWidth;
    this.headerFrom = { x: vw * 0.5, y: -size, s: size };
    this.headerTo = r
      ? { x: r.left + r.width / 2, y: r.top + r.height / 2, s: Math.max(r.width, 36) }
      : { x: 36, y: 28, s: 38 };
    this.markOverlay('intro--to-header');
    this.mountTraveler();
    this.showTraveler();
    this.poseTraveler(this.headerFrom.x, this.headerFrom.y, this.headerFrom.s, 1);
    this.zone.run(() => this.toHeader.set(true));
  }

  /**
   * Seule apparition logo.stl post-Feed : entre par le haut → sous pastille Live.
   */
  private beginTourHandoff(): void {
    this.phase = 'tour-handoff';
    this.handoffT = 0;
    document.documentElement.classList.add('intro-token-entering');
    // Hub révélé pour mesurer Live, logo navbar masqué via CSS pendant l’entrée.
    this.intro.revealPage();
    this.intro.revealHeader();
    const size = 40;
    const land = this.firstTourTokenPose(size);
    this.handoffFrom = {
      x: land.x,
      y: -size * 1.05,
      s: size,
    };
    this.handoffTo = land;
    this.markOverlay('intro--tour-handoff');
    this.mountTraveler();
    // Pose hors cadre AVANT is-live — évite un flash à (0,0) taille pad.
    this.poseTraveler(this.handoffFrom.x, this.handoffFrom.y, this.handoffFrom.s, 0);
    this.showTraveler();
    this.zone.run(() => {
      this.receding.set(false);
      this.tourHandoff.set(true);
    });
    if (this.prefersReducedMotion()) {
      this.poseTraveler(this.handoffTo.x, this.handoffTo.y, this.handoffTo.s, 1);
      this.completeTourHandoff();
    }
  }

  /**
   * Pose d’arrivée = token tutoriel sous la pastille Live (évite un 2ᵉ mouvement).
   */
  private firstTourTokenPose(size: number): { x: number; y: number; s: number } {
    const chip =
      document.querySelector('.network-trust-chip') ??
      document.querySelector('app-navbar-network-status');
    const r = chip?.getBoundingClientRect();
    if (r && r.width > 2 && r.height > 2) {
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height + 8 + size / 2,
        s: size,
      };
    }
    const vw = window.innerWidth;
    return {
      x: vw * 0.5,
      y: size * 0.75 + 10,
      s: size,
    };
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private beginExit(): void {
    if (this.phase === 'exit') return;
    this.phase = 'exit';
    this.zone.run(() => this.exiting.set(true));
    this.exitTimer = window.setTimeout(() => this.finish(false), 420);
  }

  private mountTraveler(): void {
    const host = this.travelerRef?.nativeElement;
    if (this.coinRenderer && host) {
      if (this.coinRenderer.domElement.parentElement !== host) {
        host.appendChild(this.coinRenderer.domElement);
      }
      return;
    }

    const geo = this.travelerGeo;
    if (!host || !geo) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
    camera.position.set(0, 0.2, 3.6);
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
      stencil: false,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(240, 240, false);
    renderer.setClearColor(0x0d0630, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    host.appendChild(canvas);

    addLogoHoloLights(THREE, scene, 1);

    const radius = Math.max(geo.boundingSphere?.radius ?? 1, 1);
    const { material, centerDark } = createLogoHoloMaterial(THREE, geo);
    this.coinHoloCenterDark = centerDark;
    const mesh = new THREE.Mesh(geo, material);
    mesh.rotation.set(-0.55, 0.42, 0.12);
    mesh.scale.setScalar(1.7 / (radius * 2));
    const pivot = new THREE.Group();
    pivot.add(mesh);
    scene.add(pivot);

    this.coinScene = scene;
    this.coinCamera = camera;
    this.coinRenderer = renderer;
    this.coinMesh = mesh;
    this.coinPivot = pivot;
  }

  private markOverlay(...names: string[]): void {
    const root = this.travelerRef?.nativeElement.closest('.intro');
    root?.classList.add(...names);
  }

  private showTraveler(): void {
    const el = this.travelerRef?.nativeElement;
    if (!el) return;
    el.classList.add('is-live');
    // tour-handoff : opacity pilotée par poseTraveler (fade depuis le haut).
    if (this.phase !== 'tour-handoff') {
      el.style.opacity = '1';
    }
  }

  private poseTraveler(x: number, y: number, s: number, opacity?: number): void {
    const el = this.travelerRef?.nativeElement;
    if (!el) return;
    const size = Math.max(s, 28);
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    // Ne pas forcer opacity en exit — laisse le CSS crossfade tour-handoff.
    if (this.phase !== 'exit' && opacity !== undefined) {
      el.style.opacity = String(opacity);
    } else if (this.phase !== 'exit' && this.phase !== 'tour-handoff' && this.phase !== 'recede') {
      el.style.opacity = '1';
    }
    el.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
    this.lastPose = { x, y, s: size };
    this.coinRenderer?.setSize(size, size, false);
  }

  private finish(_skipped: boolean): void {
    if (this.disposed || this.intro.finished()) return;
    if (this.handoff.flying()) this.handoff.markLanded();
    window.clearTimeout(this.exitTimer);
    window.clearTimeout(this.progressTimer);
    document.documentElement.classList.remove('intro-token-entering');
    this.clearFeedStarConquestBand();
    this.teardown();
    this.zone.run(() => {
      this.visible.set(false);
      this.intro.complete();
      // SC reprend la bande playable hub.
      window.dispatchEvent(new Event('resize'));
      // Handoff a déjà démarré le tutoriel — ne pas relancer ni release relay.
      if (this.tourStartedFromHandoff || this.tour.active()) return;
      if (!this.tour.start()) {
        this.relay.releaseAfterIntro();
      }
    });
  }

  /**
   * Star Conquest en bandeau entre le logo.stl et « Feed The R4V3 » :
   * la pointe basse du token est légèrement centrée dans le bandeau SC.
   */
  private syncFeedStarConquestBand(): void {
    if (this.disposed || typeof document === 'undefined') return;
    // Pont : pas de SC. Insert/launch : le follow-up gère bande + fade.
    if (this.handoff.flying()) {
      this.clearFeedStarConquestBand();
      return;
    }
    if (
      this.inserting() ||
      this.launching() ||
      this.receding() ||
      this.toHeader() ||
      this.tourHandoff() ||
      this.exiting()
    ) {
      return;
    }
    if (!this.coinParked() && !this.ready()) return;

    const place = () => {
      if (this.disposed) return;
      const coin = this.coinRef?.nativeElement?.getBoundingClientRect();
      const hint = this.hintPadRef?.nativeElement?.getBoundingClientRect();
      if (!coin || coin.height < 8) {
        requestAnimationFrame(place);
        return;
      }
      this.applyStarConquestUnderline(coin, hint);
      const root = document.documentElement;
      const wasOn = root.classList.contains('intro-feed-sc');
      root.classList.add('intro-feed-sc');
      // Fade-in fluide : opacity 0 → 1 au frame suivant.
      if (!wasOn) {
        root.style.setProperty('--intro-sc-opacity', '0');
        requestAnimationFrame(() => {
          root.style.setProperty('--intro-sc-opacity', '1');
        });
      } else {
        root.style.setProperty('--intro-sc-opacity', '1');
      }
    };

    requestAnimationFrame(() => requestAnimationFrame(place));
  }

  private applyStarConquestUnderline(
    coin: DOMRect,
    hint?: DOMRect | null,
  ): void {
    const vh = window.innerHeight || 550;
    const tipY = coin.bottom - Math.min(10, coin.height * 0.04);
    // Bande plus haute : le haut de Star Conquest n’est plus tronqué.
    const bandH = Math.round(
      Math.min(176, Math.max(112, Math.min(coin.height * 0.68, vh * 0.3))),
    );
    let bandTop = tipY - bandH * 0.62;
    let bandBottom = bandTop + bandH;

    if (hint && hint.top > 0) {
      const maxBottom = hint.top - 4;
      if (bandBottom > maxBottom) {
        const shift = bandBottom - maxBottom;
        bandTop -= shift;
        bandBottom -= shift;
      }
    }

    // Headroom haut : soft-mask + trou atmosphère laissent le ciel SC visible.
    const headroom = 78;
    bandTop = Math.max(2, bandTop - headroom);
    bandBottom = Math.min(vh - 2, Math.max(bandTop + 72, bandBottom));

    const root = document.documentElement;
    root.style.setProperty('--sc-playable-top', `${Math.round(bandTop)}px`);
    root.style.setProperty(
      '--sc-playable-bottom',
      `${Math.round(Math.max(0, vh - bandBottom))}px`,
    );
    // Trou fond : largement au-dessus du bandeau (anti-troncature).
    root.style.setProperty('--intro-sc-mask-top', `${Math.round(Math.max(0, bandTop - 64))}px`);
    root.style.setProperty('--intro-sc-mask-bottom', `${Math.round(bandBottom + 28)}px`);
  }

  /** Au clic Feed : ouvre le clip (plus de lame horizontale), SC fond en place. */
  private startStarConquestFollowUp(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!root.classList.contains('intro-feed-sc')) return;
    cancelAnimationFrame(this.scFollowRaf);
    // Coupe le clip-path / plan qui montait avec le token.
    root.classList.add('intro-feed-sc-lift');
    const t0 = performance.now();
    const duration = 1480;

    const tick = (now: number) => {
      if (this.disposed) return;
      const u = Math.min(1, (now - t0) / duration);
      // Opaque plus longtemps, fondu en fin de montée — bande ancrée, pas de rise.
      const fade = u < 0.42 ? 1 : Math.max(0, 1 - (u - 0.42) / 0.58);
      const eased = fade * fade * (3 - 2 * fade);
      root.style.setProperty('--intro-sc-opacity', String(eased));
      if (u < 1) {
        this.scFollowRaf = requestAnimationFrame(tick);
      } else {
        this.clearFeedStarConquestBand();
      }
    };
    this.scFollowRaf = requestAnimationFrame(tick);
  }

  private clearFeedStarConquestBand(): void {
    if (typeof document === 'undefined') return;
    cancelAnimationFrame(this.scFollowRaf);
    this.scFollowRaf = 0;
    const root = document.documentElement;
    root.classList.remove('intro-feed-sc');
    root.classList.remove('intro-feed-sc-lift');
    root.style.removeProperty('--intro-sc-mask-top');
    root.style.removeProperty('--intro-sc-mask-bottom');
    root.style.removeProperty('--intro-sc-opacity');
    root.style.removeProperty('--intro-sc-rise');
    root.style.removeProperty('--sc-playable-top');
    root.style.removeProperty('--sc-playable-bottom');
  }

  /** Fin du handoff : tour déjà actif, crossfade traveler → token tutoriel. */
  private completeTourHandoff(): void {
    if (this.disposed || this.tourStartedFromHandoff) return;
    if (this.phase !== 'tour-handoff' && this.phase !== 'exit') return;

    this.zone.run(() => {
      if (!this.tour.shouldStart() && !this.tour.active()) {
        // Plus de tutoriel à lancer → fallback vol logo.
        this.tourHandoff.set(false);
        this.beginToHeader();
        return;
      }
      // Snap à la pose d’entrée haut-hub pour un relais net.
      this.poseTraveler(this.handoffTo.x, this.handoffTo.y, this.handoffTo.s, 1);
      this.tour.seedEntryPose({
        x: this.handoffTo.x,
        y: this.handoffTo.y,
        size: this.handoffTo.s,
      });
      if (!this.tour.active()) {
        if (!this.tour.start()) {
          this.tour.clearEntryPose();
          this.tourHandoff.set(false);
          this.beginToHeader();
          return;
        }
      }
      this.tourStartedFromHandoff = true;
      this.phase = 'exit';
      this.exiting.set(true);
      this.markOverlay('intro--tour-handoff', 'intro--exiting');
      const el = this.travelerRef?.nativeElement;
      if (el) el.style.opacity = '0';
      // Crossfade court : le token tutoriel est déjà sous Live.
      this.exitTimer = window.setTimeout(() => this.finish(false), 200);
    });
  }

  private animate = (now = performance.now()): void => {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this.animate);
    if (!this.renderer || !this.scene || !this.camera) return;

    this.clock.update(now);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.getElapsed();
    const bridging = this.handoff.flying();

    // Pendant le pont : traveling seul, puis pad exclusif dès le settle (pas les deux).
    if (bridging) {
      this.tickMesh(dt, t);
      this.tickCamera(dt);
      this.tickParticles(dt, t);
      const u =
        this.bridgeCamStart > 0
          ? Math.min(1, (performance.now() - this.bridgeCamStart) / BRIDGE_CAM_MS)
          : 0;
      this.warmSidesDuringHold(u);
      // Dès le handoff exclusif (u>0.68) : animer le pad chaque frame.
      if (this.coinRenderer && (this.coinParkSettling || this.bridgeSettle() || u > 0.68)) {
        this.tickCoin(dt, t);
      }
      // Ne plus peindre le canvas voyageur une fois le pad propriétaire.
      if (!this.bridgeSettle() && !this.coinParkSettling) {
        this.renderer.render(this.scene, this.camera);
      }
      return;
    }

    if (!this.coinRenderer && this.travelerGeo) {
      this.mountCoinPreview(this.travelerGeo);
    }

    this.tickInsert();
    this.tickRecede(dt);
    this.tickTourHandoff(dt);
    this.tickToHeader(dt);
    this.tickMesh(dt, t);
    if (this.phase === 'moon') {
      this.tickMoon(dt);
    } else {
      this.tickCamera(dt);
    }
    this.tickParticles(dt, t);
    this.tickCoin(dt, t);

    const meshHidden = this.phase === 'load' && this.mesh?.visible === false;
    this.parkFlip = !this.parkFlip;
    if (!meshHidden || this.parkFlip) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private tickInsert(): void {
    if (this.phase !== 'insert') return;
    if (performance.now() - this.insertStart >= 920) this.beginMoon();
  }

  private tickMoon(dt: number): void {
    if (this.phase !== 'moon') return;
    const u = Math.min(1, (performance.now() - this.moonStart) / MOON_MS);
    if (this.camera) {
      this.tickCamera(dt * 0.35);
      this.camera.position.y = lerp(this.camCoin.y, this.camCoin.y + 0.35, u * 0.45);
    }
    if (u >= 1) this.beginRecede();
  }

  private tickCoin(dt = 0.016, t = 0): void {
    if (!this.coinRenderer || !this.coinScene || !this.coinCamera) return;

    const launch = this.coinLaunch;
    const rest = TOKEN_REST_Y;
    let y = rest + Math.sin(t * 2.3) * 0.028;
    let ignite = 0.18;
    let climb = 0;

    const parkSettling = this.coinParkSettling && !!this.coinMesh && !!launch && !!this.coinPivot;

    if (parkSettling && this.coinMesh && launch && this.coinPivot) {
      // Centrage position/échelle seulement — orientation tip-6h figée tôt
      // (pas de « je me centre puis quart de tour » en fin de settle).
      const u = Math.min(1, (performance.now() - this.coinParkSettleStart) / COIN_PARK_MS);
      const e = easeInOutCubic(u);
      // Orientation terminée dès la 1re moitié ; la 2e = pure translation vers le centre.
      const orientU = Math.min(1, u / 0.45);
      const orientE = easeInOutCubic(orientU);
      this.coinMesh.quaternion.slerpQuaternions(
        this.coinParkQuatFrom,
        this.coinParkQuatTo,
        orientE,
      );
      launch.rotation.x = lerp(this.coinParkFromPitch, LOGO_TIP6_PITCH, orientE);
      launch.rotation.z = lerp(0.05, 0, orientE);
      const bob = Math.sin(t * 2.3) * 0.028 * e;
      y = lerp(this.coinParkFromY, rest + bob, e);
      launch.position.set(lerp(this.coinParkFromX, 0, e), y, 0);
      this.coinMesh.scale.setScalar(this.coinMeshBaseScale * lerp(this.coinParkScaleFrom, 1, e));
      // Pivot Y verrouillé pendant tout le settle — zéro spin d’arrivée.
      this.coinPivot.rotation.y = 0;
      if (u >= 1) {
        this.coinParkSettling = false;
        this.coinMesh.quaternion.copy(this.coinParkQuatTo);
        this.coinMesh.scale.setScalar(this.coinMeshBaseScale);
        launch.rotation.x = LOGO_TIP6_PITCH;
        launch.rotation.z = 0;
        launch.position.set(0, rest + bob, 0);
        this.coinPivot.rotation.y = 0;
      }
    } else if (this.phase === 'insert') {
      const u = Math.min(1, (performance.now() - this.insertStart) / 920);
      ignite = Math.min(1, 0.18 + u / 0.28);
      climb = Math.max(0, (u - 0.16) / 0.84);
      climb *= climb;
      y = lerp(rest, rest + TOKEN_CLIMB_INSERT, climb);
    } else if (
      this.phase === 'moon' ||
      this.phase === 'recede' ||
      this.phase === 'to-header' ||
      this.phase === 'tour-handoff' ||
      this.phase === 'exit'
    ) {
      const u = Math.min(1, (performance.now() - this.moonStart) / MOON_MS);
      const e = u * u;
      ignite = 1;
      climb = 1;
      y = lerp(rest + TOKEN_CLIMB_INSERT, rest + TOKEN_CLIMB_MOON, e);
    }

    if (
      !parkSettling &&
      launch &&
      this.phase !== 'recede' &&
      this.phase !== 'to-header' &&
      this.phase !== 'tour-handoff' &&
      this.phase !== 'exit'
    ) {
      // Caméra fixe : léger hop 3D + étincelles ; l’envol page est CSS.
      launch.position.set(Math.sin(t * 14) * 0.022 * climb, y, 0);
      launch.rotation.z = Math.sin(t * (climb > 0.05 ? 16 : 1.4)) * 0.018;
      launch.rotation.x = -0.04 * climb;
    }

    // Opaque pendant load/insert ; fondu seulement en fin de moon (CSS gère la sortie).
    if (this.coinMesh) {
      const mat = this.coinMesh.material;
      if (this.phase === 'moon') {
        const u = Math.min(1, (performance.now() - this.moonStart) / MOON_MS);
        const fade = u > 0.55 ? (u - 0.55) / 0.45 : 0;
        mat.transparent = fade > 0.02;
        mat.opacity = Math.max(0, 1 - fade * fade);
        mat.depthWrite = mat.opacity > 0.8;
      } else if (this.phase === 'load' || this.phase === 'insert') {
        if (mat.opacity !== 1 || mat.transparent) {
          mat.transparent = false;
          mat.opacity = 1;
          mat.depthWrite = true;
        }
      }
    }

    const settling = this.bridgeSettle() && this.handoff.flying();
    const parkedCenter =
      climb < 0.08 && this.phase === 'load' && !this.handoff.flying() && this.coinParked();
    // Une fois centré sur Feed : fondu naturel des étincelles (avant le clic).
    if (parkedCenter && this.sparkArrivalBoost > 0) {
      this.sparkArrivalBoost = Math.max(0, this.sparkArrivalBoost - dt * 0.62);
    } else if (!parkedCenter && this.sparkArrivalBoost > 0 && !settling) {
      this.sparkArrivalBoost = Math.max(0, this.sparkArrivalBoost - dt * 0.35);
    }
    const arrival = this.sparkArrivalBoost;
    const fadeOut = arrival * arrival * (3 - 2 * arrival);
    // Spin idle seulement quand les étincelles sont presque mortes — pas de quart
    // de tour juste après le centrage.
    const SPARK_SPIN_RESUME = 0.12;
    const resumeSpinEarly = fadeOut < SPARK_SPIN_RESUME;

    if (this.coinPivot && !parkSettling) {
      const holdTipDown =
        this.phase === 'load' &&
        climb < 0.08 &&
        (this.coinParked() || this.bridgeSettle() || this.ready()) &&
        !resumeSpinEarly;
      if (holdTipDown) {
        this.coinMesh?.rotation.set(LOGO_TIP6_EULER.x, LOGO_TIP6_EULER.y, LOGO_TIP6_EULER.z);
        if (this.coinLaunch) this.coinLaunch.rotation.x = LOGO_TIP6_PITCH;
        this.coinPivot.rotation.y = 0;
      } else {
        const spinFull =
          this.phase === 'insert'
            ? 0.14
            : this.phase === 'moon'
              ? 0.1
              : this.phase === 'to-header' || this.phase === 'tour-handoff'
                ? 0.03
                : this.phase === 'load'
                  ? 0.018
                  : 0.018;
        // Démarrage très progressif du spin idle (pas un kick d’un quart de tour).
        const spinBlend =
          this.phase === 'load' && climb < 0.08 && resumeSpinEarly
            ? spinFull * Math.max(0, 1 - fadeOut / Math.max(0.001, SPARK_SPIN_RESUME)) ** 2
            : spinFull;
        this.coinPivot.rotation.y += spinBlend;
      }
    }

    if (this.tokenIdleSparks) {
      const pos = this.tokenIdleSparks.geometry.getAttribute('position') as THREE.BufferAttribute;
      const mat = this.tokenIdleSparks.material as THREE.PointsMaterial;
      const parked = climb < 0.08;
      const power = settling
        ? 1
        : parkedCenter || parked
          ? fadeOut
          : 0.85 + climb * 0.15;
      const spray = settling
        ? 1.2
        : parked
          ? 0.55 + fadeOut * 0.7
          : 1.25 + climb * 1.35;
      mat.size = settling ? 0.28 : parked ? 0.12 + fadeOut * 0.2 : 0.14 + climb * 0.06;
      mat.opacity = power;
      this.tokenIdleSparks.visible = power > 0.02;
      if (power > 0.02) {
        for (let i = 0; i < pos.count; i += 1) {
          let x = pos.getX(i) + this.idleSparkVel[i * 3] * dt * spray;
          let sy = pos.getY(i) + this.idleSparkVel[i * 3 + 1] * dt * spray;
          let z = pos.getZ(i) + this.idleSparkVel[i * 3 + 2] * dt * spray;
          const fallen = sy < -0.85 || sy > 0.28 || Math.abs(x) > (parked ? 1.05 : 1.15);
          if (fallen) {
            // En fondu : ne plus respawn — laisse mourir les particules.
            if (parkedCenter && fadeOut < 0.45) {
              pos.setXYZ(i, x, -2, z);
              continue;
            }
            this.seedNozzleSpark(i, pos.array as Float32Array, this.idleSparkVel);
            continue;
          }
          pos.setXYZ(i, x, sy, z);
        }
        pos.needsUpdate = true;
      }
    }

    const emberSpray = settling ? 1.15 : climb < 0.08 ? 0.4 + fadeOut * 0.7 : 1.25 + climb;
    for (let i = 0; i < this.nozzleEmbers.length; i += 1) {
      const ember = this.nozzleEmbers[i];
      const mat = ember.material as THREE.MeshBasicMaterial;
      if (parkedCenter && fadeOut < 0.02) {
        ember.visible = false;
        mat.opacity = 0;
        continue;
      }
      ember.visible = settling || fadeOut > 0.02 || climb >= 0.08;
      ember.position.x += this.emberVel[i * 3] * dt * emberSpray;
      ember.position.y += this.emberVel[i * 3 + 1] * dt * emberSpray;
      ember.position.z += this.emberVel[i * 3 + 2] * dt * emberSpray;
      const dieRate = parkedCenter ? 1.1 + (1 - fadeOut) * 1.4 : climb < 0.08 ? 0.7 : 1.15;
      mat.opacity = Math.max(0, mat.opacity - dt * dieRate);
      if (mat.opacity <= 0.12 || Math.abs(ember.position.x) > 1.05 || ember.position.y > 0.55) {
        if (parkedCenter && fadeOut < 0.5) {
          ember.visible = false;
          mat.opacity = 0;
        } else if (!parkedCenter || fadeOut > 0.45) {
          this.placeEmber(i);
        }
      }
    }

    if (this.tokenStars) {
      const bridging = this.handoff.flying();
      const revealTarget =
        climb > 0.04
          ? 1
          : settling
            ? 0.9
            : parkedCenter
              ? fadeOut * 0.75
              : bridging || this.phase === 'load'
                ? 0.55
                : 0.2;
      if (parkedCenter) {
        this.starReveal = Math.max(0, this.starReveal - dt * 0.85);
      } else {
        this.starReveal = Math.min(1, this.starReveal + dt * (bridging || settling ? 1.1 : 0.55));
      }
      const reveal = this.starReveal * revealTarget;

      const pos = this.tokenStars.geometry.getAttribute('position') as THREE.BufferAttribute;
      const mat = this.tokenStars.material as THREE.PointsMaterial;
      const spray = climb > 0.04 ? 0.7 + climb : 0.22 + reveal * 0.35;
      mat.size = 0.028 + reveal * 0.02 + climb * 0.03;
      mat.opacity = reveal * (0.28 + climb * 0.55);
      const nozzle = y - 0.42;
      for (let i = 0; i < pos.count; i += 1) {
        let x = pos.getX(i) + this.starVel[i * 3] * dt * spray;
        let sy = pos.getY(i) + this.starVel[i * 3 + 1] * dt * (spray + climb * 0.5);
        let z = pos.getZ(i) + this.starVel[i * 3 + 2] * dt * spray;
        const out =
          climb > 0.04
            ? sy < nozzle - 1.8 || Math.abs(x) > 1.8 || Math.abs(z) > 1.8
            : sy < nozzle - 1.1 || Math.abs(x) > 1.2 || Math.abs(z) > 1.2;
        if (out) {
          const a = Math.random() * Math.PI * 2;
          const s = 0.04 + Math.random() * (climb > 0.04 ? 0.16 : 0.28);
          x = Math.cos(a) * s;
          sy = climb > 0.04 ? nozzle : nozzle - Math.random() * 0.35;
          z = Math.sin(a) * s;
          this.starVel[i * 3] = Math.cos(a) * (0.2 + Math.random() * 0.7);
          this.starVel[i * 3 + 1] = -(0.35 + Math.random() * 1.1);
          this.starVel[i * 3 + 2] = Math.sin(a) * (0.2 + Math.random() * 0.7);
        }
        pos.setXYZ(i, x, sy, z);
      }
      pos.needsUpdate = true;
    }

    if (this.coinMesh && this.holoEmissiveStops.length) {
      tickLogoHoloAppearance({
        material: this.coinMesh.material,
        centerDark: this.coinHoloCenterDark,
        emissiveStops: this.holoEmissiveStops,
        sheenStops: this.holoSheenStops,
        scratchA: this.holoScratchA,
        scratchB: this.holoScratchB,
        edgeBright: this.holoEdgeBright,
        edgeGlow: this.holoEdgeGlow,
        elapsed: t || this.clock.getElapsed(),
        bright: 0.55 + ignite * 0.35,
      });
    }
    this.coinRenderer.render(this.coinScene, this.coinCamera);
  }

  private tickRecede(dt: number): void {
    if (this.phase !== 'recede') return;
    // Beat silencieux après disparition du pad — aucun logo.stl affiché.
    this.recedeHold += dt;
    if (this.recedeHold >= 0.22) {
      if (this.tour.shouldStart()) this.beginTourHandoff();
      else this.beginToHeader();
    }
  }

  private tickTourHandoff(dt: number): void {
    if (this.phase !== 'tour-handoff') return;
    // Unique course visible : hors cadre haut → sous pastille Live.
    this.handoffT = Math.min(1, this.handoffT + dt * 1.7);
    const e = easeInOut(this.handoffT);
    const opacity = e < 0.12 ? 0 : Math.min(1, (e - 0.12) / 0.28);
    this.poseTraveler(
      lerp(this.handoffFrom.x, this.handoffTo.x, e),
      lerp(this.handoffFrom.y, this.handoffTo.y, e),
      this.handoffTo.s,
      opacity,
    );
    if (this.handoffT >= 0.94 && !this.tourStartedFromHandoff) {
      this.completeTourHandoff();
      return;
    }
    if (this.handoffT >= 1 && !this.tourStartedFromHandoff) {
      this.completeTourHandoff();
    }
  }

  private tickToHeader(dt: number): void {
    if (this.phase !== 'to-header') return;
    this.headerT = Math.min(1, this.headerT + dt * 0.82);
    const e = easeInOut(this.headerT);
    this.poseTraveler(
      lerp(this.headerFrom.x, this.headerTo.x, e),
      lerp(this.headerFrom.y, this.headerTo.y, e),
      lerp(this.headerFrom.s, this.headerTo.s, e),
    );
    if (this.headerT >= 1) this.beginExit();
  }

  private tickMesh(dt: number, t: number): void {
    if (!this.pivot || !this.mesh) return;
    const bridging = this.handoff.flying();
    const mat = this.mesh.material;

    // Catch-light continu depuis l’appel : pic doux au seam, settle vers le pad.
    const bridgeBright = this.bridgeCatchLight(bridging, t);
    tickLogoHoloAppearance({
      material: mat,
      centerDark: this.holoCenterDark,
      emissiveStops: this.holoEmissiveStops,
      sheenStops: this.holoSheenStops,
      scratchA: this.holoScratchA,
      scratchB: this.holoScratchB,
      edgeBright: this.holoEdgeBright,
      edgeGlow: this.holoEdgeGlow,
      elapsed: t,
      bright: bridgeBright,
    });
    if (this.renderer && bridging) {
      // Micro-exposure qui suit le catch-light (jamais un flash).
      const flare = Math.max(0, bridgeBright - 0.58);
      this.renderer.toneMappingExposure = this.bridgeExposureBase + flare * 0.06;
    } else if (this.renderer && this.renderer.toneMappingExposure !== this.bridgeExposureBase) {
      this.renderer.toneMappingExposure = this.bridgeExposureBase;
    }

    if (bridging) {
      if (!this.bridgeMeshArmed) {
        this.bridgeMeshArmed = true;
        this.bridgeCamStart = 0;
        this.primeBridgePose();
        mat.transparent = false;
        mat.opacity = 1;
        mat.depthWrite = true;
        this.ensureBridgeSparks();
        // Pas de fog pendant le freeze : match scène d’appel (sinon cut au crossfade).
        if (this.scene?.fog instanceof THREE.FogExp2) this.scene.fog.density = 0;
      }

      // Horloge gelée jusqu’au crossfade (releaseTravel) — pose ultra-zoom stable.
      if (!this.handoff.travelReady()) {
        this.tickBridgeSparks(dt, 1);
        this.primeBridgePose();
        this.mesh.visible = true;
        if (this.scene?.fog instanceof THREE.FogExp2) this.scene.fog.density = 0;
        return;
      }
      if (this.bridgeCamStart <= 0) {
        this.bridgeCamStart = performance.now();
      }

      const u = Math.min(1, (performance.now() - this.bridgeCamStart) / BRIDGE_CAM_MS);
      const e = bridgeTravelEase(u);
      // Étincelles pleines jusqu’à l’atterrissage pad, fondu avec le mesh voyageur.
      const bridgeSparkLevel = u > 0.78 ? Math.max(0, 1 - (u - 0.78) / 0.22) : 1;
      this.tickBridgeSparks(dt, bridgeSparkLevel);
      // Breath uniquement après le hold — e=0 doit rester pixel-identique au freeze.
      const breath =
        e <= 0 ? 1 : 1 + Math.sin(u * Math.PI * 2.2) * (u < BRIDGE_HOLD ? 0.018 : 0.008);
      this.mesh.position.set(
        lerp(0, 0.03, e) + Math.sin(u * Math.PI) * 0.014 * e,
        lerp(0.2, -0.64, easeInOutCubic(e)),
        lerp(0, 0.1, e),
      );
      this.mesh.scale.setScalar(lerp(this.meshBase * 2.35, this.meshBase * 0.58, easeInOutCubic(e)) * breath);
      // Spin / wobble gated by e — courbe douce, pas de snap au releaseTravel.
      this.mesh.rotation.y = -0.4 + easeInOutCubic(u) * 0.95 * e + Math.sin(t * 0.55) * 0.028 * e;
      this.mesh.rotation.x = lerp(-0.28, -0.5, easeInOutCubic(e));
      this.mesh.rotation.z = lerp(0.06, 0.1, easeInOutCubic(e));
      if (this.scene?.fog instanceof THREE.FogExp2) {
        this.scene.fog.density = lerp(0, 0.038, Math.min(1, e / 0.2));
      }
      // Handoff exclusif : le pad prend le relais, le traveler GL disparaît
      // immédiatement (zéro overlap = zéro token dédoublé).
      if (u > 0.68 && !this.bridgeSettle()) {
        this.sparkArrivalBoost = 1;
        this.beginCoinParkSettle();
        this.killBridgeTraveler(mat);
        this.zone.run(() => this.bridgeSettle.set(true));
      }
      if (this.bridgeSettle()) {
        // Garder le traveler mort pendant tout le settle pad.
        this.killBridgeTraveler(mat);
      }
      if (u >= 1 && !this.bridgeSettled) {
        this.bridgeSettled = true;
        this.killBridgeTraveler(mat);
        this.zone.run(() => {
          if (!this.handoff.landed()) this.handoff.markLanded();
        });
      }
      return;
    }

    if (this.bridgeMeshArmed && this.phase === 'load') {
      this.killBridgeTraveler(mat);
      mat.opacity = 1;
      mat.transparent = false;
      this.bridgeCamStart = 0;
      this.bridgeMeshArmed = false;
      this.clearParkCoinDomInline();
      if (this.bridgeSettle()) {
        this.zone.run(() => this.bridgeSettle.set(false));
      }
      if (this.scene?.fog instanceof THREE.FogExp2) this.scene.fog.density = 0.028;
    }
    void dt;
  }

  private tickCamera(dt: number): void {
    if (!this.camera) return;
    const bridging = this.handoff.flying();
    const diving =
      this.phase === 'recede' ||
      this.phase === 'tour-handoff' ||
      this.phase === 'exit';
    const introK = diving ? this.recedeT : 0;

    if (bridging && this.bridgeMeshArmed && this.mesh) {
      // Même gel caméra que le mesh tant que le dive/crossfade n’est pas fini.
      if (!this.handoff.travelReady() || this.bridgeCamStart <= 0) {
        this.camPos.copy(this.bridgeCamFrom);
        this.camLook.copy(this.bridgeLookFrom);
        if (this.camera.fov !== this.bridgeFovFrom) {
          this.camera.fov = this.bridgeFovFrom;
          this.camera.updateProjectionMatrix();
        }
      } else {
        const u = Math.min(1, (performance.now() - this.bridgeCamStart) / BRIDGE_CAM_MS);
        const e = bridgeTravelEase(u);
        // Arc caméra (bezier) : gros plan → haut → cadre INSERT.
        quadBezier(
          this.bridgeCamFrom,
          this.bridgeCamMid,
          this.camCoin,
          e,
          this.bridgeCamScratch,
        );
        // Micro-breath caméra seulement une fois le traveling engagé (e>0).
        if (e > 0 && u < BRIDGE_HOLD + 0.08) {
          const b = Math.sin(u * Math.PI * 2.4) * 0.018 * e;
          this.bridgeCamScratch.z += b;
        }
        // Lerp caméra vers la courbe — évite le suivi trop sec frame-à-frame.
        const camEase = 1 - Math.exp(-dt * 7.5);
        this.camPos.lerp(this.bridgeCamScratch, camEase);
        // e=0 : look = bridgeLookFrom (même cadrage que le freeze / fin de dive).
        // Sinon lerp vers le suivi mesh — évite le snap lookAt au releaseTravel.
        this.bridgeLookTarget.copy(this.mesh.position);
        this.bridgeLookTarget.y += 0.04;
        this.bridgeCamScratch.copy(this.bridgeLookFrom).lerp(this.bridgeLookTarget, easeInOutCubic(e));
        this.camLook.lerp(this.bridgeCamScratch, camEase);
        const nextFov = lerp(this.bridgeFovFrom, this.bridgeFovTo, easeInOutCubic(e));
        if (Math.abs(this.camera.fov - nextFov) > 0.04) {
          this.camera.fov = lerp(this.camera.fov, nextFov, camEase);
          this.camera.updateProjectionMatrix();
        }
      }
    } else if (bridging && !this.bridgeMeshArmed) {
      this.camPos.copy(this.bridgeCamFrom);
      this.camLook.copy(this.bridgeLookFrom);
      this.camera.fov = this.bridgeFovFrom;
      this.camera.updateProjectionMatrix();
    } else {
      const targetPos = diving
        ? this.camFrom.clone().lerp(this.camTo, easeInOut(introK))
        : this.camCoin;
      const targetLook = diving
        ? this.lookFrom.clone().lerp(this.lookTo, easeInOut(introK))
        : this.lookCoin;
      // Après le pont : lerp doux (pas de snap caméra → saut Feed The R4V3).
      const ease = 1 - Math.exp(-dt * (diving && introK < 1 ? 1.7 : 4.2));
      this.camPos.lerp(targetPos, ease);
      this.camLook.lerp(targetLook, ease);
      if (!diving) {
        const nextFov = lerp(this.camera.fov, this.bridgeFovTo, ease);
        if (Math.abs(this.camera.fov - nextFov) > 0.04) {
          this.camera.fov = nextFov;
          this.camera.updateProjectionMatrix();
        }
      }
    }

    const parallax = bridging ? 0 : 1;
    this.mouseSmooth.lerp(this.mouse, 1 - Math.exp(-dt * 4));
    const mx = this.mouseSmooth.x * parallax;
    const my = this.mouseSmooth.y * parallax;
    this.camera.position.set(
      this.camPos.x + mx * 0.55,
      this.camPos.y + my * -0.3,
      this.camPos.z,
    );
    this.camera.lookAt(this.camLook.x + mx * 1.1, this.camLook.y + my * -0.45, this.camLook.z);
  }

  private tickParticles(dt: number, t: number): void {
    if (!this.particles) return;
    const mat = this.particles.material as THREE.PointsMaterial;
    const bridging = this.handoff.flying();
    const u =
      bridging && this.bridgeCamStart > 0
        ? Math.min(1, (performance.now() - this.bridgeCamStart) / BRIDGE_CAM_MS)
        : 0;
    const e = bridging ? bridgeTravelEase(u) : 0;
    // Freeze / crossfade : pas d’étoiles (match appel). Fade-in seulement au traveling.
    const target = bridging
      ? this.handoff.travelReady() && this.bridgeCamStart > 0
        ? lerp(0, 0.92, Math.min(1, e / 0.35))
        : 0
      : PARTICLE_OPACITY;
    mat.opacity += (target - mat.opacity) * Math.min(1, (bridging ? 2.2 : 0.75) * dt);
    mat.size = bridging ? lerp(0.07, 0.05, e) : 0.045;
    // Parallaxe étoiles = sensation de traveling.
    this.particles.rotation.y = Math.sin(t * 0.05) * 0.04 + (bridging ? e * 0.55 + t * 0.04 : 0);
    this.particles.position.y = Math.sin(t * 0.4) * 0.14 + (bridging ? lerp(0.35, -0.1, e) : 0);
    this.particles.position.x = bridging ? lerp(0.4, 0, e) : 0;
    if (bridging) {
      this.particles.rotation.z = Math.sin(t * 0.2) * 0.05 * (1 - e * 0.5);
    }
  }

  private spawnParticles(scene: THREE.Scene): void {
    const mobile = window.innerWidth <= 760;
    const count = mobile ? 80 : 140;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = Math.random() * 10 - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.05,
        color: 0x8a95a5,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    pts.frustumCulled = true;
    scene.add(pts);
    this.particles = pts;
  }

  private showHudSoon(): void {
    const reveal = () => {
      if (this.disposed) return;
      // Ne PAS attendre markLanded : sinon au drop de .intro--bridging le HUD
      // repasse opacity:0 (plus d’anim pont, fontsIn encore false) → saut visible.
      this.zone.run(() => this.fontsIn.set(true));
    };
    if (document.fonts?.ready) {
      void document.fonts.ready.then(reveal);
      window.setTimeout(reveal, 1100);
    } else {
      window.setTimeout(reveal, 180);
    }
  }

  private fakeProgress(): void {
    const step = () => {
      if (this.ready() || this.disposed) return;
      this.zone.run(() => this.progress.update((p) => Math.min(92, p + 7 + Math.random() * 9)));
      this.progressTimer = window.setTimeout(step, 220);
    };
    this.progressTimer = window.setTimeout(step, 180);
  }

  private aspect(): number {
    return Math.max(window.innerWidth, 1) / Math.max(window.innerHeight, 1);
  }

  private resize(): void {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = this.aspect();
    this.camera.updateProjectionMatrix();
    this.pixelScale = this.surfaceScale(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(this.pixelScale);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  /** Plafond ~1080p : le close-up reste lisible, le fill-rate ne douche pas le vol. */
  private surfaceScale(w: number, h: number): number {
    return Math.min(1, 1920 / Math.max(w, 1), 1080 / Math.max(h, 1));
  }

  /** Étincelles sur le mesh voyageur pendant le pont (continuité depuis le décrocher). */
  private ensureBridgeSparks(): void {
    if (this.bridgeSparks || !this.mesh || !this.scene) return;
    const { points, vel } = this.makeNozzleSparks(44);
    points.position.set(0, -0.06, 0.05);
    this.mesh.add(points);
    this.bridgeSparks = points;
    this.bridgeSparkVel = vel;
    const mat = points.material as THREE.PointsMaterial;
    mat.opacity = 0;
    mat.size = 0.16;
  }

  private tickBridgeSparks(dt: number, level: number): void {
    const pts = this.bridgeSparks;
    if (!pts) return;
    const mat = pts.material as THREE.PointsMaterial;
    const target = Math.max(0, Math.min(1, level));
    mat.opacity += (target * 1 - mat.opacity) * Math.min(1, dt * 4.2);
    mat.size = 0.18 + mat.opacity * 0.16;
    pts.visible = mat.opacity > 0.03;
    const pos = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const spray = 0.85 + target * 0.75;
    for (let i = 0; i < pos.count; i += 1) {
      let x = pos.getX(i) + this.bridgeSparkVel[i * 3] * dt * spray;
      let sy = pos.getY(i) + this.bridgeSparkVel[i * 3 + 1] * dt * spray;
      let z = pos.getZ(i) + this.bridgeSparkVel[i * 3 + 2] * dt * spray;
      if (sy < -0.85 || sy > 0.3 || Math.abs(x) > 1.05) {
        this.seedNozzleSpark(i, pos.array as Float32Array, this.bridgeSparkVel);
        continue;
      }
      pos.setXYZ(i, x, sy, z);
    }
    pos.needsUpdate = true;
  }

  private disposeBridgeSparks(): void {
    if (!this.bridgeSparks) return;
    this.bridgeSparks.geometry.dispose();
    (this.bridgeSparks.material as THREE.Material).dispose();
    this.bridgeSparks.parent?.remove(this.bridgeSparks);
    this.bridgeSparks = undefined;
    this.bridgeSparkVel = new Float32Array(0);
  }

  /**
   * Catch-light au seam appel → Feed : pic doux pendant le freeze/crossfade,
   * puis settle fluide vers le clair du pad (pas de flash ni de cliff).
   */
  private bridgeCatchLight(bridging: boolean, t: number): number {
    let target = 0.55;
    if (bridging) {
      if (!this.handoff.travelReady() || this.bridgeCamStart <= 0) {
        // Niveau fin de dive + micro-breath — match le flare d’appel.
        target = 0.72 + Math.sin(t * 1.35) * 0.02;
      } else {
        const u = Math.min(1, (performance.now() - this.bridgeCamStart) / BRIDGE_CAM_MS);
        const e = bridgeTravelEase(u);
        target = lerp(0.74, 0.55, Math.min(1, e / 0.48));
        target += Math.sin(t * 1.1) * 0.018 * (1 - e);
      }
    }
    this.bridgeBrightSmooth += (target - this.bridgeBrightSmooth) * (bridging ? 0.07 : 0.05);
    return this.bridgeBrightSmooth;
  }

  /** Coupe nette du mesh voyageur (plein écran) — un seul token à l’écran. */
  private killBridgeTraveler(mat?: THREE.MeshPhysicalMaterial): void {
    const m = mat ?? this.mesh?.material;
    if (this.mesh) {
      this.mesh.visible = false;
    }
    if (m) {
      m.transparent = true;
      m.opacity = 0;
      m.depthWrite = false;
    }
    this.disposeBridgeSparks();
    // Cache le canvas GL tout de suite (le buffer garde sinon la dernière frame traveler).
    const gl = this.glRef?.nativeElement;
    if (gl) {
      gl.style.setProperty('opacity', '0', 'important');
      gl.style.setProperty('visibility', 'hidden', 'important');
    }
    // Efface le buffer : sans ça, skip-render laisse le traveler fantôme sous le pad.
    if (this.renderer && this.scene && this.camera) {
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** Affiche le pad tout de suite (sans attendre le prochain CD Angular). */
  private revealParkCoinDom(): void {
    const el = this.coinRef?.nativeElement;
    if (!el) return;
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('visibility', 'visible', 'important');
  }

  private clearParkCoinDomInline(): void {
    const el = this.coinRef?.nativeElement;
    if (!el) return;
    el.style.removeProperty('opacity');
    el.style.removeProperty('visibility');
    const gl = this.glRef?.nativeElement;
    if (gl) {
      gl.style.removeProperty('opacity');
      gl.style.removeProperty('visibility');
    }
  }

  /**
   * Démarre le centrage fluide du pad : orientation = mesh traveler courant,
   * puis slerp vers tip-6h + descente au repos (suite naturelle du décrocher).
   * Appelé AVANT killBridgeTraveler pour capturer la pose courante.
   */
  private beginCoinParkSettle(): void {
    if (this.coinParkSettling) return;
    if (!this.coinMesh || !this.coinLaunch || !this.coinPivot) {
      if (this.travelerGeo) this.mountCoinPreview(this.travelerGeo);
    }
    if (!this.coinMesh || !this.coinLaunch || !this.coinPivot) return;

    if (this.mesh) {
      // Pose traveler figée (euler frame) → quaternion pad, sans écart d’un frame.
      this.mesh.updateMatrixWorld(true);
      this.coinParkQuatFrom.copy(this.mesh.quaternion);
      this.coinParkFromPitch = Math.min(-0.14, this.mesh.rotation.x * 0.48);
      this.coinParkFromX = 0.03;
      this.coinParkFromY = TOKEN_REST_Y + 0.18;
      this.coinParkScaleFrom = 1.06;
    } else {
      this.coinParkQuatFrom.setFromEuler(new THREE.Euler(-0.42, 0.36, 0.07, 'XYZ'));
      this.coinParkFromPitch = -0.32;
      this.coinParkFromX = 0.03;
      this.coinParkFromY = TOKEN_REST_Y + 0.16;
      this.coinParkScaleFrom = 1.05;
    }
    this.coinParkQuatTo.setFromEuler(
      new THREE.Euler(LOGO_TIP6_EULER.x, LOGO_TIP6_EULER.y, LOGO_TIP6_EULER.z, 'XYZ'),
    );
    this.coinMesh.quaternion.copy(this.coinParkQuatFrom);
    this.coinPivot.rotation.y = 0;
    this.coinLaunch.rotation.x = this.coinParkFromPitch;
    this.coinLaunch.rotation.z = 0.05;
    this.coinLaunch.position.set(this.coinParkFromX, this.coinParkFromY, 0);
    this.coinMesh.scale.setScalar(this.coinMeshBaseScale * this.coinParkScaleFrom);
    // Pad opaque dès la 1re frame (le traveler GL est tué juste après).
    const padMat = this.coinMesh.material;
    padMat.transparent = false;
    padMat.opacity = 1;
    padMat.depthWrite = true;
    this.revealParkCoinDom();
    // Paint immédiat du pad avant que le traveler disparaisse.
    if (this.coinRenderer && this.coinScene && this.coinCamera) {
      this.coinRenderer.render(this.coinScene, this.coinCamera);
    }
    this.coinParkSettleStart = performance.now();
    this.coinParkSettling = true;
  }

  /** Pose du gros plan, partagée par le préchauffage et la 1re frame du vol. */
  private primeBridgePose(): void {
    if (!this.mesh) return;
    this.mesh.visible = true;
    this.mesh.position.set(0, 0.2, 0);
    this.mesh.scale.setScalar(this.meshBase * 2.35);
    this.mesh.rotation.set(-0.28, -0.4, 0.06);
    this.camPos.copy(this.bridgeCamFrom);
    this.camLook.copy(this.bridgeLookFrom);
    if (this.camera) {
      this.camera.fov = this.bridgeFovFrom;
      this.camera.position.copy(this.bridgeCamFrom);
      this.camera.lookAt(this.bridgeLookFrom);
      this.camera.updateProjectionMatrix();
    }
  }

  /** Pad token compilé hors du traveling, ou sur le hold caméra. */
  private scheduleSideWarm(): void {
    if (this.sidesReady || this.disposed) return;
    const ric = window.requestIdleCallback?.bind(window);
    const later = (fn: () => void, timeout: number) => {
      if (ric) ric(() => fn(), { timeout });
      else window.setTimeout(fn, 48);
    };
    later(() => {
      if (this.disposed || this.launched || this.handoff.flying()) return;
      if (!this.coinRenderer && this.travelerGeo) this.mountCoinPreview(this.travelerGeo);
      if (this.coinRenderer && this.coinScene && this.coinCamera) {
        this.coinRenderer.render(this.coinScene, this.coinCamera);
      }
      this.sidesReady = !!this.coinRenderer;
    }, 700);
  }

  private warmSidesDuringHold(u: number): void {
    if (this.sidesReady || !this.bridgeMeshArmed || u > BRIDGE_HOLD) {
      if (this.coinRenderer) this.sidesReady = true;
      return;
    }
    if (!this.coinRenderer && this.travelerGeo) {
      this.mountCoinPreview(this.travelerGeo);
    }
    this.sidesReady = !!this.coinRenderer;
  }

  private readonly onPointer = (e: PointerEvent): void => {
    this.mouse.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  };

  private teardown(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.clock.dispose();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointer);
    window.clearTimeout(this.exitTimer);
    window.clearTimeout(this.progressTimer);
    this.disposeTokenFx();
    this.particles?.geometry.dispose();
    (this.particles?.material as THREE.Material | undefined)?.dispose();
    const sharedGeo = this.mesh?.geometry;
    if (this.mesh) {
      sharedGeo?.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
    if (this.coinMesh) {
      if (this.coinMesh.geometry !== sharedGeo) this.coinMesh.geometry.dispose();
      (this.coinMesh.material as THREE.Material).dispose();
    }
    this.coinRenderer?.dispose();
    this.coinRenderer?.domElement.remove();
    this.renderer?.dispose();
    this.scene = undefined;
    this.camera = undefined;
    this.renderer = undefined;
    this.pivot = undefined;
    this.mesh = undefined;
    this.particles = undefined;
    this.coinMesh = undefined;
    this.coinPivot = undefined;
    this.coinRenderer = undefined;
    this.coinScene = undefined;
    this.coinCamera = undefined;
    this.travelerGeo = undefined;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function easeOutQuint(t: number): number {
  const u = 1 - Math.min(1, Math.max(0, t));
  return 1 - u * u * u * u * u;
}

/** Hold gros plan puis dézoom doux (courbe cinematic, plus fluide que quint). */
function bridgeTravelEase(u: number): number {
  const x = Math.min(1, Math.max(0, u));
  if (x <= BRIDGE_HOLD) return 0;
  const t = (x - BRIDGE_HOLD) / (1 - BRIDGE_HOLD);
  // easeInOutCubic — traveling plus linéaire / moins de « pop » au milieu.
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function quadBezier(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  t: number,
  out: THREE.Vector3,
): void {
  const o = 1 - t;
  out.set(
    o * o * a.x + 2 * o * t * b.x + t * t * c.x,
    o * o * a.y + 2 * o * t * b.y + t * t * c.y,
    o * o * a.z + 2 * o * t * b.z + t * t * c.z,
  );
}
