import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { LogoStlCacheService } from '../logo-stl-viewer/logo-stl-cache.service';
import { AgeGateService } from './age-gate.service';
import { AgeIntroHandoffService } from './age-intro-handoff.service';
import { hexToThree } from '../../core/constants/palette';
import {
  LOGO_HOLO,
  LOGO_HOLO_EMISSIVE_HEX,
  LOGO_HOLO_SHEEN_HEX,
  addLogoHoloLights,
  createLogoHoloMaterial,
  detectLogoThinAxis,
  tickLogoHoloAppearance,
  type LogoHoloCenterDarkUniforms,
} from '../logo-stl-viewer/logo-stl-holo';
import { LOGO_TIP6_EULER, LOGO_TIP6_PITCH } from '../logo-stl-viewer/logo-stl-orient';
import { firstValueFrom, timeout } from 'rxjs';
import type {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  AmbientLight,
  PointLight,
  Points,
  PointsMaterial,
  Quaternion,
  Scene,
  Timer,
  Vector3,
  WebGLRenderer,
} from 'three';

/** Même footprint CSS / GL que Feed The R4V3 (`intro__coin` 220×220). */
const AVATAR_PX = 220;
/** Cadrage caméra aligné sur le pad Feed (intro-overlay). */
const TOKEN_CAM_Z = 4.2;
/** Scale mesh idle = Feed pad (`1.45 / (radius * 2)`). */
const TOKEN_MESH_SCALE = 1.45;
/**
 * Scale gros plan intro (`primeBridgePose`) :
 * meshBase = 1.7/(r*2) × 2.35 → facteur 3.995/(r*2).
 */
const INTRO_CLOSEUP_MESH_BASE = 1.7;
const INTRO_CLOSEUP_SCALE_MUL = 2.35;
/** Rotation un peu plus vive que l’appel d’origine / Orbit autoRotate. */
const TOKEN_SPIN_SPEED = 0.034;
const TOKEN_ORBIT_SPEED = 2.15;
/** Sync avec BRIDGE_CAM_MS (traveling zoom → fente). */
const FLIGHT_MS = 2400;
/** Dive cinematic : approche + slerp → pose exacte de `primeBridgePose`. */
const DIVE_MS = 1380;
/** Arme l’intro un peu avant la fin (horloge gelée en ultra-zoom). */
const DIVE_ARM_INTRO = 0.74;
/**
 * Crossfade appel → intro (overlap avec le traveling déjà lancé).
 * Court : pas de plateau ultra-zoom perceptible.
 */
const CALL_DISSOLVE_MS = 180;
/** Ban check : ne bloque jamais le paint ; timeout court. */
const BAN_CHECK_MS = 600;
/**
 * Pose tranche cible = `intro-overlay.primeBridgePose` / `bridgeCamFrom`
 * (zéro saut caméra / rotation / look au crossfade).
 */
const DIVE_CAM_TO = { x: 0.42, y: 0.18, z: 2.45 } as const;
const DIVE_LOOK_TO = { x: 0, y: 0.1, z: 0 } as const;
const DIVE_FOV_TO = 52;
const DIVE_ROT_TO = { x: -0.28, y: -0.4, z: 0.06 } as const;
const DIVE_POS_TO = { x: 0, y: 0.2, z: 0 } as const;

type TokenControls = {
  enableDamping: boolean;
  dampingFactor: number;
  enablePan: boolean;
  enableZoom: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
  rotateSpeed: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  target: { x: number; y: number; z: number; set(x: number, y: number, z: number): void };
  enabled: boolean;
  update(): void;
  dispose(): void;
};

type TokenAssets = {
  THREE: typeof import('three');
  geometry: BufferGeometry;
};

/**
 * Pré-intro type appel iOS / Android — viewport exclusif 250×550.
 * UI cash ; assets token préchauffés en parallèle sans bloquer le boot hub.
 */
