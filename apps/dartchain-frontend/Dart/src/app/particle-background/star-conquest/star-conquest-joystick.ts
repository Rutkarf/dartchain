import * as THREE from 'three';
import { measureGapAboveFloor, screenToWorldOnPlane } from './star-conquest-layout';
import { createSoftDiscTexture } from './star-conquest-visuals';
import { isScreenPointBlockedByUi } from './star-conquest-occlusion';
import {
  exclusionFromRect,
  type JoystickExclusionZone,
} from './star-conquest-joystick-zone';

/**
 * Chrome très clair / glassmorphism — lisible sur fond noir.
 * Blancs argentés + accents ambre/cyan (pas de logo PlayStation).
 */
const COL = {
  graphite: 0xd8dee6,
  chrome: 0xf0f4f8,
  silver: 0xffffff,
  glass: 0xc8d2dc,
  ink: 0x8a949e,
  amber: 0xf2c878,
  cyan: 0xb0e8f0,
  green: 0xa8c4a0,
} as const;

/** Tooltip / aria au survol du joystick. */
export const JOYSTICK_ARIA_LABEL = "Déplace l'univers de particules";

const RING_R = 5.6;
const KNOB_TRAVEL = 3.2;
/** Hit stick — un seul disque, aligné sur le bord visuel (pas d’anneaux élargis). */
const HIT_RADIUS_PX = 38;
const DRAG_THRESHOLD_PX = 7;
/** Légèrement réduit vs ×9 précédent. */
const SCALE_MIN = 0.58;
const SCALE_MAX = 0.88;
const SCALE_REF = 0.7;
/** Décalage écran vers le bas (px). */
const JOY_Y_OFFSET_PX = 9;

/**
 * HorizonJoystick — ancré à l’horizon du floor officiel (app-three-floor).
 * Indépendant du groupe de constellations navigable.
 */
export class StarConquestJoystick {
  readonly group = new THREE.Group();

  private readonly orbitGroup = new THREE.Group();
  private readonly glassDisc: THREE.Mesh;
  private readonly glassRim: THREE.Mesh;
  private readonly outerRing: THREE.Line;
  private readonly outerRing2: THREE.Line;
  private readonly pulseRing: THREE.Line;
  private readonly dirMarks: THREE.LineSegments;
  private readonly cardinalDots: THREE.Points;
  private readonly halo: THREE.Sprite;
  private readonly stick: THREE.Sprite;
  private readonly stickCore: THREE.Sprite;
  private readonly trail: THREE.Line;
  private readonly hintLabel: THREE.Sprite;
  private readonly hitProxy: THREE.Mesh;
  private readonly discTex: THREE.CanvasTexture;
  private readonly glassTex: THREE.CanvasTexture;
  private readonly labelTex: THREE.CanvasTexture;

  private readonly tmp = new THREE.Vector3();
  private readonly projected = new THREE.Vector3();
  private readonly unprojectDir = new THREE.Vector3();

  private screenX = 0;
  private screenY = 0;
  private hoverT = 0;
  private hoverTarget = 0;
  private pulse = 0;
  private tapFlash = 0;
  private dragging = false;
  private demoPhase = 0;

  private knobX = 0;
  private knobY = 0;
  private knobTx = 0;
  private knobTy = 0;

  private interactive = true;
  private orbitAngle = 0;
  private floorCanvas: HTMLCanvasElement | null = null;

  /** Ancre écran figée sur le layout « déplié » — ne bouge pas au repli. */
  private anchor: {
    sx: number;
    sy: number;
    vw: number;
    vh: number;
  } | null = null;
  private layoutPasses = 0;

