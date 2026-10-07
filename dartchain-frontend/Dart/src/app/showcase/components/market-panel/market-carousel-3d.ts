import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';
import { BEVEL, extrudeOptionsFromBevel } from '@core/constants/stroke-bevel';
import { createWebGlRenderer } from '@core/utils/three-webgl.util';
import { MarketFilter } from './market-panel.constants';
import { MarketAssetRow } from './market-panel.model';

export interface MarketCarouselCategory {
  id: MarketFilter;
  label: string;
}

export interface MarketCarouselLaneInput {
  category: MarketCarouselCategory;
  items: MarketAssetRow[];
}

interface CardHandle {
  root: THREE.Group;
  faceMat: THREE.MeshBasicMaterial;
  bodyMat: THREE.MeshStandardMaterial;
  footAura: THREE.Mesh;
  footAuraMat: THREE.MeshBasicMaterial;
  token: string;
  targetX: number;
  targetZ: number;
  targetRotY: number;
  targetScale: number;
}

interface LaneHandle {
  id: MarketFilter;
  group: THREE.Group;
  cards: CardHandle[];
  itemIndex: number;
  label: string;
}

const CARD_W = 0.58;
/** Plus basse pour garder la sélection ×1.18 entièrement dans le stage */
const CARD_H = 0.38;
const CARD_DEPTH = BEVEL.card.depth;
const CARD_RADIUS = 0.06;
/** Espacement vertical : le carrousel suivant occupe le bas du stage */
const LANE_GAP = 0.72;
const ITEM_GAP = 0.68;
/** Légère descente pour dégager le haut (plein pied, pas de tronquage) */
/** Remonte très légèrement le lane actif pour peeker un peu plus le suivant */
const VIEW_LIFT = 0.03;
const TEX_W = 768;
const TEX_H = 960;
/** Scale de la card active — assez marqué sans déborder du viewport */
const SELECTED_SCALE = 1.18;