@Component({
  selector: 'app-age-call-gate',
  standalone: true,
  templateUrl: './age-call-gate.html',
  styleUrl: './age-call-gate.scss',
})
export class AgeCallGate implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('token') private tokenRef?: ElementRef<HTMLDivElement>;
  @ViewChild('codecRing') private codecRingRef?: ElementRef<HTMLAudioElement>;

  private readonly age = inject(AgeGateService);
  private readonly handoffSvc = inject(AgeIntroHandoffService);
  private readonly httpBackend = inject(HttpBackend);
  private readonly logoCache = inject(LogoStlCacheService);
  private readonly cdr = inject(ChangeDetectorRef);
  /** HTTP sans interceptor auth — ne doit pas retarder l’appel. */
  private readonly rawHttp = new HttpClient(this.httpBackend);

  protected readonly visible = signal(false);
  protected readonly ringing = signal(true);
  protected readonly handoff = signal(false);
  /** Dive zoom tranche en cours (Répondre → ultra-zoom). */
  protected readonly zooming = signal(false);
  /** Press + disparition soft du bouton vert (type décrocher réel). */
  protected readonly answering = signal(false);
  /** Feedback tactile / souris sur décrocher (sans casser breath/ring). */
  protected readonly answerPressed = signal(false);
  /** Survol / touch armé → animation pré-décrochage dès le contact. */
  protected readonly answerHover = signal(false);
  /** Pointer capturé sur le vert — answer au pointerup (1er geste fiable). */
  private answerPointerId: number | null = null;

  protected onAnswerPointerEnter(event: PointerEvent): void {
    if (this.accepting || !this.visible()) return;
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      this.answerHover.set(true);
    }
  }

  protected onAnswerPointerLeave(event: PointerEvent): void {
    this.answerHover.set(false);
    if (this.answerPointerId === event.pointerId) {
      this.releaseAnswerPointer(event);
    } else {
      this.answerPressed.set(false);
    }
  }

  protected onAnswerPointerDown(event: PointerEvent): void {
    if (this.accepting || !this.visible()) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    this.answerHover.set(true);
    this.answerPressed.set(true);
    this.answerPointerId = event.pointerId;
    try {
      (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    } catch {
      /* ignore */
    }
  }

  protected onAnswerPointerUp(event: PointerEvent): void {
    if (this.answerPointerId !== event.pointerId) {
      this.answerPressed.set(false);
      return;
    }
    this.releaseAnswerPointer(event);
    void this.answer(event);
  }

  protected onAnswerPointerCancel(event: PointerEvent): void {
    if (this.answerPointerId === event.pointerId) {
      this.releaseAnswerPointer(event);
    } else {
      this.answerPressed.set(false);
      this.answerHover.set(false);
    }
  }

  private releaseAnswerPointer(event: PointerEvent): void {
    this.answerPointerId = null;
    this.answerPressed.set(false);
    try {
      (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
    } catch {
      /* ignore */
    }
  }
  /** Token R4V3 3D prêt — le reste de l’appel est déjà visible cash. */
  protected readonly tokenReady = signal(false);

  private ringTimer = 0;
  private ringWanted = false;
  private ringPlaying = false;
  private ringFadeTimer = 0;
  private ringRetryTimer = 0;
  private ringUnlockBound?: (event: Event) => void;
  private tokenRaf = 0;
  private tokenRenderer?: WebGLRenderer;
  private tokenScene?: Scene;
  private tokenCamera?: PerspectiveCamera;
  private tokenPivot?: Group;
  private tokenLaunch?: Group;
  private tokenMesh?: Mesh;
  private tokenMaterial?: MeshPhysicalMaterial;
  /** Étincelles idle — même FX que Feed The R4V3. */
  private tokenIdleSparks?: Points;
  private idleSparkVel: Float32Array = new Float32Array(0);
  private nozzleEmbers: Mesh[] = [];
  private emberVel: Float32Array = new Float32Array(0);
  private diveActive = false;
  private diveDone = false;
  private diveStart = 0;
  private diveScaleFrom = 1;
  private diveScaleTo = 1;
  private diveCamFrom = { x: 0, y: 0, z: TOKEN_CAM_Z };
  private diveCamMid = { x: 0.28, y: 0.14, z: 3.1 };
  private diveLookFrom = { x: 0, y: 0, z: 0 };
  private diveFovFrom = 34;
  private divePosFrom = { x: 0, y: 0, z: 0 };
  private diveQuatFrom?: Quaternion;
  private diveQuatTo?: Quaternion;
  private tokenThree?: typeof import('three');
  /** Lumière qui suit la caméra — clarifie la tranche sans casser l’holo. */
  private tokenViewLight?: PointLight;
  private tokenAmbientLight?: AmbientLight;
  /** Axe local de la face (épaisseur mini du STL). */
  private edgeThinLocal?: Vector3;
  private edgeFace?: Vector3;
  private edgeView?: Vector3;
  private holoEmissiveStops: Color[] = [];
  private holoSheenStops: Color[] = [];
  private holoScratchA?: Color;
  private holoScratchB?: Color;
  private holoEdgeBright?: Color;
  private holoEdgeGlow?: Color;
  /** Mix clair lissé (priorité au clair, descente sombre plus lente). */
  private edgeBrightSmooth = 0.35;
  /** Uniforms shader : reflet sombre seulement sur le R central. */
  private holoCenterDark?: LogoHoloCenterDarkUniforms;
  private controls?: TokenControls;
  private disposed = false;
  private accepting = false;
  private mounting = false;
  private clock?: Timer;
  /** Prefetch Three + STL en parallèle du paint (jamais await sur le chemin critique). */
  private assetsPromise?: Promise<TokenAssets>;
  /** Canvas réservé dès le 1er paint — évite le reflow quand le STL arrive. */
  private slotCanvas?: HTMLCanvasElement;

  ngOnInit(): void {
    this.handoffSvc.reset();
    if (!this.age.shouldAsk()) {
      this.removeBootShell();
      this.age.end();
      return;
    }
    this.age.begin();
    // Paint immédiat — ne jamais attendre l’API / Three.js.
    this.visible.set(true);
    this.removeBootShell();
    // Prefetch token tout de suite, sans bloquer le thread UI.
    this.assetsPromise = this.warmTokenAssets();
    this.cdr.detectChanges();
    this.armRingUnlock();
    this.ringTimer = window.setTimeout(() => this.startBeeps(), 280);

    void this.checkRemoteBan().then((banned) => {
      if (banned && !this.accepting) this.kickOffSite();
    });
  }

  ngAfterViewInit(): void {
    if (!this.visible()) return;
    // Slot 96×96 figé avant le chargement Three — plus de stretch header.
    this.reserveTokenSlot();
    void this.mountToken();
  }

  /** Place un canvas vide aux bonnes dimensions avant WebGL. */
  private reserveTokenSlot(): void {
    const host = this.tokenRef?.nativeElement;
    if (!host || this.slotCanvas || this.tokenRenderer) return;
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_PX;
    canvas.height = AVATAR_PX;
    canvas.setAttribute('aria-hidden', 'true');
    // Canvas JS : hérite _ngcontent + styles inline (sinon CSS encapsulé ne matche pas).
    this.bindCanvasSlotStyles(canvas, host);
    host.replaceChildren(canvas);
    this.slotCanvas = canvas;
  }

  /**
   * Le canvas WebGL est créé hors template Angular → pas d’attribut `_ngcontent`.
   * Sans ça, `position:absolute` encapsulé ne s’applique pas et le logo décale hors halo.
   */
  private bindCanvasSlotStyles(canvas: HTMLCanvasElement, host: HTMLElement): void {
    for (const attr of Array.from(host.attributes)) {
      if (attr.name.startsWith('_ngcontent')) {
        canvas.setAttribute(attr.name, '');
      }
    }
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.right = '0';
    canvas.style.bottom = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    canvas.style.margin = '0';
    canvas.style.padding = '0';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    canvas.style.background = 'transparent';
    canvas.style.transform = 'none';
    canvas.style.border = 'none';
    canvas.style.outline = 'none';
    canvas.style.boxShadow = 'none';
    canvas.style.filter = 'none';
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.stopBeeps(true);
    this.teardownToken();
    window.clearTimeout(this.ringTimer);
    if (this.age.active()) this.age.end();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.visible() || this.handoff() || this.zooming()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.decline();
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void this.answer();
    }
  }

  /**
   * Vert : dive zoom sur la tranche du token d’appel → même cadrage que
   * le gros plan Feed The R4V3 → traveling intro → pad.
   */
  protected async answer(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.accepting || !this.visible()) return;
    this.accepting = true;
    this.stopBeeps(false);
    this.ringing.set(false);
    if (this.controls) {
      this.controls.enabled = false;
      this.controls.autoRotate = false;
    }

    // Press + glow du bouton vert avant le dive (évite la disparition sèche).
    this.answering.set(true);
    this.cdr.detectChanges();
    await this.wait(70);

    // 1) Zoom fluide : d’abord compenser le full-bleed (anti-saut), puis CSS zooming.
    this.beginTokenDive();
    this.zooming.set(true);
    this.cdr.detectChanges();
    // Re-sync aspect après layout full-bleed (même pose visuelle).
    this.applyDiveProgress(0);

    // 2) Arme l’intro au même ultra-zoom pendant le dive.
    await this.wait(Math.round(DIVE_MS * DIVE_ARM_INTRO));
    if (this.disposed) return;
    this.handoffSvc.beginFlight();
    this.age.markPassed();
    this.cdr.detectChanges();
    await this.waitForIntroReady();
    if (this.disposed) return;

    // 3) Fin du dive → traveling intro immédiat (pas de hold ultra-zoom).
    await this.waitForDiveEnd();
    if (this.disposed) return;

    this.handoff.set(true);
    // Libère le dézoom Feed tout de suite : le crossfade se fait en mouvement.
    this.handoffSvc.releaseTravel();
    this.cdr.detectChanges();
    await this.wait(CALL_DISSOLVE_MS);
    if (this.disposed) return;

    this.pauseTokenRender();
    // 4) L’intro possède le frame — overlay appel hors jeu.
    this.visible.set(false);
    this.cdr.detectChanges();
    this.zooming.set(false);
    this.handoff.set(false);
    this.cdr.detectChanges();

    await this.waitForFlightEnd();
    if (this.disposed) return;

    if (!this.handoffSvc.landed()) this.handoffSvc.markLanded();
    this.cdr.detectChanges();
    const releaseToken = () => {
      if (!this.disposed) this.teardownToken();
    };
    const ric = window.requestIdleCallback;
    if (typeof ric === 'function') ric(() => releaseToken(), { timeout: 500 });
    else window.setTimeout(releaseToken, 80);
  }

  /** Capture la pose courante et lance le dive caméra → tranche. */
  private beginTokenDive(): void {
    const cam = this.tokenCamera;
    const mesh = this.tokenMesh;
    const controls = this.controls;
    const THREE = this.tokenThree;
    const canvas = this.tokenRenderer?.domElement;
    if (!cam || !mesh || !THREE || !canvas) {
      this.diveDone = true;
      return;
    }
    // Bake le spin du pivot dans le quaternion mesh (composition, pas somme d’Euler).
    const pivot = this.tokenPivot;
    if (pivot) {
      mesh.quaternion.premultiply(pivot.quaternion);
      pivot.quaternion.identity();
      pivot.rotation.set(0, 0, 0);
    }
    // Annule le pitch launch pour le dive (cible DIVE_* sans parent tilt).
    if (this.tokenLaunch) this.tokenLaunch.rotation.set(0, 0, 0);
    mesh.updateMatrixWorld(true);

    const lookX = controls?.target.x ?? 0;
    const lookY = controls?.target.y ?? 0;
    const lookZ = controls?.target.z ?? 0;
    // Hauteur CSS avant full-bleed — sert à compenser le faux zoom du resize.
    const h0 = Math.max(1, canvas.clientHeight || AVATAR_PX);

    this.diveFovFrom = cam.fov;
    this.divePosFrom = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
    this.diveScaleFrom = mesh.scale.x;
    const radius = Math.max(mesh.geometry.boundingSphere?.radius ?? 1, 1);
    this.diveScaleTo =
      (INTRO_CLOSEUP_MESH_BASE * INTRO_CLOSEUP_SCALE_MUL) / (radius * 2);

    this.diveQuatFrom = mesh.quaternion.clone();
    const endEuler = new THREE.Euler(DIVE_ROT_TO.x, DIVE_ROT_TO.y, DIVE_ROT_TO.z, 'XYZ');
    this.diveQuatTo = new THREE.Quaternion().setFromEuler(endEuler);

    // Plein viewport SANS saut : on recule la caméra proportionnellement à la
    // croissance du canvas (sinon le même FOV dans 550px = zoom ×~2.5 instantané).
    const h1 = this.upsizeDiveCanvas();
    const k = Math.max(1, h1 / h0);
    cam.position.set(
      lookX + (cam.position.x - lookX) * k,
      lookY + (cam.position.y - lookY) * k,
      lookZ + (cam.position.z - lookZ) * k,
    );
    cam.lookAt(lookX, lookY, lookZ);
    if (controls) controls.target.set(lookX, lookY, lookZ);

    this.diveCamFrom = { x: cam.position.x, y: cam.position.y, z: cam.position.z };
    this.diveLookFrom = { x: lookX, y: lookY, z: lookZ };
    // Arc caméra doux entre la pose compensée et le gros plan intro.
    this.diveCamMid = {
      x: lerp(this.diveCamFrom.x, DIVE_CAM_TO.x, 0.45),
      y: lerp(this.diveCamFrom.y, DIVE_CAM_TO.y, 0.42),
      z: lerp(this.diveCamFrom.z, DIVE_CAM_TO.z, 0.5),
    };

    this.diveActive = true;
    this.diveDone = false;
    this.diveStart = performance.now();
    // Allume les étincelles dès le décrocher (fade dans tickTokenSparks).
    if (this.tokenIdleSparks) this.tokenIdleSparks.visible = true;
    for (const ember of this.nozzleEmbers) {
      ember.visible = true;
      this.placeEmber(this.nozzleEmbers.indexOf(ember));
    }
    // Frame 0 = pose visuelle identique à l’appel (pas de pop).
    this.applyDiveProgress(0);
  }

  /**
   * Canvas plein viewport. Retourne la hauteur CSS cible utilisée pour
   * la compensation anti-saut (voir beginTokenDive).
   */
  private upsizeDiveCanvas(): number {
    const renderer = this.tokenRenderer;
    const canvas = renderer?.domElement;
    const cam = this.tokenCamera;
    if (!renderer || !canvas) return AVATAR_PX;
    const w = Math.max(AVATAR_PX, Math.min(1920, window.innerWidth || AVATAR_PX));
    const h = Math.max(AVATAR_PX, Math.min(1080, window.innerHeight || AVATAR_PX));
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    if (cam) {
      cam.aspect = w / Math.max(1, h);
      cam.updateProjectionMatrix();
    }
    return h;
  }

  private applyDiveProgress(u: number): void {
    const cam = this.tokenCamera;
    const mesh = this.tokenMesh;
    if (!cam || !mesh) {
      this.diveDone = true;
      this.diveActive = false;
      return;
    }
    const canvas = this.tokenRenderer?.domElement;
    if (canvas) {
      const cw = Math.max(1, canvas.clientWidth || canvas.width);
      const ch = Math.max(1, canvas.clientHeight || canvas.height);
      const nextAspect = cw / ch;
      if (Math.abs(cam.aspect - nextAspect) > 0.01) {
        cam.aspect = nextAspect;
        cam.updateProjectionMatrix();
      }
    }
    // Ease cinematic (quint) : départ doux, approche, hold final.
    const e = diveEase(u);
    // Arc caméra (quadratic bezier) — même esprit que le traveling intro.
    const o = 1 - e;
    cam.position.set(
      o * o * this.diveCamFrom.x + 2 * o * e * this.diveCamMid.x + e * e * DIVE_CAM_TO.x,
      o * o * this.diveCamFrom.y + 2 * o * e * this.diveCamMid.y + e * e * DIVE_CAM_TO.y,
      o * o * this.diveCamFrom.z + 2 * o * e * this.diveCamMid.z + e * e * DIVE_CAM_TO.z,
    );
    const lx = lerp(this.diveLookFrom.x, DIVE_LOOK_TO.x, e);
    const ly = lerp(this.diveLookFrom.y, DIVE_LOOK_TO.y, e);
    const lz = lerp(this.diveLookFrom.z, DIVE_LOOK_TO.z, e);
    cam.lookAt(lx, ly, lz);
    if (this.controls) this.controls.target.set(lx, ly, lz);
    const nextFov = lerp(this.diveFovFrom, DIVE_FOV_TO, e);
    if (Math.abs(cam.fov - nextFov) > 0.04) {
      cam.fov = nextFov;
      cam.updateProjectionMatrix();
    }

    mesh.position.set(
      lerp(this.divePosFrom.x, DIVE_POS_TO.x, e),
      lerp(this.divePosFrom.y, DIVE_POS_TO.y, e),
      lerp(this.divePosFrom.z, DIVE_POS_TO.z, e),
    );

    if (this.diveQuatFrom && this.diveQuatTo) {
      mesh.quaternion.slerpQuaternions(this.diveQuatFrom, this.diveQuatTo, e);
    } else {
      mesh.rotation.set(DIVE_ROT_TO.x, DIVE_ROT_TO.y, DIVE_ROT_TO.z);
    }

    // Scale exacte primeBridgePose en fin de dive (pas de breath résiduel = saut).
    mesh.scale.setScalar(lerp(this.diveScaleFrom, this.diveScaleTo, e));
  }

  private async waitForDiveEnd(): Promise<void> {
    const deadline = performance.now() + DIVE_MS + 400;
    while (performance.now() < deadline && !this.disposed) {
      if (this.diveDone || !this.diveActive) return;
      await this.wait(16);
    }
    this.diveDone = true;
    this.diveActive = false;
  }

  /** Stoppe le rAF du token d’appel (évite 2 WebGL à 60 fps). */
  private pauseTokenRender(): void {
    cancelAnimationFrame(this.tokenRaf);
    this.tokenRaf = 0;
    if (this.controls) {
      this.controls.enabled = false;
      this.controls.autoRotate = false;
    }
  }

  /** Rouge : ban IP + kick — aucune vue du hub avant about:blank. */
  protected decline(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.accepting || !this.visible()) return;
    this.accepting = true;
    this.stopBeeps(true);
    this.ringing.set(false);
    // Rideau noir synchrone AVANT toute requête / state Angular.
    this.kickOffSite();
    void firstValueFrom(
      this.rawHttp.post('/api/access/age-decline', {}).pipe(timeout(BAN_CHECK_MS)),
    ).catch(() => undefined);
  }

  private removeBootShell(): void {
    document.getElementById('age-call-boot')?.remove();
  }

  private async checkRemoteBan(): Promise<boolean> {
    try {
      const status = await firstValueFrom(
        this.rawHttp
          .get<{ banned?: boolean }>('/api/access/status')
          .pipe(timeout(BAN_CHECK_MS)),
      );
      return !!status?.banned;
    } catch {
      return false;
    }
  }

  /**
   * Conformité : rideau noir immédiat, puis about:blank.
   * Ne jamais retirer age-gate-active ni l’UI d’appel avant la navigation
   * (sinon le hub flash ~100 ms).
   */
  private kickOffSite(): void {
    this.paintKickCurtain();
    document.documentElement.classList.add('age-gate-active', 'age-gate-kick');
    document.body.style.background = '#0a1220';
    document.body.style.overflow = 'hidden';
    try {
      window.sessionStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.replace('about:blank');
  }

  /** Overlay noir sync — au-dessus de tout, avant le prochain paint. */
  private paintKickCurtain(): void {
    let el = document.getElementById('age-call-kick');
    if (!el) {
      el = document.createElement('div');
      el.id = 'age-call-kick';
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText =
        'position:fixed;inset:0;z-index:2147483647;background:#0a1220;pointer-events:auto;';
      document.documentElement.appendChild(el);
    }
  }

  /** Prefetch async — STL + Three d’abord ; OrbitControls après le 1er frame. */
  private warmTokenAssets(): Promise<TokenAssets> {
    this.logoCache.prefetchRuntime();
    return Promise.all([import('three'), this.logoCache.load()]).then(([THREE, geometry]) => ({
      THREE,
      geometry,
    }));
  }

  private async mountToken(): Promise<void> {
    const host = this.tokenRef?.nativeElement;
    if (!host || this.disposed || this.tokenRenderer || this.mounting) return;
    this.mounting = true;
    this.reserveTokenSlot();

    try {
      const { THREE, geometry } = await (this.assetsPromise ??= this.warmTokenAssets());
      if (this.disposed || !this.tokenRef?.nativeElement || this.tokenRenderer) {
        geometry.dispose();
        return;
      }

      const canvas = this.slotCanvas ?? host.querySelector('canvas') ?? document.createElement('canvas');
      if (!canvas.isConnected) {
        host.replaceChildren(canvas);
        this.slotCanvas = canvas;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
      // Cadrage centré sur le halo (pas de lookY Feed qui décale le mesh).
      camera.position.set(0, 0, TOKEN_CAM_Z);
      camera.lookAt(0, 0, 0);
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
      renderer.setSize(AVATAR_PX, AVATAR_PX, false);
      renderer.setClearColor(0x0d0630, 0);
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.toneMappingExposure = 1;
      // CSS 100% du wrap (centré sur le halo) — buffer GL reste AVATAR_PX.
      this.bindCanvasSlotStyles(canvas, host);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const lights = addLogoHoloLights(THREE, scene, 1);
      this.tokenAmbientLight = lights.ambient;
      lights.ambient.intensity = 0.55;
      const viewLight = new THREE.PointLight(LOGO_HOLO.core, 1.05, 12);
      viewLight.position.copy(camera.position);
      scene.add(viewLight);
      this.tokenViewLight = viewLight;
      this.edgeFace = new THREE.Vector3();
      this.edgeView = new THREE.Vector3();
      const { thin } = detectLogoThinAxis(THREE, geometry);
      this.edgeThinLocal = thin;

      const radius = Math.max(geometry.boundingSphere?.radius ?? 1, 1);
      const { material, relief } = createLogoHoloMaterial(THREE, geometry);
      this.holoCenterDark = relief;
      this.holoEmissiveStops = LOGO_HOLO_EMISSIVE_HEX.map((hex) => new THREE.Color(hexToThree(hex)));
      this.holoSheenStops = LOGO_HOLO_SHEEN_HEX.map((hex) => new THREE.Color(hexToThree(hex)));
      this.holoScratchA = new THREE.Color();
      this.holoScratchB = new THREE.Color();
      this.holoEdgeBright = new THREE.Color(LOGO_HOLO.edgeBright);
      this.holoEdgeGlow = new THREE.Color(LOGO_HOLO.edgeGlow);
      const mesh = new THREE.Mesh(geometry, material);
      // Pointe pile à 6h (axe -Y) — le spin Y la maintient en bas.
      mesh.rotation.set(LOGO_TIP6_EULER.x, LOGO_TIP6_EULER.y, LOGO_TIP6_EULER.z);
      mesh.position.set(0, 0.02, 0);
      mesh.scale.setScalar(TOKEN_MESH_SCALE / (radius * 2));
      const pivot = new THREE.Group();
      pivot.rotation.y = 0;
      pivot.add(mesh);

      const launch = new THREE.Group();
      // Pitch parent : inclinaison douce sans décaler l’heure de la pointe.
      launch.rotation.x = LOGO_TIP6_PITCH;
      launch.add(pivot);
      this.attachTokenSparks(THREE, launch);
      scene.add(launch);

      this.tokenThree = THREE;
      this.tokenScene = scene;
      this.tokenCamera = camera;
      this.tokenRenderer = renderer;
      this.tokenMesh = mesh;
      this.tokenMaterial = material;
      this.tokenPivot = pivot;
      this.tokenLaunch = launch;
      this.clock = new THREE.Timer();
      this.clock.connect(document);
      renderer.render(scene, camera);
      this.tokenReady.set(true);
      this.cdr.detectChanges();
      this.spinToken();

      void import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
        if (this.disposed || !this.tokenCamera || !this.slotCanvas) return;
        const controls = new OrbitControls(this.tokenCamera, this.slotCanvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.enablePan = false;
        controls.enableZoom = false;
        // Pas d’autoRotate caméra : ça décalait la pointe hors de 6h.
        // Le token tourne sur lui-même via pivot.y (pointe verrouillée en bas).
        controls.autoRotate = false;
        controls.autoRotateSpeed = TOKEN_ORBIT_SPEED;
        controls.rotateSpeed = 0.75;
        controls.minPolarAngle = Math.PI * 0.32;
        controls.maxPolarAngle = Math.PI * 0.68;
        controls.target.set(0, 0, 0);
        controls.update();
        this.controls = controls;
      });
    } catch {
      /* slot canvas conservé — pas de collapse layout */
    } finally {
      this.mounting = false;
    }
  }

  /**
   * Étincelles + braises : présentes en scène mais invisibles à l’appel.
   * Elles s’allument au décrocher (dive → Feed), pas avant.
   */
  private attachTokenSparks(THREE: typeof import('three'), host: Group): void {
    const idle = this.makeNozzleSparks(THREE, 78);
    host.add(idle.points);
    this.tokenIdleSparks = idle.points;
    this.idleSparkVel = new Float32Array(idle.vel);
    idle.points.visible = false;
    const mat = idle.points.material as PointsMaterial;
    mat.opacity = 0;
    this.spawnEmbers(THREE, host);
    for (const ember of this.nozzleEmbers) {
      ember.visible = false;
      (ember.material as MeshBasicMaterial).opacity = 0;
    }
  }

  private makeNozzleSparks(
    THREE: typeof import('three'),
    count: number,
  ): { points: Points; vel: Float32Array } {
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
    // Halo autour de la silhouette (pas seulement 2 jets latéraux).
    const a = Math.random() * Math.PI * 2;
    const r = 0.18 + Math.random() * 0.16;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = -0.12 - Math.random() * 0.14;
    pos[i * 3 + 2] = Math.sin(a) * r * 0.55 + (Math.random() - 0.5) * 0.06;
    vel[i * 3] = Math.cos(a) * (0.35 + Math.random() * 0.75);
    vel[i * 3 + 1] = -0.08 - Math.random() * 0.42;
    vel[i * 3 + 2] = Math.sin(a) * (0.25 + Math.random() * 0.45);
  }

  private spawnEmbers(THREE: typeof import('three'), host: Group): void {
    const count = 18;
    this.emberVel = new Float32Array(count * 3);
    const geo = new THREE.SphereGeometry(0.07, 8, 6);
    for (let i = 0; i < count; i += 1) {
      const ember = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: i % 3 === 0 ? 0xede7d9 : 0xd5a021,
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
    (ember.material as MeshBasicMaterial).opacity = 0.95;
  }

  private tickTokenSparks(dt: number): void {
    const diveU = this.diveDone
      ? 1
      : this.diveActive
        ? Math.min(1, Math.max(0, (performance.now() - this.diveStart) / DIVE_MS))
        : this.zooming() || this.handoff()
          ? 1
          : 0;
    // Apparition progressive à l’approche écran — reste pleine jusqu’au handoff Feed.
    const sparkIn = diveU <= 0.12 ? 0 : diveU < 0.48 ? (diveU - 0.12) / 0.36 : 1;
    const sparkLevel = sparkIn * sparkIn * (3 - 2 * sparkIn);
    const spray = 0.7 + sparkLevel * 1.15;

    if (this.tokenIdleSparks) {
      const pos = this.tokenIdleSparks.geometry.getAttribute('position') as BufferAttribute;
      const mat = this.tokenIdleSparks.material as PointsMaterial;
      this.tokenIdleSparks.visible = sparkLevel > 0.02;
      mat.size = 0.18 + sparkLevel * 0.2;
      mat.opacity = sparkLevel * 1;
      for (let i = 0; i < pos.count; i += 1) {
        let x = pos.getX(i) + this.idleSparkVel[i * 3] * dt * spray;
        let sy = pos.getY(i) + this.idleSparkVel[i * 3 + 1] * dt * spray;
        let z = pos.getZ(i) + this.idleSparkVel[i * 3 + 2] * dt * spray;
        if (sy < -0.85 || sy > 0.28 || Math.abs(x) > 1.05 || Math.abs(z) > 0.95) {
          const buf = pos.array;
          if (buf instanceof Float32Array) {
            this.seedNozzleSpark(i, buf, this.idleSparkVel);
          }
          continue;
        }
        pos.setXYZ(i, x, sy, z);
      }
      pos.needsUpdate = true;
    }

    for (let i = 0; i < this.nozzleEmbers.length; i += 1) {
      const ember = this.nozzleEmbers[i];
      ember.visible = sparkLevel > 0.06;
      ember.position.x += this.emberVel[i * 3] * dt * (0.65 + spray * 0.5);
      ember.position.y += this.emberVel[i * 3 + 1] * dt * (0.65 + spray * 0.5);
      ember.position.z += this.emberVel[i * 3 + 2] * dt * (0.65 + spray * 0.5);
      const mat = ember.material as MeshBasicMaterial;
      mat.opacity = Math.max(0.2 * sparkLevel, mat.opacity - dt * 0.55);
      if (mat.opacity <= 0.18 || Math.abs(ember.position.x) > 1.05 || ember.position.y > 0.55) {
        this.placeEmber(i);
        mat.opacity = 0.75 * sparkLevel + 0.15;
      }
    }
  }

  private disposeTokenSparks(): void {
    for (const ember of this.nozzleEmbers) {
      ember.geometry.dispose();
      (ember.material as MeshBasicMaterial).dispose();
      ember.parent?.remove(ember);
    }
    if (this.tokenIdleSparks) {
      this.tokenIdleSparks.geometry.dispose();
      (this.tokenIdleSparks.material as { dispose?: () => void }).dispose?.();
      this.tokenIdleSparks.parent?.remove(this.tokenIdleSparks);
    }
    this.tokenIdleSparks = undefined;
    this.idleSparkVel = new Float32Array(0);
    this.nozzleEmbers = [];
    this.emberVel = new Float32Array(0);
  }

  private spinToken = (now = performance.now()): void => {
    if (this.disposed || !this.tokenRenderer || !this.tokenScene || !this.tokenCamera) {
      return;
    }

    this.clock?.update(now);
    const dt = Math.min(0.05, this.clock?.getDelta() ?? 0.016);

    if (this.diveActive) {
      const u = Math.min(1, (performance.now() - this.diveStart) / DIVE_MS);
      this.applyDiveProgress(u);
      if (u >= 1) {
        this.diveActive = false;
        this.diveDone = true;
      }
    } else if (this.controls) {
      this.controls.update();
      // Spin mesh en plus de l’orbite caméra (même rythme que Feed parked, un cran +).
      if (this.tokenPivot) this.tokenPivot.rotation.y += TOKEN_SPIN_SPEED * 0.55;
    } else if (this.tokenPivot) {
      this.tokenPivot.rotation.y += TOKEN_SPIN_SPEED;
    }

    // Idle appel : pas d’étincelles. Dive / handoff : spray + fade.
    if (this.diveActive || this.diveDone || this.zooming() || this.handoff()) {
      this.tickTokenSparks(dt);
    }

    const mat = this.tokenMaterial;
    const mesh = this.tokenMesh;
    const cam = this.tokenCamera;
    const viewLight = this.tokenViewLight;
    const face = this.edgeFace;
    const view = this.edgeView;
    let edgeTarget = 0.2;
    const thin = this.edgeThinLocal;
    if (mesh && cam && face && view && thin) {
      mesh.updateMatrixWorld(true);
      face.copy(thin).transformDirection(mesh.matrixWorld);
      view.copy(cam.position).normalize();
      const faceDot = Math.min(1, Math.abs(face.dot(view)));
      // Courbe large : la tranche et une bonne partie du tour restent clairs.
      edgeTarget = Math.max(0, Math.min(1, (0.72 - faceDot) / 0.72));
      edgeTarget = edgeTarget * edgeTarget * (3 - 2 * edgeTarget);
    }

    const diveU =
      this.diveActive || this.diveDone || this.zooming()
        ? this.diveDone
          ? 1
          : Math.min(1, Math.max(0, (performance.now() - this.diveStart) / DIVE_MS))
        : 0;
    // Flare doux (pas un flash) : monte progressivement, pic léger, plateau.
    const flare = diveLightFlare(diveU);
    const handoffFade = this.handoff() ? 1 : 0;
    if (this.diveActive || this.zooming() || this.diveDone) {
      // Clair tranche naturel + lift modéré (plafond ~0.78, pas 0.92).
      const flareLift = 0.42 + flare * 0.36;
      edgeTarget = Math.max(edgeTarget, flareLift * (1 - handoffFade * 0.18));
    }
    // Lissage plus lent à la montée → catch light fluide, moins agressif.
    if (edgeTarget >= this.edgeBrightSmooth) {
      this.edgeBrightSmooth += (edgeTarget - this.edgeBrightSmooth) * 0.07;
    } else {
      this.edgeBrightSmooth += (edgeTarget - this.edgeBrightSmooth) * 0.04;
    }
    const bright = this.edgeBrightSmooth;

    if (viewLight && cam) {
      viewLight.position.copy(cam.position).multiplyScalar(0.78);
      // Intensité contenue : bloom organique puis fondu vers l’intro.
      const bloom = 1.05 + bright * 2.15 + flare * 1.35;
      const settle = 1 - handoffFade * 0.72;
      const diveSettle =
        diveU > 0.72 ? 1 - ((diveU - 0.72) / 0.28) * 0.38 * (1 - handoffFade * 0.5) : 1;
      viewLight.intensity = Math.max(0.15, bloom * settle * diveSettle);
    }
    if (this.tokenAmbientLight) {
      this.tokenAmbientLight.intensity = 0.55 + bright * 0.28 + flare * 0.08;
    }
    if (mat && this.holoScratchA && this.holoScratchB && this.holoEdgeGlow && this.holoEdgeBright) {
      tickLogoHoloAppearance({
        material: mat,
        centerDark: this.holoCenterDark,
        emissiveStops: this.holoEmissiveStops,
        sheenStops: this.holoSheenStops,
        scratchA: this.holoScratchA,
        scratchB: this.holoScratchB,
        edgeBright: this.holoEdgeBright,
        edgeGlow: this.holoEdgeGlow,
        elapsed: this.clock?.getElapsed() ?? 0,
        // Léger boost emissive au pic du flare, sans cramer le métal.
        bright: bright + flare * 0.08 * (1 - handoffFade * 0.5),
      });
    }

    this.tokenRenderer.render(this.tokenScene, this.tokenCamera);
    this.tokenRaf = requestAnimationFrame(this.spinToken);
  };


  private teardownToken(): void {
    cancelAnimationFrame(this.tokenRaf);
    this.tokenRaf = 0;
    this.tokenReady.set(false);
    this.controls?.dispose();
    this.controls = undefined;
    this.disposeTokenSparks();
    if (this.tokenMesh) {
      this.tokenMesh.geometry.dispose();
      this.tokenMaterial?.dispose();
    }
    this.tokenRenderer?.dispose();
    this.tokenMesh = undefined;
    this.tokenMaterial = undefined;
    this.tokenViewLight = undefined;
    this.tokenAmbientLight = undefined;
    this.edgeThinLocal = undefined;
    this.edgeFace = undefined;
    this.edgeView = undefined;
    this.holoEmissiveStops = [];
    this.holoSheenStops = [];
    this.holoScratchA = undefined;
    this.holoScratchB = undefined;
    this.holoEdgeBright = undefined;
    this.holoEdgeGlow = undefined;
    this.holoCenterDark = undefined;
    this.edgeBrightSmooth = 0.35;
    this.tokenPivot = undefined;
    this.tokenLaunch = undefined;
    this.tokenThree = undefined;
    this.diveQuatFrom = undefined;
    this.diveQuatTo = undefined;
    this.tokenRenderer = undefined;
    this.tokenScene = undefined;
    this.tokenCamera = undefined;
    this.clock?.dispose();
    this.clock = undefined;
    this.slotCanvas = undefined;
  }

  /** Attend intro peinte (bridge ou ready) avant le crossfade. */
  private async waitForIntroReady(): Promise<void> {
    const deadline = performance.now() + 3200;
    while (performance.now() < deadline && !this.disposed) {
      const intro = document.querySelector('.intro:not(.intro--off)');
      const atmo = intro?.querySelector('.intro__atmosphere');
      const ready = intro?.classList.contains('intro--ready');
      const bridging = intro?.classList.contains('intro--bridging');
      if (intro instanceof HTMLElement && atmo instanceof HTMLElement && (ready || bridging)) {
        void intro.offsetWidth;
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        return;
      }
      await this.wait(16);
    }
  }

  /** Fin du traveling caméra, avec filet si l’intro n’a pas signalé l’atterrissage. */
  private async waitForFlightEnd(): Promise<void> {
    const deadline = performance.now() + FLIGHT_MS + 900;
    while (performance.now() < deadline && !this.disposed) {
      if (this.handoffSvc.landed()) return;
      await this.wait(40);
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  private startBeeps(): void {
    if (!this.ringing() || !this.visible() || this.disposed) return;
    this.ringWanted = true;
    this.armRingUnlock();
    // HTMLAudio muted = autoplay OK, zéro AudioContext → zéro warning console.
    void this.tryPlayHtmlMuted();
    window.clearInterval(this.ringRetryTimer);
    this.ringRetryTimer = window.setInterval(() => {
      if (!this.ringWanted || !this.ringing() || this.disposed) {
        window.clearInterval(this.ringRetryTimer);
        this.ringRetryTimer = 0;
        return;
      }
      if (this.isAudioUnlocked()) {
        void this.unmuteRing();
      } else if (!this.ringPlaying) {
        void this.tryPlayHtmlMuted();
      }
    }, 900);
  }

  private isAudioUnlocked(): boolean {
    const shared = (
      window as unknown as { __DARTCHAIN_AUDIO__?: { unlocked?: boolean } }
    ).__DARTCHAIN_AUDIO__;
    return Boolean(shared?.unlocked);
  }

  private armRingUnlock(): void {
    if (this.ringUnlockBound) return;
    this.ringUnlockBound = () => {
      const shared = (
        window as unknown as { __DARTCHAIN_AUDIO__?: { unlock?: () => void } }
      ).__DARTCHAIN_AUDIO__;
      shared?.unlock?.();
      if (this.ringWanted && this.ringing()) void this.unmuteRing();
    };
    window.addEventListener('pointerdown', this.ringUnlockBound, true);
    window.addEventListener('touchstart', this.ringUnlockBound, true);
    window.addEventListener('keydown', this.ringUnlockBound, true);
  }

  private disarmRingUnlock(): void {
    if (!this.ringUnlockBound) return;
    window.removeEventListener('pointerdown', this.ringUnlockBound, true);
    window.removeEventListener('touchstart', this.ringUnlockBound, true);
    window.removeEventListener('keydown', this.ringUnlockBound, true);
    this.ringUnlockBound = undefined;
  }

  /** Autoplay silencieux — autorisé sans geste. */
  private async tryPlayHtmlMuted(): Promise<void> {
    if (!this.ringWanted || !this.ringing() || this.disposed) return;
    const el = this.codecRingRef?.nativeElement;
    if (!el) return;
    el.loop = true;
    el.volume = 0.85;
    el.muted = true;
    try {
      await el.play();
      this.ringPlaying = true;
      if (this.isAudioUnlocked()) el.muted = false;
    } catch {
      this.ringPlaying = false;
    }
  }

  /** Après geste : unmute la piste déjà en lecture. */
  private async unmuteRing(): Promise<void> {
    if (!this.ringWanted || !this.ringing() || this.disposed) return;
    const el = this.codecRingRef?.nativeElement;
    if (!el) return;
    el.loop = true;
    el.volume = 0.85;
    el.muted = false;
    try {
      if (el.paused) await el.play();
      this.ringPlaying = true;
    } catch {
      this.ringPlaying = false;
    }
  }

  /**
   * @param hard true = coupe immédiat ; false = fondu court (Répondre).
   */
  private stopBeeps(hard = true): void {
    this.ringWanted = false;
    window.clearInterval(this.ringRetryTimer);
    this.ringRetryTimer = 0;
    window.cancelAnimationFrame(this.ringFadeTimer);
    this.disarmRingUnlock();

    const el = this.codecRingRef?.nativeElement;
    const finish = () => {
      this.ringPlaying = false;
      if (!el) return;
      try {
        el.pause();
        el.currentTime = 0;
        el.muted = true;
        el.volume = 0.85;
      } catch {
        /* ignore */
      }
    };

    if (hard || !el || el.paused) {
      finish();
      return;
    }

    // Fondu volume ~350 ms.
    const from = el.volume;
    const started = performance.now();
    const tick = (now: number) => {
      const u = Math.min(1, (now - started) / 350);
      try {
        el.volume = Math.max(0.0001, from * (1 - u));
      } catch {
        finish();
        return;
      }
      if (u >= 1) {
        finish();
        return;
      }
      this.ringFadeTimer = window.requestAnimationFrame(tick);
    };
    this.ringFadeTimer = window.requestAnimationFrame(tick);
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Ease cinematic quint : départ doux → accélération → hold final. */
function diveEase(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 16 * x * x * x * x * x : 1 - (-2 * x + 2) ** 5 / 2;
}

/**
 * Enveloppe de catch-light pendant le dive → handoff.
 * Monte en douceur, pic large (~0.75), redescend un peu — jamais un flash.
 */
function diveLightFlare(u: number): number {
  const x = Math.min(1, Math.max(0, u));
  if (x <= 0.08) return (x / 0.08) * (x / 0.08) * 0.12;
  // Smoothstep 0.08→0.72 puis léger settle jusqu’à 1.
  const rise = x < 0.72 ? (x - 0.08) / 0.64 : 1;
  const s = rise * rise * (3 - 2 * rise);
  const settle = x > 0.82 ? 1 - ((x - 0.82) / 0.18) * 0.22 : 1;
  return Math.min(1, 0.12 + s * 0.88) * settle;
}