  constructor() {
    this.group.name = 'HorizonJoystick';
    this.group.renderOrder = 10;
    this.discTex = createSoftDiscTexture(64);
    this.glassTex = createGlassDiscTexture(128);
    this.labelTex = createOrbitLabelTexture();

    // Disque glassmorphism — repos sombre, brillance au survol
    this.glassDisc = new THREE.Mesh(
      new THREE.CircleGeometry(RING_R * 0.88, 48),
      new THREE.MeshBasicMaterial({
        map: this.glassTex,
        color: COL.graphite,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    this.glassDisc.position.z = 0.02;
    this.glassDisc.raycast = () => {};

    // Bordure fine (anneau mince ~ RingGeometry 0.45–0.55 relatif)
    this.glassRim = new THREE.Mesh(
      new THREE.RingGeometry(RING_R * 0.94, RING_R * 1.02, 48),
      new THREE.MeshBasicMaterial({
        color: COL.chrome,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    this.glassRim.position.z = 0.03;
    this.glassRim.raycast = () => {};

    this.outerRing = this.makeCircleLine(RING_R * 1.02, 64, COL.silver, 0.7);
    // Un seul anneau extérieur fin — pas de double / pulse hitbox
    this.outerRing2 = this.makeCircleLine(RING_R * 1.02, 64, COL.amber, 0);
    this.pulseRing = this.makeCircleLine(RING_R * 1.02, 48, COL.cyan, 0);
    this.dirMarks = this.makeDirMarks(RING_R * 0.72);
    this.cardinalDots = this.makeCardinalDots(RING_R * 0.7);

    this.orbitGroup.add(this.outerRing);
    this.orbitGroup.add(this.dirMarks);
    this.orbitGroup.add(this.cardinalDots);
    // outerRing2 / pulseRing non ajoutés → pas de hitbox / bordure épaisse dupliquée

    this.halo = this.makeSprite(COL.chrome, 12, 0.28);
    this.stick = this.makeSprite(COL.silver, 4.6, 1);
    this.stickCore = this.makeSprite(COL.cyan, 2.2, 1);
    this.hintLabel = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.labelTex,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        sizeAttenuation: true,
      })
    );
    this.hintLabel.scale.set(4.8, 1.2, 1);
    // Centré sous le disque, hors chevauchement
    this.hintLabel.position.set(0, -RING_R * 1.55, 0.12);
    this.hintLabel.center.set(0.5, 1);
    this.hintLabel.raycast = () => {};

    const trailGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0.2),
      new THREE.Vector3(0, 0, 0.2),
    ]);
    this.trail = new THREE.Line(
      trailGeom,
      new THREE.LineBasicMaterial({
        color: COL.cyan,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    this.trail.raycast = () => {};

    // UNIQUE hitbox — rayon = bordure visuelle du disque (pas d’extension)
    this.hitProxy = new THREE.Mesh(
      new THREE.CircleGeometry(RING_R * 0.5, 16),
      new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0,
        visible: false,
        depthWrite: false,
      })
    );
    this.hitProxy.name = 'star-conquest-joy-hit';
    this.hitProxy.position.set(0, 0, 0.05);

    this.group.add(this.halo);
    this.group.add(this.glassDisc);
    this.group.add(this.glassRim);
    this.group.add(this.orbitGroup);
    this.group.add(this.trail);
    this.group.add(this.stick);
    this.group.add(this.stickCore);
    this.group.add(this.hintLabel);
    this.group.add(this.hitProxy);
  }

  private makeSprite(color: number, scale: number, opacity: number): THREE.Sprite {
    const mat = new THREE.SpriteMaterial({
      map: this.discTex,
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(scale, scale, 1);
    s.raycast = () => {};
    return s;
  }

  private makeCircleLine(
    radius: number,
    segments: number,
    color: number,
    opacity: number
  ): THREE.Line {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0.05));
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
      })
    );
    line.raycast = () => {};
    return line;
  }

  /** Quatre chevrons directionnels minimalistes (pas un D-pad). */
  private makeDirMarks(radius: number): THREE.LineSegments {
    const pts: number[] = [];
    for (let q = 0; q < 4; q++) {
      const a = (q / 4) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const px = c * radius;
      const py = s * radius;
      const tx = -s * 0.55;
      const ty = c * 0.55;
      pts.push(px - tx, py - ty, 0.06, px + c * 0.9, py + s * 0.9, 0.06);
      pts.push(px + tx, py + ty, 0.06, px + c * 0.9, py + s * 0.9, 0.06);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const lines = new THREE.LineSegments(
      geom,
      new THREE.LineBasicMaterial({
        color: COL.silver,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      })
    );
    lines.raycast = () => {};
    return lines;
  }

  private makeCardinalDots(radius: number): THREE.Points {
    const pos = new Float32Array(12);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * radius;
      pos[i * 3 + 1] = Math.sin(a) * radius;
      pos[i * 3 + 2] = 0.08;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(
      geom,
      new THREE.PointsMaterial({
        map: this.discTex,
        color: COL.amber,
        size: 0.7,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        sizeAttenuation: true,
      })
    );
    pts.raycast = () => {};
    return pts;
  }

  /**
   * Position croix rouge : centre horizontal, milieu de la bande libre
   * entre le bas de la pile Angular dépliée et l’horizon du floor.
   * Une fois ancrée (état déplié), la position ne bouge plus au repli.
   */
  layoutInGapAboveFloor(
    camera: THREE.PerspectiveCamera,
    floorPeekPx = 64
  ): void {
    this.floorCanvas = null;
    const vw = Math.max(window.innerWidth, 1);
    const vh = Math.max(window.innerHeight, 1);

    if (
      this.anchor &&
      (Math.abs(this.anchor.vw - vw) > 1 || Math.abs(this.anchor.vh - vh) > 1)
    ) {
      this.anchor = null;
      this.layoutPasses = 0;
    }

    if (this.anchor) {
      this.applyScreenLayout(
        this.anchor.sx,
        this.anchor.sy + JOY_Y_OFFSET_PX,
        this.controlScale(),
        camera
      );
      return;
    }

    const gap = measureGapAboveFloor(floorPeekPx);
    let sx = gap.centerX;
    let sy = gap.midY;

    if (isScreenPointBlockedByUi(sx, sy + JOY_Y_OFFSET_PX)) {
      const candidates: Array<[number, number]> = [
        [sx, gap.top + gap.height * 0.65],
        [sx, gap.top + gap.height * 0.35],
        [sx - 28, sy],
        [sx + 28, sy],
      ];
      for (const [x, y] of candidates) {
        if (y < gap.top || y > gap.bottom) continue;
        if (!isScreenPointBlockedByUi(x, y + JOY_Y_OFFSET_PX)) {
          sx = x;
          sy = y;
          break;
        }
      }
    }

    const scale = this.controlScale(gap.height);
    this.applyScreenLayout(sx, sy + JOY_Y_OFFSET_PX, scale, camera);

    this.layoutPasses += 1;
    // Figé dès que la pile est dépliée (bande serrée), sinon après quelques passes.
    const expandedLike = gap.height <= Math.max(56, vh * 0.14);
    if (expandedLike || this.layoutPasses >= 8) {
      this.anchor = { sx, sy, vw, vh };
    }
  }

  /** Échelle contrôle — position ancrée, taille toujours à jour. */
  private controlScale(gapHeight = 40): number {
    return Math.max(SCALE_MIN, Math.min(SCALE_MAX, (gapHeight / 40) * 0.9));
  }

  private applyScreenLayout(
    sx: number,
    sy: number,
    scale: number,
    camera: THREE.PerspectiveCamera
  ): void {
    this.screenX = sx;
    this.screenY = sy;
    const world = screenToWorldOnPlane(sx, sy, camera, 8);
    this.group.position.copy(world);
    this.group.quaternion.copy(camera.quaternion);
    this.group.scale.setScalar(scale);
    this.interactive = !isScreenPointBlockedByUi(sx, sy);
    this.group.visible = this.interactive;
  }

  /** @deprecated — préférer layoutInGapAboveFloor */
  layoutOnFloorHorizon(
    camera: THREE.PerspectiveCamera,
    _canvas?: HTMLCanvasElement
  ): void {
    this.layoutInGapAboveFloor(camera);
  }

  layout(camera: THREE.PerspectiveCamera, floorPeekPx = 64): void {
    this.layoutInGapAboveFloor(camera, floorPeekPx);
  }

  isInteractive(): boolean {
    return this.interactive;
  }

  getScreenCenter(): { x: number; y: number } {
    return { x: this.screenX, y: this.screenY };
  }

  getExclusionZone(camera: THREE.Camera, padPx = 8): JoystickExclusionZone {
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    // Un seul rayon = bordure visuelle (plus d’anneaux ×1.55)
    const localR = RING_R * 1.02;
    const samples = [
      [0, 0],
      [localR, 0],
      [-localR, 0],
      [0, localR],
      [0, -localR],
      [localR * 0.72, localR * 0.72],
      [-localR * 0.72, localR * 0.72],
      [localR * 0.72, -localR * 0.72],
      [-localR * 0.72, -localR * 0.72],
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [lx, ly] of samples) {
      this.tmp.set(lx, ly, 0);
      this.group.localToWorld(this.tmp);
      this.projected.copy(this.tmp).project(camera);
      const sx = (this.projected.x * 0.5 + 0.5) * vw;
      const sy = (-this.projected.y * 0.5 + 0.5) * vh;
      minX = Math.min(minX, sx);
      maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy);
      maxY = Math.max(maxY, sy);
    }
    const hitR = this.hitRadiusPx();
    minX = Math.min(minX, this.screenX - hitR);
    maxX = Math.max(maxX, this.screenX + hitR);
    minY = Math.min(minY, this.screenY - hitR);
    maxY = Math.max(maxY, this.screenY + hitR);
    return exclusionFromRect(minX, minY, maxX, maxY, padPx);
  }

  /** Rayon hit-test (px). */
  hitRadiusPx(): number {
    const s = this.group.scale.x || SCALE_REF;
    return HIT_RADIUS_PX * Math.max(0.9, Math.min(1.35, s / SCALE_REF));
  }

  hitTest(clientX: number, clientY: number): boolean {
    if (!this.interactive) return false;
    if (isScreenPointBlockedByUi(clientX, clientY)) return false;
    return Math.hypot(clientX - this.screenX, clientY - this.screenY) <= this.hitRadiusPx();
  }

  setHover(active: boolean): void {
    this.hoverTarget = active ? 1 : 0;
  }

  /** Aria / title pour le canvas hôte au survol. */
  getAriaLabel(): string {
    return JOYSTICK_ARIA_LABEL;
  }

  setDragging(active: boolean): void {
    this.dragging = active;
  }

  setKnob(nx: number, ny: number): void {
    this.knobTx = Math.max(-1, Math.min(1, nx));
    this.knobTy = Math.max(-1, Math.min(1, ny));
    this.dragging = true;
  }

  clearKnob(): void {
    this.knobTx = 0;
    this.knobTy = 0;
    this.dragging = false;
  }

  pulseTap(): void {
    this.tapFlash = 1;
  }

  tick(deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs * 0.001);
    this.pulse += dt;
    this.demoPhase += dt;
    this.hoverT += (this.hoverTarget - this.hoverT) * Math.min(1, dt * 10);
    if (this.tapFlash > 0) this.tapFlash = Math.max(0, this.tapFlash - dt * 2.6);

    // Démo idle : balayage directionnel clair (montre que c’est un stick)
    let demoX = 0;
    let demoY = 0;
    if (!this.dragging && Math.hypot(this.knobTx, this.knobTy) < 0.02) {
      const sweep = this.demoPhase * 0.85;
      const d = 0.38 + Math.sin(this.demoPhase * 0.5) * 0.12;
      demoX = Math.cos(sweep) * d;
      demoY = Math.sin(sweep) * d * 0.85;
    }

    const stickFollow = this.dragging
      ? 1 - Math.pow(0.7, dt * 60)
      : 1 - Math.pow(0.88, dt * 60);
    const targetX = this.knobTx + demoX;
    const targetY = this.knobTy + demoY;
    this.knobX += (targetX - this.knobX) * stickFollow;
    this.knobY += (targetY - this.knobY) * stickFollow;
    const stickMag = Math.hypot(this.knobX, this.knobY);

    this.orbitAngle += dt * (0.28 + this.hoverT * 0.2 + stickMag * 0.45);
    this.orbitGroup.rotation.z = this.orbitAngle;

    const breathe = 0.94 + Math.sin(this.pulse * 2.1) * 0.05;
    const flash = this.tapFlash * this.tapFlash;
    const h = this.hoverT;
    const active = Math.max(h, this.dragging ? 1 : 0, flash);
    const pulseWave = 0.5 + 0.5 * Math.sin(this.pulse * 3.2);

    // Repos plus sombre → survol / clic plus brillant
    const discMat = this.glassDisc.material as THREE.MeshBasicMaterial;
    const rimMat = this.glassRim.material as THREE.MeshBasicMaterial;
    discMat.color.setHex(active > 0.35 ? COL.silver : COL.graphite);
    rimMat.color.setHex(active > 0.35 ? COL.silver : COL.chrome);
    discMat.opacity = 0.52 + active * 0.42 + stickMag * 0.06;
    rimMat.opacity = 0.55 + active * 0.4 + flash * 0.1;

    (this.halo.material as THREE.SpriteMaterial).opacity =
      0.1 + active * 0.28 + stickMag * 0.08;
    this.halo.scale.setScalar(11 * breathe * (1 + active * 0.12));
    (this.halo.material as THREE.SpriteMaterial).color.setHex(
      active > 0.4 ? COL.cyan : COL.ink
    );

    (this.outerRing.material as THREE.LineBasicMaterial).opacity = 0.4 + active * 0.35;
    (this.outerRing.material as THREE.LineBasicMaterial).color.setHex(
      active > 0.35 ? COL.silver : COL.graphite
    );
    // Anneaux dupliqués désactivés (pas de 2e / 3e hitbox visuelle)
    (this.outerRing2.material as THREE.LineBasicMaterial).opacity = 0;
    (this.pulseRing.material as THREE.LineBasicMaterial).opacity = 0;
    this.pulseRing.scale.setScalar(1);
    (this.dirMarks.material as THREE.LineBasicMaterial).opacity =
      0.35 + active * 0.5 + stickMag * 0.1;
    (this.cardinalDots.material as THREE.PointsMaterial).opacity =
      0.4 + active * 0.5 + pulseWave * 0.06;
    // Label HTML uniquement (aria) — pas de sprite Three.js parasite
    (this.hintLabel.material as THREE.SpriteMaterial).opacity = 0;
    this.hintLabel.visible = false;

    const sx = this.knobX * KNOB_TRAVEL;
    const sy = -this.knobY * KNOB_TRAVEL;
    this.stick.position.set(sx, sy, 0.28);
    this.stickCore.position.set(sx, sy, 0.38);
    const stickMat = this.stick.material as THREE.SpriteMaterial;
    const coreMat = this.stickCore.material as THREE.SpriteMaterial;
    stickMat.color.setHex(
      this.dragging || stickMag > 0.2 ? COL.amber : active > 0.35 ? COL.silver : COL.chrome
    );
    stickMat.opacity = 0.7 + active * 0.3;
    coreMat.color.setHex(flash > 0.2 || this.dragging ? COL.cyan : active > 0.35 ? COL.silver : COL.graphite);
    coreMat.opacity = 0.75 + active * 0.25;
    this.stick.scale.setScalar(4.2 * (1 + active * 0.12 + flash * 0.14));
    this.stickCore.scale.setScalar(
      2.0 * (0.94 + Math.sin(this.pulse * 2.8) * 0.06 + flash * 0.18 + active * 0.08)
    );

    const trailPos = this.trail.geometry.getAttribute('position') as THREE.BufferAttribute;
    const trailLen = stickMag * KNOB_TRAVEL * 1.2;
    trailPos.setXYZ(0, 0, 0, 0.15);
    if (stickMag > 0.05) {
      trailPos.setXYZ(
        1,
        (this.knobX / stickMag) * trailLen,
        (-this.knobY / stickMag) * trailLen,
        0.15
      );
    } else {
      trailPos.setXYZ(1, 0, 0, 0.15);
    }
    trailPos.needsUpdate = true;
    const trailMat = this.trail.material as THREE.LineBasicMaterial;
    trailMat.opacity = stickMag > 0.1 ? 0.35 + stickMag * 0.45 : 0;
    trailMat.color.setHex(stickMag > 0.5 ? COL.cyan : COL.amber);
  }

  refreshScreenFromCamera(camera: THREE.Camera): void {
    this.tmp.set(0, 0, 0);
    this.group.localToWorld(this.tmp);
    this.projected.copy(this.tmp).project(camera);
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    this.screenX = (this.projected.x * 0.5 + 0.5) * vw;
    this.screenY = (-this.projected.y * 0.5 + 0.5) * vh;
    this.interactive = !isScreenPointBlockedByUi(this.screenX, this.screenY);
    this.group.visible = this.interactive;
  }

  dispose(): void {
    this.glassDisc.geometry.dispose();
    (this.glassDisc.material as THREE.Material).dispose();
    this.glassRim.geometry.dispose();
    (this.glassRim.material as THREE.Material).dispose();
    this.outerRing.geometry.dispose();
    (this.outerRing.material as THREE.Material).dispose();
    this.outerRing2.geometry.dispose();
    (this.outerRing2.material as THREE.Material).dispose();
    this.pulseRing.geometry.dispose();
    (this.pulseRing.material as THREE.Material).dispose();
    this.dirMarks.geometry.dispose();
    (this.dirMarks.material as THREE.Material).dispose();
    this.cardinalDots.geometry.dispose();
    (this.cardinalDots.material as THREE.Material).dispose();
    this.trail.geometry.dispose();
    (this.trail.material as THREE.Material).dispose();
    this.hitProxy.geometry.dispose();
    (this.hitProxy.material as THREE.Material).dispose();
    for (const s of [this.halo, this.stick, this.stickCore, this.hintLabel]) {
      (s.material as THREE.Material).dispose();
    }
    this.discTex.dispose();
    this.glassTex.dispose();
    this.labelTex.dispose();
  }
}