@Component({
  selector: 'app-market-carousel-3d',
  standalone: true,
  template: `
    <div class="market-carousel-3d" #host>
      <div class="market-carousel-3d__aurora" aria-hidden="true"></div>
      <canvas class="market-carousel-3d__canvas" #canvas aria-label="Carrousel produits 3D"></canvas>

      <div class="market-carousel-3d__cues" aria-hidden="true">
        <span class="market-carousel-3d__chev market-carousel-3d__chev--left">‹</span>
        <span class="market-carousel-3d__chev market-carousel-3d__chev--right">›</span>
        <span class="market-carousel-3d__chev market-carousel-3d__chev--up">⌃</span>
        <span class="market-carousel-3d__chev market-carousel-3d__chev--down">⌄</span>
        <span class="market-carousel-3d__swipe">glisse · ← → · ↓</span>
      </div>

      @if (nextLaneLabel(); as next) {
        <div class="market-carousel-3d__peek" aria-hidden="true">
          <span class="market-carousel-3d__peek-arrow">↓</span>
          <span class="market-carousel-3d__peek-label">{{ next }}</span>
        </div>
      }

      @if (emptyHint()) {
        <p class="market-carousel-3d__hint">{{ emptyHint() }}</p>
      }
      <div class="market-carousel-3d__hud" aria-hidden="true">
        <span>{{ activeLabel() }}</span>
        <span>{{ activeIndexLabel() }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
      }

      .market-carousel-3d {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 0;
        overflow: hidden;
        touch-action: none;
        background: linear-gradient(180deg, rgba(10, 18, 32, 0.28), rgba(10, 18, 32, 0.72));
      }

      .market-carousel-3d__aurora {
        position: absolute;
        inset: -30%;
        pointer-events: none;
        background:
          linear-gradient(125deg, rgba(139, 157, 173, 0.06), transparent 45%, rgba(139, 157, 173, 0.04));
        animation: market-aurora-spin 18s linear infinite;
        opacity: 0.45;
        filter: blur(14px);
      }

      .market-carousel-3d__canvas {
        position: relative;
        z-index: 1;
        display: block;
        width: 100%;
        height: 100%;
        cursor: grab;
      }

      .market-carousel-3d__canvas.is-dragging {
        cursor: grabbing;
      }

      .market-carousel-3d__cues {
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: none;
      }

      .market-carousel-3d__chev {
        position: absolute;
        font-family: var(--ds-font-mono, 'Inter', sans-serif);
        font-weight: 900;
        color: rgba(139, 157, 173, 0.85);
        text-shadow: 0 0 8px rgba(139, 157, 173, 0.55);
        line-height: 1;
      }

      .market-carousel-3d__chev--left,
      .market-carousel-3d__chev--right {
        top: 38%;
        font-size: var(--fs-module);
        animation: market-chev-h 1.4s ease-in-out infinite;
      }

      .market-carousel-3d__chev--left {
        left: 2px;
      }

      .market-carousel-3d__chev--right {
        right: 2px;
        animation-delay: 0.2s;
      }

      .market-carousel-3d__chev--up,
      .market-carousel-3d__chev--down {
        left: 50%;
        transform: translateX(-50%);
        font-size: var(--fs-module);
        animation: market-chev-v 1.5s ease-in-out infinite;
      }

      .market-carousel-3d__chev--up {
        top: 2px;
      }

      .market-carousel-3d__chev--down {
        bottom: 16px;
        animation-delay: 0.25s;
      }

      .market-carousel-3d__swipe {
        position: absolute;
        left: 50%;
        top: 1%;
        transform: translateX(-50%);
        font-family: var(--ds-font-mono, 'Inter', sans-serif);
        font-size: var(--fs-module);
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(237, 231, 217, 0.45);
        animation: market-swipe-pulse 2s ease-in-out infinite;
        white-space: nowrap;
      }

      .market-carousel-3d__peek {
        position: absolute;
        left: 50%;
        bottom: 4px;
        z-index: 3;
        transform: translateX(-50%);
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 1px 5px;
        border: 1px solid rgba(139, 157, 173, 0.35);
        background: rgba(10, 18, 32, 0.45);
        pointer-events: none;
        animation: market-peek-bob 1.6s ease-in-out infinite;
      }

      .market-carousel-3d__peek-arrow {
        font-size: var(--fs-module);
        color: rgba(139, 157, 173, 0.95);
        font-weight: 900;
      }

      .market-carousel-3d__peek-label {
        font-family: var(--ds-font-mono, 'Inter', sans-serif);
        font-size: var(--fs-module);
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(237, 231, 217, 0.9);
      }

      .market-carousel-3d__hint {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: grid;
        place-items: center;
        margin: 0;
        padding: 8px;
        pointer-events: none;
        font-size: var(--fs-module);
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: rgba(237, 231, 217, 0.55);
        text-align: center;
      }

      .market-carousel-3d__hud {
        position: absolute;
        left: 3px;
        right: 3px;
        bottom: 2px;
        z-index: 3;
        display: flex;
        justify-content: space-between;
        gap: 4px;
        pointer-events: none;
        font-family: var(--ds-font-mono, 'Inter', sans-serif);
        font-size: var(--fs-module);
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: rgba(139, 157, 173, 0.75);
      }

      @keyframes market-aurora-spin {
        to { transform: rotate(360deg); }
      }

      @keyframes market-chev-h {
        0%, 100% { opacity: 0.35; transform: translateX(0); }
        50% { opacity: 1; transform: translateX(var(--shift, 0)); }
      }

      .market-carousel-3d__chev--left {
        --shift: var(--fs-module);
      }

      .market-carousel-3d__chev--right {
        --shift: var(--fs-module);
      }

      @keyframes market-chev-v {
        0%, 100% { opacity: 0.3; transform: translateX(-50%) translateY(0); }
        50% { opacity: 1; transform: translateX(-50%) translateY(2px); }
      }

      @keyframes market-swipe-pulse {
        0%, 100% { opacity: 0.25; }
        50% { opacity: 0.75; }
      }

      @keyframes market-peek-bob {
        0%, 100% { transform: translateX(-50%) translateY(0); opacity: 0.75; }
        50% { transform: translateX(-50%) translateY(2px); opacity: 1; }
      }

      @media (prefers-reduced-motion: reduce) {
        .market-carousel-3d__aurora,
        .market-carousel-3d__chev,
        .market-carousel-3d__swipe,
        .market-carousel-3d__peek {
          animation: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketCarousel3dComponent implements AfterViewInit, OnDestroy {
  private readonly hostRef = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  readonly lanes = input.required<MarketCarouselLaneInput[]>();
  readonly activeCategoryId = input.required<MarketFilter>();
  readonly emptyMessage = input('Aucun produit');

  readonly categoryChange = output<MarketFilter>();
  readonly itemSelect = output<MarketAssetRow>();
  readonly itemFocus = output<MarketAssetRow | null>();

  protected readonly emptyHint = signal('');
  protected readonly activeLabel = signal('');
  protected readonly activeIndexLabel = signal('0 / 0');
  protected readonly nextLaneLabel = signal<string | null>(null);

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private root = new THREE.Group();
  private fxRoot = new THREE.Group();
  private particles: THREE.Points | null = null;
  private sweepLight: THREE.PointLight | null = null;
  private clock = new THREE.Clock();
  private laneHandles: LaneHandle[] = [];
  private itemLookup = new Map<string, MarketAssetRow>();
  private rafId = 0;
  private resizeObserver: ResizeObserver | null = null;
  private disposed = false;
  private reducedMotion = false;

  private targetLaneY = 0;
  private currentLaneY = 0;
  private activeLaneIndex = 0;

  private pointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragAccumX = 0;
  private dragAccumY = 0;
  private dragging = false;
  private suppressClick = false;

  constructor() {
    effect(() => {
      const laneData = this.lanes();
      const activeId = this.activeCategoryId();
      if (!this.scene) {
        return;
      }
      this.rebuildLanes(laneData);
      this.syncActiveLane(activeId, false);
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    const created = createWebGlRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    if (!created) {
      this.emptyHint.set('WebGL indisponible');
      return;
    }

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = created.renderer;
    this.renderer.setClearColor(0x0d0630, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0d0630, 0.06);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);

    const ambient = new THREE.AmbientLight(0xede7d9, 0.95);
    const key = new THREE.DirectionalLight(0xede7d9, 0.9);
    key.position.set(0.8, 1.4, 2.4);
    const rim = new THREE.DirectionalLight(0x8a95a5, 0.55);
    rim.position.set(-1.4, 0.4, -1.2);
    this.sweepLight = new THREE.PointLight(0x8a95a5, 1.4, 4.5, 2);
    this.sweepLight.position.set(0.6, 0.35, 1.4);
    this.scene.add(ambient, key, rim, this.sweepLight, this.fxRoot, this.root);
    this.buildFxLayer();

    this.rebuildLanes(this.lanes());
    this.syncActiveLane(this.activeCategoryId(), true);
    this.resize();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.hostRef().nativeElement);

    const el = canvas;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('click', this.onClick);

    this.tick();
  }

  ngOnDestroy(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    const canvas = this.canvasRef()?.nativeElement;
    if (canvas) {
      canvas.removeEventListener('pointerdown', this.onPointerDown);
      canvas.removeEventListener('pointermove', this.onPointerMove);
      canvas.removeEventListener('pointerup', this.onPointerUp);
      canvas.removeEventListener('pointercancel', this.onPointerUp);
      canvas.removeEventListener('wheel', this.onWheel);
      canvas.removeEventListener('click', this.onClick);
    }
    this.disposeLanes();
    this.disposeFx();
    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }

  private buildFxLayer(): void {
    // Grille sol subtile — ancrée bas pour remplir le volume vertical
    const grid = new THREE.GridHelper(7, 20, 0x8a95a5, 0x18314f);
    grid.position.y = -0.78;
    grid.material.transparent = true;
    if (!Array.isArray(grid.material)) {
      grid.material.opacity = 0.28;
    }
    this.fxRoot.add(grid);

    // Particules flottantes
    const count = 90;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3.2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2.4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.2 - 0.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xede7d9,
      size: 0.018,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.particles = new THREE.Points(geo, mat);
    this.fxRoot.add(this.particles);
  }

  private disposeFx(): void {
    this.fxRoot.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) {
          mat.forEach((entry) => entry.dispose());
        } else {
          mat.dispose();
        }
      }
    });
    while (this.fxRoot.children.length) {
      this.fxRoot.remove(this.fxRoot.children[0]);
    }
    this.particles = null;
    this.sweepLight = null;
  }

  private rebuildLanes(laneData: MarketCarouselLaneInput[]): void {
    this.disposeLanes();
    this.itemLookup.clear();
    this.laneHandles = [];

    laneData.forEach((lane, laneIndex) => {
      const group = new THREE.Group();
      group.position.y = -laneIndex * LANE_GAP;
      const cards: CardHandle[] = [];

      if (lane.items.length === 0) {
        const empty = this.createCardObject({
          title: lane.category.label,
          subtitle: 'Aucun produit',
          price: '—',
          accent: '#8b9dad',
          icon: '·',
          tag: 'VIDE',
        });
        group.add(empty.root);
        cards.push({
          ...empty,
          token: `__empty__${lane.category.id}`,
          targetX: 0,
          targetZ: 0,
          targetRotY: 0,
          targetScale: 1,
        });
      } else {
        lane.items.forEach((row) => {
          this.itemLookup.set(row.config.exchangeToken, row);
          const card = this.createCardObject({
            title: row.config.displaySymbol,
            subtitle: row.config.name,
            price: row.price,
            accent: row.config.accent,
            icon: row.config.iconLabel,
            tag: row.config.offerTag,
          });
          group.add(card.root);
          cards.push({
            ...card,
            token: row.config.exchangeToken,
            targetX: 0,
            targetZ: 0,
            targetRotY: 0,
            targetScale: 1,
          });
        });
      }

      this.root.add(group);
      this.laneHandles.push({
        id: lane.category.id,
        group,
        cards,
        itemIndex: 0,
        label: lane.category.label,
      });
      this.layoutLane(this.laneHandles[this.laneHandles.length - 1], true);
    });

    this.emptyHint.set(this.laneHandles.length === 0 ? this.emptyMessage() : '');
  }

  private syncActiveLane(activeId: MarketFilter, instant: boolean): void {
    const index = Math.max(
      0,
      this.laneHandles.findIndex((lane) => lane.id === activeId)
    );
    this.activeLaneIndex = index;
    this.targetLaneY = index * LANE_GAP;
    if (instant) {
      this.currentLaneY = this.targetLaneY;
      this.root.position.y = this.currentLaneY + VIEW_LIFT;
    }
    this.updateLaneDepthCue();
    this.updateHud();
    this.emitFocus();
  }

  private updateLaneDepthCue(): void {
    this.laneHandles.forEach((lane, index) => {
      const dist = Math.abs(index - this.activeLaneIndex);
      const active = dist === 0;
      lane.group.visible = dist <= 2;
      lane.group.scale.setScalar(active ? 1 : Math.max(0.72, 1 - dist * 0.12));
      // Légère inclinaison des lanes voisines = sensation de stack navigable
      lane.group.rotation.x = active ? 0 : dist * 0.06;
      for (const card of lane.cards) {
        if (!active) {
          card.faceMat.opacity = Math.max(0.25, 0.55 - dist * 0.12);
          card.bodyMat.opacity = card.faceMat.opacity;
          card.bodyMat.emissiveIntensity = 0.05;
        }
      }
    });
  }

  private layoutLane(lane: LaneHandle, instant: boolean): void {
    lane.cards.forEach((card, index) => {
      const offset = index - lane.itemIndex;
      const abs = Math.abs(offset);
      card.targetX = offset * ITEM_GAP;
      card.targetZ = -abs * 0.12;
      // Rotation douce : le texte reste lisible de face
      card.targetRotY = offset * -0.14;
      // Sélectionnée un peu plus grande ; les autres restent à l’échelle de base
      card.targetScale = abs === 0 ? SELECTED_SCALE : Math.max(0.82, 1 - abs * 0.08);
      if (instant) {
        card.root.position.set(card.targetX, 0, card.targetZ);
        card.root.rotation.y = card.targetRotY;
        card.root.scale.setScalar(card.targetScale);
      }
      card.faceMat.opacity = abs > 2 ? 0.35 : abs === 0 ? 1 : 0.88;
      card.bodyMat.opacity = abs > 2 ? 0.35 : abs === 0 ? 1 : 0.88;
      card.bodyMat.emissiveIntensity = abs === 0 ? 0.45 : 0.08;
    });
  }

  private createCardObject(data: {
    title: string;
    subtitle: string;
    price: string;
    accent: string;
    icon: string;
    tag: string;
  }): Pick<CardHandle, 'root' | 'faceMat' | 'bodyMat' | 'footAura' | 'footAuraMat'> {
    const root = new THREE.Group();
    const accent = new THREE.Color(data.accent);

    const bodyGeom = new THREE.ExtrudeGeometry(
      this.createRoundedRectShape(CARD_W, CARD_H, CARD_RADIUS),
      extrudeOptionsFromBevel(BEVEL.card, CARD_DEPTH)
    );
    // Corps centré : face avant à z = +CARD_DEPTH/2
    bodyGeom.translate(0, 0, -CARD_DEPTH / 2);
    bodyGeom.computeVertexNormals();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0a1220'),
      emissive: accent,
      emissiveIntensity: 0.16,
      metalness: 0.28,
      roughness: 0.42,
      transparent: true,
      opacity: 1,
    });
    root.add(new THREE.Mesh(bodyGeom, bodyMat));

    const faceTexture = this.createCardFaceTexture(data);
    const faceMat = new THREE.MeshBasicMaterial({
      map: faceTexture,
      transparent: true,
      alphaTest: 0.05,
      depthWrite: true,
      depthTest: true,
      toneMapped: false,
      side: THREE.FrontSide,
    });
    // Face texte nettement devant le volume (évite d’être masquée)
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W * 0.9, CARD_H * 0.9),
      faceMat
    );
    face.position.z = CARD_DEPTH / 2 + 0.03;
    face.renderOrder = 2;
    root.add(face);

    // Aura au pied de la card (pas en arrière-plan scène)
    const footAuraMat = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const footAura = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.28, 40),
      footAuraMat
    );
    footAura.rotation.x = -Math.PI / 2;
    footAura.position.set(0, -CARD_H * 0.52, 0.02);
    footAura.renderOrder = 1;
    root.add(footAura);

    // Soft disc under ring for richer foot glow
    const discMat = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(0, -CARD_H * 0.525, 0.01);
    disc.renderOrder = 0;
    disc.userData['isFootDisc'] = true;
    root.add(disc);
    footAura.userData['discMat'] = discMat;

    root.userData['token'] = data.title;
    return { root, faceMat, bodyMat, footAura, footAuraMat };
  }

  private createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
    const w = width / 2;
    const h = height / 2;
    const r = Math.min(radius, w, h);
    const shape = new THREE.Shape();
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);
    return shape;
  }

  private createCardFaceTexture(data: {
    title: string;
    subtitle: string;
    price: string;
    accent: string;
    icon: string;
    tag: string;
  }): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      return new THREE.CanvasTexture(canvas);
    }

    const accent = this.normalizeHexColor(data.accent);
    ctx.clearRect(0, 0, TEX_W, TEX_H);

    const pad = 24;
    const radius = 64;
    this.roundRectPath(ctx, pad, pad, TEX_W - pad * 2, TEX_H - pad * 2, radius);
    ctx.fillStyle = '#0a1220';
    ctx.fill();

    // Sheen accent (RGB sûr, pas de #rrggbbaa fragile)
    ctx.save();
    this.roundRectPath(ctx, pad, pad, TEX_W - pad * 2, TEX_H - pad * 2, radius);
    ctx.clip();
    const sheen = ctx.createLinearGradient(0, pad, 0, TEX_H * 0.5);
    sheen.addColorStop(0, this.hexToRgba(accent, 0.35));
    sheen.addColorStop(1, this.hexToRgba(accent, 0.02));
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, TEX_W, TEX_H);
    ctx.restore();

    ctx.lineWidth = 12;
    ctx.strokeStyle = accent;
    this.roundRectPath(ctx, pad + 6, pad + 6, TEX_W - pad * 2 - 12, TEX_H - pad * 2 - 12, radius - 6);
    ctx.stroke();

    const cx = TEX_W / 2;

    // Polices +1 pt vs cran précédent (cards plus basses → texte un cran plus lisible)
    ctx.beginPath();
    ctx.arc(cx, 168, 70, 0, Math.PI * 2);
    ctx.fillStyle = this.hexToRgba(accent, 0.22);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = accent;
    ctx.stroke();

    this.drawCrispText(ctx, {
      text: (data.icon || '?').slice(0, 2).toUpperCase(),
      x: cx,
      y: 188,
      size: 126,
      weight: 900,
      color: '#ede7d9',
      font: 'Roboto, sans-serif',
    });

    this.drawCrispText(ctx, {
      text: (data.tag || '').toUpperCase().slice(0, 12) || 'ITEM',
      x: cx,
      y: 290,
      size: 60,
      weight: 800,
      color: accent,
      font: 'Roboto, sans-serif',
    });

    this.drawCrispText(ctx, {
      text: (data.title || '—').slice(0, 12),
      x: cx,
      y: 420,
      size: 140,
      weight: 900,
      color: '#ede7d9',
      font: 'Roboto, sans-serif',
    });

    this.drawCrispText(ctx, {
      text: (data.subtitle || '').slice(0, 26) || 'Produit',
      x: cx,
      y: 505,
      size: 64,
      weight: 700,
      color: '#ede7d9',
      font: 'Roboto, sans-serif',
    });

    const bandY = 560;
    const bandH = 140;
    ctx.fillStyle = 'rgba(10, 18, 32, 0.72)';
    this.roundRectPath(ctx, 64, bandY, TEX_W - 128, bandH, 26);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = accent;
    this.roundRectPath(ctx, 64, bandY, TEX_W - 128, bandH, 26);
    ctx.stroke();

    this.drawCrispText(ctx, {
      text: (data.price || '—').slice(0, 18),
      x: cx,
      y: bandY + 92,
      size: 86,
      weight: 900,
      color: '#ede7d9',
      font: 'Roboto, sans-serif',
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.premultiplyAlpha = false;
    texture.needsUpdate = true;
    return texture;
  }

  private normalizeHexColor(value: string): string {
    const raw = (value || '#8b9dad').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
      return raw;
    }
    if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
    }
    return '#8b9dad';
  }

  private hexToRgba(hex: string, alpha: number): string {
    const normalized = this.normalizeHexColor(hex).slice(1);
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private drawCrispText(
    ctx: CanvasRenderingContext2D,
    opts: {
      text: string;
      x: number;
      y: number;
      size: number;
      weight: number;
      color: string;
      font: string;
    }
  ): void {
    if (!opts.text) {
      return;
    }
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${opts.weight} ${opts.size}px ${opts.font}`;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(6, Math.round(opts.size * 0.14));
    ctx.strokeStyle = 'rgba(10, 18, 32,0.92)';
    ctx.strokeText(opts.text, opts.x, opts.y);
    ctx.fillStyle = opts.color;
    ctx.fillText(opts.text, opts.x, opts.y);
    ctx.restore();
  }

  private roundRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, radius);
      return;
    }
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  private disposeLanes(): void {
    for (const lane of this.laneHandles) {
      for (const card of lane.cards) {
        card.faceMat.map?.dispose();
        card.faceMat.dispose();
        card.bodyMat.dispose();
        card.footAuraMat.dispose();
        const discMat = card.footAura.userData['discMat'] as THREE.MeshBasicMaterial | undefined;
        discMat?.dispose();
        card.root.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            const mat = obj.material;
            if (
              mat !== card.faceMat &&
              mat !== card.bodyMat &&
              mat !== card.footAuraMat &&
              mat !== discMat
            ) {
              if (Array.isArray(mat)) {
                mat.forEach((entry) => entry.dispose());
              } else {
                mat.dispose();
              }
            }
          }
        });
      }
      this.root.remove(lane.group);
    }
    this.laneHandles = [];
  }

  private resize(): void {
    const host = this.hostRef().nativeElement;
    const width = Math.max(host.clientWidth, 32);
    const height = Math.max(host.clientHeight, 32);
    if (!this.renderer || !this.camera) {
      return;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.fitCameraToStage(width, height);
  }

  /** Cadrage plein pied : cards actives entièrement visibles, sans clip haut. */
  private fitCameraToStage(width: number, height: number): void {
    if (!this.camera) {
      return;
    }
    const aspect = width / height;
    // Stage showcase souvent large et bas : FOV + distance adaptés à la hauteur
    const fov = aspect > 1.6 ? 40 : aspect > 1.2 ? 38 : 34;
    const distance = aspect > 1.6 ? 1.42 : aspect > 1.2 ? 1.52 : 1.68;
    this.camera.fov = fov;
    // Cible un peu plus haute + caméra légèrement basse = tête des cards dans le cadre
    this.camera.position.set(0, 0.02, distance);
    this.camera.lookAt(0, -0.06, 0);
    this.camera.updateProjectionMatrix();
  }

  private tick = (): void => {
    if (this.disposed) {
      return;
    }
    this.rafId = requestAnimationFrame(this.tick);
    const t = this.clock.getElapsedTime();
    const motion = this.reducedMotion ? 0 : 1;

    this.currentLaneY += (this.targetLaneY - this.currentLaneY) * 0.14;
    this.root.position.y = this.currentLaneY + VIEW_LIFT;
    // Légère respiration du stack
    this.root.position.x = Math.sin(t * 0.35) * 0.012 * motion;

    const active = this.activeLane();
    for (let laneIndex = 0; laneIndex < this.laneHandles.length; laneIndex++) {
      const lane = this.laneHandles[laneIndex];
      const isActiveLane = laneIndex === this.activeLaneIndex;
      for (const card of lane.cards) {
        card.root.position.x += (card.targetX - card.root.position.x) * 0.16;
        card.root.position.z += (card.targetZ - card.root.position.z) * 0.16;
        card.root.rotation.y += (card.targetRotY - card.root.rotation.y) * 0.16;
        const s = card.root.scale.x + (card.targetScale - card.root.scale.x) * 0.16;
        card.root.scale.setScalar(s);

        const selected =
          isActiveLane && lane.cards[lane.itemIndex] === card && !card.token.startsWith('__empty__');
        const discMat = card.footAura.userData['discMat'] as THREE.MeshBasicMaterial | undefined;
        if (selected) {
          card.root.position.y = Math.sin(t * 2.4) * 0.014 * motion;
          card.root.rotation.z = Math.sin(t * 1.6) * 0.025 * motion;
          card.bodyMat.emissiveIntensity = 0.35 + (0.25 + Math.sin(t * 3.2) * 0.2) * motion;
          const pulse = 0.42 + Math.sin(t * 3.4) * 0.16 * motion;
          card.footAuraMat.opacity = pulse;
          card.footAura.scale.setScalar(1 + Math.sin(t * 2.8) * 0.12 * motion);
          card.footAura.rotation.z = t * 0.55 * motion;
          if (discMat) {
            discMat.opacity = pulse * 0.35;
          }
        } else {
          card.root.position.y = Math.sin(t * 1.2 + card.targetX * 3) * 0.01 * motion;
          card.root.rotation.z *= 0.85;
          card.footAuraMat.opacity *= 0.85;
          if (card.footAuraMat.opacity < 0.03) {
            card.footAuraMat.opacity = 0;
          }
          if (discMat) {
            discMat.opacity = card.footAuraMat.opacity * 0.3;
          }
        }
      }
    }

    if (this.sweepLight) {
      this.sweepLight.position.x = Math.sin(t * 1.1) * 0.9;
      this.sweepLight.position.y = 0.25 + Math.cos(t * 0.9) * 0.15;
      this.sweepLight.intensity = 1.1 + Math.sin(t * 2.2) * 0.35 * motion;
    }

    if (this.particles) {
      this.particles.rotation.y = t * 0.08 * motion;
      const positions = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i) + 0.0025 * motion;
        positions.setY(i, y > 1.2 ? -1.2 : y);
      }
      positions.needsUpdate = true;
    }

    this.renderer?.render(this.scene!, this.camera!);
  };

  private activeLane(): LaneHandle | null {
    return this.laneHandles[this.activeLaneIndex] ?? null;
  }

  private shiftItem(delta: number): void {
    const lane = this.activeLane();
    if (!lane || lane.cards.length === 0) {
      return;
    }
    const max = lane.cards.length - 1;
    lane.itemIndex = Math.max(0, Math.min(max, lane.itemIndex + delta));
    this.layoutLane(lane, false);
    this.updateHud();
    this.emitFocus();
  }

  private shiftCategory(delta: number): void {
    if (this.laneHandles.length === 0) {
      return;
    }
    const next = Math.max(0, Math.min(this.laneHandles.length - 1, this.activeLaneIndex + delta));
    if (next === this.activeLaneIndex) {
      return;
    }
    this.activeLaneIndex = next;
    this.targetLaneY = next * LANE_GAP;
    this.updateLaneDepthCue();
    const lane = this.laneHandles[next];
    if (lane) {
      this.categoryChange.emit(lane.id);
      this.updateHud();
      this.emitFocus();
    }
  }

  private updateHud(): void {
    const lane = this.activeLane();
    if (!lane) {
      this.activeLabel.set('');
      this.activeIndexLabel.set('0 / 0');
      this.nextLaneLabel.set(null);
      return;
    }
    this.activeLabel.set(lane.label);
    const total = lane.cards.some((card) => card.token.startsWith('__empty__'))
      ? 0
      : lane.cards.length;
    this.activeIndexLabel.set(total === 0 ? '0 / 0' : `${lane.itemIndex + 1} / ${total}`);
    this.emptyHint.set(total === 0 ? this.emptyMessage() : '');
    const next = this.laneHandles[this.activeLaneIndex + 1];
    this.nextLaneLabel.set(next ? next.label : null);
  }

  private emitFocus(): void {
    const lane = this.activeLane();
    if (!lane) {
      this.itemFocus.emit(null);
      return;
    }
    const card = lane.cards[lane.itemIndex];
    if (!card || card.token.startsWith('__empty__')) {
      this.itemFocus.emit(null);
      return;
    }
    this.itemFocus.emit(this.itemLookup.get(card.token) ?? null);
  }

  private onPointerDown = (event: PointerEvent): void => {
    const canvas = this.canvasRef().nativeElement;
    canvas.setPointerCapture(event.pointerId);
    this.pointerId = event.pointerId;
    this.dragging = true;
    this.suppressClick = false;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragAccumX = 0;
    this.dragAccumY = 0;
    canvas.classList.add('is-dragging');
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.pointerId) {
      return;
    }
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragAccumX += dx;
    this.dragAccumY += dy;

    if (Math.abs(this.dragAccumX) > 28) {
      this.shiftItem(this.dragAccumX > 0 ? -1 : 1);
      this.dragAccumX = 0;
      this.suppressClick = true;
    }
    if (Math.abs(this.dragAccumY) > 28) {
      // Drag vers le bas → catégorie suivante (NFT, Services…)
      this.shiftCategory(this.dragAccumY > 0 ? 1 : -1);
      this.dragAccumY = 0;
      this.suppressClick = true;
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    this.dragging = false;
    this.pointerId = null;
    this.canvasRef().nativeElement.classList.remove('is-dragging');
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const absX = Math.abs(event.deltaX);
    const absY = Math.abs(event.deltaY);
    if (absX > absY && absX > 2) {
      this.shiftItem(event.deltaX > 0 ? 1 : -1);
      return;
    }
    if (absY > 2) {
      this.shiftCategory(event.deltaY > 0 ? 1 : -1);
    }
  };

  private onClick = (): void => {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    const lane = this.activeLane();
    const card = lane?.cards[lane.itemIndex];
    if (!card || card.token.startsWith('__empty__')) {
      return;
    }
    const row = this.itemLookup.get(card.token);
    if (row) {
      this.itemSelect.emit(row);
    }
  };
}