function createGlassDiscTexture(size: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const empty = new THREE.CanvasTexture(canvas);
    empty.generateMipmaps = false;
    empty.minFilter = THREE.LinearFilter;
    empty.magFilter = THREE.LinearFilter;
    return empty;
  }
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx * 0.7, cx * 0.55, 0, cx, cx, cx);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.3, 'rgba(236,242,248,0.85)');
  g.addColorStop(0.65, 'rgba(200,210,222,0.7)');
  g.addColorStop(1, 'rgba(160,172,186,0.35)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cx, cx - 1, 0, Math.PI * 2);
  ctx.fill();
  // Reflet chrome clair
  const shine = ctx.createLinearGradient(0, 0, size, size * 0.4);
  shine.addColorStop(0, 'rgba(255,255,255,0.85)');
  shine.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.ellipse(cx, cx * 0.55, cx * 0.7, cx * 0.28, -0.35, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function createOrbitLabelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const empty = new THREE.CanvasTexture(canvas);
    empty.generateMipmaps = false;
    empty.minFilter = THREE.LinearFilter;
    empty.magFilter = THREE.LinearFilter;
    return empty;
  }
  ctx.clearRect(0, 0, 512, 96);
  ctx.font = '600 11px ui-monospace, SF Mono, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(248, 252, 255, 0.98)';
  ctx.shadowColor = 'rgba(176, 232, 240, 0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText("Déplace l'univers", 256, 36);
  ctx.font = '600 8px ui-monospace, SF Mono, Menlo, monospace';
  ctx.fillText('de particules', 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export { DRAG_THRESHOLD_PX, HIT_RADIUS_PX };
