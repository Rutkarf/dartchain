import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  inject,
} from '@angular/core';
import * as THREE from 'three';
import {
  StarConquestStateService,
  type StarQuestRewardLabel,
} from '../core/services/star-conquest-state.service';
import { StarJoystickBridgeService } from '../core/services/star-joystick-bridge.service';
import {
  bindContainerResize,
  type ContainerResizeBinding,
} from '../core/utils/three-container.util';
import {
  bindWebGlVisibilityPause,
  shouldAnimateWebGl,
} from '../core/utils/three-animation.util';
import {
  applyCanvasLayerStyles,
  createWebGlRenderer,
  viewportSize,
} from '../core/utils/three-webgl.util';
import { StarConquestGraph } from './star-conquest/star-conquest-graph';
import { StarConquestWorld } from './star-conquest/star-conquest-world';
import { StarConquestJoystick, JOYSTICK_ARIA_LABEL } from './star-conquest/star-conquest-joystick';
import {
  clearLabelsFromJoystick,
  placeQuestPanelNearParticle,
  pointInJoystickZone,
  pushPointOutOfJoystick,
  JOY_UI_PAD_PX,
  type JoystickExclusionZone,
} from './star-conquest/star-conquest-joystick-zone';
import {
  layoutQuestsInBand,
  measurePlayableBand,
  separateLabelPositions,
} from './star-conquest/star-conquest-layout';
import { labelOpacityFromDepth } from './star-conquest/star-conquest-depth';
import {
  STAR_CONQUEST_MOCK_QUESTS,
  STAR_CONQUEST_QUEST_COUNT,
} from './star-conquest/star-conquest.mock';
import type { StarQuest } from './star-conquest/star-conquest.model';
import {
  collectUiOccluderRects,
  isQuestFullyOccluded,
  isScreenPointBlockedByUi,
} from './star-conquest/star-conquest-occlusion';
import { formatRewardShort } from './star-conquest/star-conquest-visuals';

/**
 * Arrière-plan global = univers neuronal Star Conquest (z-index 0).
 */
@Component({
  selector: 'app-particle-background',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './particle-background.html',
  styleUrl: './particle-background.css',
})
export class ParticleBackgroundComponent implements AfterViewInit, OnDestroy {
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly conquestState = inject(StarConquestStateService);
  private readonly joyBridge = inject(StarJoystickBridgeService);
  private readonly zone = inject(NgZone);

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private canvas?: HTMLCanvasElement;
  private conquest?: StarConquestGraph;
  /** Groupe parent global — constellations uniquement. */
  private world?: StarConquestWorld;
  /** Joystick dans la bande libre (croix rouge) — hors transform contenu. */
  private joystick?: StarConquestJoystick;
  private quests: StarQuest[] = STAR_CONQUEST_MOCK_QUESTS.map((q) => ({
    ...q,
    position: { ...q.position },
    slot: { ...q.slot },
    connections: [...q.connections],
  }));

  private animationId = 0;
  private animating = false;
  private visibilityBinding?: { unsubscribe: () => void };
  private resizeBinding?: ContainerResizeBinding;
  private layoutObserver?: ResizeObserver;
  private lastViewportW = 0;
  private lastViewportH = 0;
  /** Après init (quelques frames), la structure Quests est figée hors resize viewport. */
  private structureReady = false;
  private initStructurePassesLeft = 3;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private readonly worldPos = new THREE.Vector3();
  private readonly projected = new THREE.Vector3();
  private lastFrameMs = 0;
  private pointerActive = false;
  private focusedId: string | null = null;
  private hoverPreviewId: string | null = null;
  private lastAnchorX = 0;
  private lastAnchorY = 0;
  private occlusionAccMs = 0;
  private labelAccMs = 0;
  private joyHotspot: HTMLElement | null = null;
  private readonly onDismissEvent = (): void => {
    this.zone.run(() => this.clearSelection());
  };
  private readonly onSelectEvent = (event: Event): void => {
    const detail = (event as CustomEvent<{ questId: string }>).detail;
    if (!detail?.questId) return;
    this.zone.run(() => this.selectById(detail.questId, true));
  };
  private readonly onHoverEvent = (event: Event): void => {
    const detail = (event as CustomEvent<{ questId: string | null }>).detail;
    if (this.conquestState.selected()) return;
    this.zone.run(() => {
      const id = detail?.questId ?? null;
      this.hoverPreviewId = id;
      this.conquest?.setFocus(id);
      this.refreshRewardLabels();
      if (this.canvas) this.canvas.style.cursor = id ? 'pointer' : 'default';
    });
  };

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.initWebGl());
  }

  private initWebGl(): void {
    // alpha:true → le fond CSS organique transparait ; particules inchangées
    const created = createWebGlRenderer({ alpha: true });
    if (!created) return;

    try {
      this.renderer = created.renderer;
      this.canvas = created.canvas;
      const { width, height } = viewportSize();

      this.scene = new THREE.Scene();
      this.scene.background = null;
      this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
      this.camera.position.z = 160;

      this.renderer.setSize(width, height, false);
      this.renderer.setPixelRatio(1);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.autoClear = true;

      console.log('[BACKGROUND] Active Angular component:', this.constructor.name);
      console.log(
        '[BACKGROUND] Renderer alpha:',
        this.renderer.getContextAttributes()?.alpha
      );
      console.log('[BACKGROUND] Scene fog:', this.scene.fog);
      console.log('[BACKGROUND] Scene background:', this.scene.background);
      console.log(
        '[BACKGROUND] Canvas computed background:',
        getComputedStyle(created.canvas).backgroundColor
      );

      applyCanvasLayerStyles(created.canvas, 'background');
      created.canvas.style.pointerEvents = 'auto';
      created.canvas.style.touchAction = 'none';
      created.canvas.style.cursor = 'default';
      created.canvas.style.background = 'transparent';
      created.canvas.setAttribute('data-star-conquest', 'canvas');
      created.canvas.setAttribute('aria-label', 'Univers neuronal Star Conquest');
      created.canvas.removeAttribute('title');
      this.hostRef.nativeElement.appendChild(created.canvas);

      this.world = new StarConquestWorld();
      this.scene.add(this.world.root);
      this.conquest = new StarConquestGraph(this.quests);
      this.world.attachContent(this.conquest.group);
      this.joystick = new StarConquestJoystick();
      this.scene.add(this.joystick.group);
      this.joyBridge.register(this.joystick);
      this.relayoutBackground();
      requestAnimationFrame(() => {
        this.relayoutBackground();
        requestAnimationFrame(() => this.relayoutBackground());
      });

      this.bindPointer(created.canvas);
      this.bindUiWatchers();
      window.addEventListener('resize', this.onWindowLayout, { passive: true });
      window.addEventListener('star-conquest-dismiss', this.onDismissEvent);
      window.addEventListener('star-conquest-select', this.onSelectEvent);
      window.addEventListener('star-conquest-hover', this.onHoverEvent);

      this.resizeBinding = bindContainerResize(
        this.hostRef.nativeElement,
        (nextWidth, nextHeight) => this.applyRendererSize(nextWidth, nextHeight),
        viewportSize()
      );

      this.visibilityBinding = bindWebGlVisibilityPause(
        () => this.pauseAnimation(),
        () => this.resumeAnimation()
      );

      this.lastFrameMs = performance.now();
      this.renderFrame();
      this.resumeAnimation();

      if (this.quests.length !== STAR_CONQUEST_QUEST_COUNT) {
        console.warn(
          `[star-conquest] Attendu ${STAR_CONQUEST_QUEST_COUNT} quests, reçu ${this.quests.length}`
        );
      }
    } catch (error) {
      console.error('[particle-background] Initialisation impossible.', error);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('star-conquest-dismiss', this.onDismissEvent);
    window.removeEventListener('star-conquest-select', this.onSelectEvent);
    window.removeEventListener('star-conquest-hover', this.onHoverEvent);
    window.removeEventListener('resize', this.onWindowLayout);
    this.layoutObserver?.disconnect();
    this.unbindPointer();
    this.visibilityBinding?.unsubscribe();
    this.resizeBinding?.unsubscribe();
    this.pauseAnimation();
    this.conquestState.clear();
    this.conquestState.setHiddenQuests([]);
    this.conquestState.setRewardLabels([]);

    this.conquest?.dispose();
    if (this.joystick) {
      this.joyBridge.unregister(this.joystick);
      this.scene?.remove(this.joystick.group);
      this.joystick.dispose();
      this.joystick = undefined;
    }
    if (this.joyHotspot) {
      this.joyHotspot.remove();
      this.joyHotspot = null;
    }
    if (this.world) {
      this.world.dispose();
      this.scene?.remove(this.world.root);
      this.world = undefined;
    }
    this.renderer?.dispose();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.clearSelection();
  }

  private readonly onWindowLayout = (): void => {
    this.relayoutBackground();
  };

  private bindUiWatchers(): void {
    if (typeof ResizeObserver === 'undefined') return;
    // Repli/dépli Angular : chrome only — jamais de relayout de la structure Quests
    this.layoutObserver = new ResizeObserver(() => {
      this.syncUiChrome();
    });
    for (const sel of [
      'app-navbar',
      'app-swap',
      'app-showcase-tab-showcase',
      'app-dock-tabs-dock-tabs',
      'app-graph',
      '.app-main-layout',
    ]) {
      const el = document.querySelector(sel);
      if (el) this.layoutObserver.observe(el);
    }
  }

  /**
   * Relayout structure uniquement à l’init (quelques passes) ou si le viewport change.
   * Déplier/replier les onglets ne doit pas déplacer les particules.
   */
  private relayoutBackground(): void {
    if (!this.camera || !this.conquest) return;

    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    const viewportChanged =
      Math.abs(vw - this.lastViewportW) > 1 || Math.abs(vh - this.lastViewportH) > 1;
    const allowStructure =
      !this.structureReady || viewportChanged || this.initStructurePassesLeft > 0;

    if (allowStructure) {
      this.layoutQuestStructure();
      this.lastViewportW = vw;
      this.lastViewportH = vh;
      if (this.initStructurePassesLeft > 0) {
        this.initStructurePassesLeft -= 1;
      }
      if (this.initStructurePassesLeft <= 0) {
        this.structureReady = true;
      }
    }

    this.syncUiChrome();
  }

  /** Placement monde des Quests — ancré, indépendant de l’état des panneaux Angular. */
  private layoutQuestStructure(): void {
    if (!this.camera || !this.conquest) return;
    const floorPeek =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--floor-peek-height')
      ) || 64;
    const band = measurePlayableBand(floorPeek);
    layoutQuestsInBand(this.quests, band, this.camera, 0);
    this.conquest.applyPositions(this.quests);
    this.conquest.setSafeScreenBand(
      band.topPx,
      Math.max(band.topPx + 40, band.viewportH - 8),
      band.worldLeftPx,
      band.worldRightPx
    );
    this.updateTravelBoundsFromQuests();
  }

  /** Joystick / occlusion / panel — suit l’UI sans bouger la constellation. */
  private syncUiChrome(): void {
    if (!this.camera) return;
    const floorPeek =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--floor-peek-height')
      ) || 64;
    this.joystick?.layoutInGapAboveFloor(this.camera, floorPeek);
    this.refreshOcclusion();
    this.syncPanelAnchor();
    this.renderFrame();
  }

  /**
   * Limites joystick = AABB monde des Quests + marge, pour que chaque particule
   * soit atteignable en pannant dans sa direction (y compris hors écran bas).
   */
  private updateTravelBoundsFromQuests(): void {
    if (!this.camera || !this.world || !this.conquest) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const tmp = this.worldPos;
    for (const q of this.conquest.getAllQuests()) {
      const w = this.conquest.getWorldPosition(q.id, tmp);
      if (!w) continue;
      minX = Math.min(minX, w.x);
      maxX = Math.max(maxX, w.x);
      minY = Math.min(minY, w.y);
      maxY = Math.max(maxY, w.y);
    }
    if (!Number.isFinite(minX)) return;
    const margin = 36;
    const txMax = Math.max(48, Math.max(Math.abs(minX), Math.abs(maxX)) + margin);
    const tyMax = Math.max(48, Math.max(Math.abs(minY), Math.abs(maxY)) + margin);
    this.world.setTravelBounds(txMax, tyMax, 32);
  }

  private joyPointerId: number | null = null;
  private joyOriginX = 0;
  private joyOriginY = 0;
  private joyMoved = false;

  private bindPointer(canvas: HTMLCanvasElement): void {
    this.zone.runOutsideAngular(() => {
      canvas.addEventListener('pointermove', this.onPointerMove, { passive: true });
      canvas.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
      canvas.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    });
    this.pointerActive = true;
  }

  private unbindPointer(): void {
    if (!this.canvas || !this.pointerActive) return;
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.unbindJoyWindow();
    this.pointerActive = false;
  }

  private bindJoyWindow(): void {
    window.addEventListener('pointermove', this.onJoyMove);
    window.addEventListener('pointerup', this.onJoyUp);
    window.addEventListener('pointercancel', this.onJoyUp);
  }

  private unbindJoyWindow(): void {
    window.removeEventListener('pointermove', this.onJoyMove);
    window.removeEventListener('pointerup', this.onJoyUp);
    window.removeEventListener('pointercancel', this.onJoyUp);
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.conquestState.worldNavigating() || this.joyPointerId !== null) return;
    if (event.pointerType === 'touch') return;

    // Sélection ouverte : pas de parallaxe / pull (la structure ne doit pas bouger)
    if (this.conquestState.selected()) {
      this.conquest?.setPointerNdc(null);
      const joy = this.joyBridge.get();
      const onJoy = joy?.hitTest(event.clientX, event.clientY) ?? false;
      joy?.setHover(onJoy);
      this.syncJoyAria(onJoy && this.joyPointerId === null, joy);
      if (this.canvas) this.canvas.style.cursor = onJoy ? 'grab' : 'default';
      return;
    }

    if (this.canvas && this.camera) {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.conquest?.setPointerNdc({ x: this.pointerNdc.x, y: this.pointerNdc.y });
      }
    }
    const joy = this.joyBridge.get();
    const onJoy = joy?.hitTest(event.clientX, event.clientY) ?? false;
    joy?.setHover(onJoy);
    // Label aria : survol uniquement (pas pendant un click/drag)
    this.syncJoyAria(onJoy && this.joyPointerId === null, joy);
    if (onJoy) {
      if (this.canvas) this.canvas.style.cursor = 'grab';
      return;
    }
    const hit = this.hitTest(event.clientX, event.clientY);
    if (this.canvas) {
      this.canvas.style.cursor = hit ? 'pointer' : 'default';
    }
    this.zone.run(() => {
      if (!hit) {
        if (this.hoverPreviewId) {
          this.hoverPreviewId = null;
          this.conquest?.setFocus(null);
        }
        return;
      }
      if (this.hoverPreviewId === hit.questId) return;
      this.hoverPreviewId = hit.questId;
      this.conquest?.setFocus(hit.questId);
      this.refreshRewardLabels();
    });
  };

  private readonly onPointerLeave = (): void => {
    if (this.joyPointerId !== null) return;
    if (this.canvas) this.canvas.style.cursor = 'default';
    this.conquest?.setPointerNdc(null);
    this.joyBridge.get()?.setHover(false);
    this.syncJoyAria(false);
    if (this.conquestState.selected()) return;
    this.zone.run(() => {
      this.hoverPreviewId = null;
      this.conquest?.setFocus(null);
      this.refreshRewardLabels();
    });
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.conquestState.worldNavigating()) return;
    const isTouch = event.pointerType === 'touch' || event.pointerType === 'pen';
    if (!isTouch && event.button !== 0) return;
    if (isScreenPointBlockedByUi(event.clientX, event.clientY)) return;

    // Quests d’abord (y compris sous le floor) — le stick ne doit pas les bloquer
    const questHit = this.hitTest(event.clientX, event.clientY);
    const joy = this.joyBridge.get();
    const onJoy = joy?.hitTest(event.clientX, event.clientY) ?? false;

    if (questHit) {
      this.zone.run(() => {
        event.preventDefault();
        const quest = this.conquest?.getQuest(questHit.questId) ?? null;
        if (!quest) return;
        this.applySelection(quest, questHit.worldPosition);
      });
      return;
    }

    if (onJoy && joy) {
      event.preventDefault();
      event.stopPropagation();
      this.joyPointerId = event.pointerId;
      this.joyOriginX = event.clientX;
      this.joyOriginY = event.clientY;
      this.joyMoved = false;
      joy.setHover(true);
      joy.setDragging(true);
      this.syncJoyAria(false);
      if (this.canvas) this.canvas.style.cursor = 'grabbing';
      this.bindJoyWindow();
      return;
    }

    this.zone.run(() => {
      if (this.conquestState.selected() || this.focusedId) {
        event.preventDefault();
        this.clearSelection();
      }
    });
  };

  private readonly onJoyMove = (event: PointerEvent): void => {
    if (this.joyPointerId !== null && event.pointerId !== this.joyPointerId) return;
    const dx = event.clientX - this.joyOriginX;
    const dy = event.clientY - this.joyOriginY;
    const dist = Math.hypot(dx, dy);
    if (dist >= 7) this.joyMoved = true;
    if (!this.joyMoved) return;
    const radius = 22;
    const len = Math.max(dist, 0.0001);
    const clamped = Math.min(dist, radius);
    const nx = (dx / len) * (clamped / radius);
    const ny = (dy / len) * (clamped / radius);
    this.zone.run(() => this.conquestState.setStick(nx, ny));
    this.syncJoyAria(false); // reste masqué pendant le drag
  };

  private readonly onJoyUp = (event: PointerEvent): void => {
    if (this.joyPointerId !== null && event.pointerId !== this.joyPointerId) return;
    const wasDrag = this.joyMoved;
    this.unbindJoyWindow();
    this.joyPointerId = null;
    this.joyMoved = false;
    const joy = this.joyBridge.get();
    joy?.clearKnob();
    joy?.setHover(false);
    const stillOnJoy = joy?.hitTest(event.clientX, event.clientY) ?? false;
    joy?.setHover(stillOnJoy);
    // Réapparaît au survol après le click
    this.syncJoyAria(stillOnJoy, joy);
    this.zone.run(() => this.conquestState.endStick());
    if (this.canvas) this.canvas.style.cursor = stillOnJoy ? 'grab' : 'default';
    if (!wasDrag) {
      joy?.pulseTap();
      this.zone.run(() => this.conquestState.openScanner());
    } else {
      // Lâcher après pan → vue + particules recentrées dans le viewport app
      this.recenterAfterJoystick();
    }
  };

  /** Caméra → centre ; particules → ancrage layout (250×550). */
  private recenterAfterJoystick(): void {
    this.world?.resetView(false);
    this.conquest?.restoreLayoutHomes();
    if (this.conquest) {
      const byId = new Map(this.conquest.getAllQuests().map((q) => [q.id, q]));
      for (const q of this.quests) {
        const g = byId.get(q.id);
        if (!g) continue;
        q.position = { ...g.position };
      }
    }
    this.updateTravelBoundsFromQuests();
  }

  /** Tooltip + aria : survol uniquement, jamais pendant le click. */
  private syncJoyAria(active: boolean, joy?: StarConquestJoystick | null): void {
    this.syncJoyHotspot(active, active ? (joy ?? this.joyBridge.get()) : null);
  }

  private syncJoyHotspot(active: boolean, joy: StarConquestJoystick | null): void {
    if (!active || !joy) {
      if (this.joyHotspot) {
        this.joyHotspot.hidden = true;
        this.joyHotspot.style.display = 'none';
        this.joyHotspot.removeAttribute('title');
        this.joyHotspot.removeAttribute('aria-label');
        this.joyHotspot.setAttribute('aria-hidden', 'true');
      }
      return;
    }
    if (!this.joyHotspot) {
      const tip = document.createElement('div');
      tip.className = 'star-conquest-joy-hotspot';
      tip.setAttribute('role', 'tooltip');
      const label = document.createElement('span');
      label.className = 'star-conquest-joy-tip';
      label.textContent = JOYSTICK_ARIA_LABEL;
      tip.appendChild(label);
      // Hors host particles (z=0) → au-dessus du floor Three.js (z=1)
      document.body.appendChild(tip);
      this.joyHotspot = tip;
    }
    const tipEl = this.joyHotspot;
    const labelEl = tipEl.querySelector('.star-conquest-joy-tip') as HTMLElement | null;
    const c = joy.getScreenCenter();
    // Bord bas du disque visuel (hitbox plus large) + 2px
    const visualR = Math.max(10, Math.min(18, joy.hitRadiusPx() * 0.28));
    const left = c.x;
    const top = c.y + visualR + 2;
    tipEl.hidden = false;
    tipEl.style.cssText =
      `position:fixed;left:${left}px;top:${top}px;` +
      'transform:translate(-50%,0);z-index:2;border:0;padding:0;margin:0;' +
      'pointer-events:none;display:block;text-align:center;';
    if (labelEl) {
      labelEl.textContent = JOYSTICK_ARIA_LABEL;
      labelEl.style.cssText =
        'display:inline-block;white-space:nowrap;' +
        'padding:2px 5px;border-radius:3px;' +
        'font:600 5px/1.2 ui-monospace,SF Mono,Menlo,monospace;letter-spacing:0.02em;' +
        'color:#f8fcff;background:rgba(8,12,18,0.94);border:1px solid rgba(232,240,248,0.65);' +
        'box-shadow:0 1px 8px rgba(0,0,0,0.45),0 0 6px rgba(176,232,240,0.22);' +
        'pointer-events:none;';
    }
    tipEl.setAttribute('aria-hidden', 'false');
    tipEl.setAttribute('aria-label', JOYSTICK_ARIA_LABEL);
    tipEl.title = JOYSTICK_ARIA_LABEL;
  }

  private hitTest(clientX: number, clientY: number) {
    if (!this.camera || !this.conquest || !this.canvas) return null;
    const band = measurePlayableBand(
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--floor-peek-height')
      ) || 64
    );
    // Autorise toute la hauteur (y compris sous le floor) — seules les Quests hors bande haute sont exclues
    if (clientY < band.topPx - 8) return null;

    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    // Hit plus large en bas (floor) pour les racines underFloor
    const nearFloor = clientY >= band.floorTopPx - 12;
    const radiusPx = nearFloor
      ? Math.max(28, Math.min(40, rect.width * 0.16))
      : Math.max(18, Math.min(28, rect.width * 0.1));
    return this.conquest.pick(
      this.raycaster,
      this.camera,
      this.pointerNdc,
      clientX,
      clientY,
      radiusPx
    );
  }

  private applySelection(quest: StarQuest, world: THREE.Vector3): void {
    this.focusedId = quest.id;
    this.hoverPreviewId = null;
    // Pas de pull/parallaxe pendant la sélection — structure figée
    this.conquest?.setPointerNdc(null);
    this.conquest?.setFocus(quest.id);
    this.conquest?.pulseFocus();
    this.lastAnchorX = 0;
    this.lastAnchorY = 0;
    const anchor = this.projectToScreen(world);
    this.lastAnchorX = anchor.x;
    this.lastAnchorY = anchor.y;
    this.conquestState.show(quest, anchor.x, anchor.y, anchor.compact);
    this.refreshRewardLabels();
  }

  private selectById(questId: string, _fromScanner = false): void {
    if (!this.conquest) return;
    const quest = this.conquest.getQuest(questId);
    const world = this.conquest.getWorldPosition(questId, this.worldPos);
    if (!quest || !world) return;
    // Jamais de pan caméra / déplacement structure au clic — uniquement le joystick
    this.applySelection(quest, world);
    this.conquest.pulseFocus();
  }

  private clearSelection(): void {
    this.focusedId = null;
    this.hoverPreviewId = null;
    this.conquest?.setFocus(null);
    this.conquestState.clear();
    if (this.canvas) this.canvas.style.cursor = 'default';
    this.refreshRewardLabels();
  }

  private refreshOcclusion(): void {
    if (!this.conquest || !this.camera) return;
    this.world?.content.updateMatrixWorld(true);
    const rects = collectUiOccluderRects();
    const projected = this.conquest.projectAllToScreen(this.camera);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const band = measurePlayableBand(
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--floor-peek-height')
      ) || 64
    );
    const hidden: StarQuest[] = [];
    const seen = new Set<string>();
    for (const p of projected) {
      const quest = this.conquest.getQuest(p.id);
      if (!quest) continue;
      const offScreen =
        p.x < -12 ||
        p.x > vw + 12 ||
        p.y < band.topPx - 20 ||
        p.y > vh + 8;
      const occluded = isQuestFullyOccluded(p.x, p.y, rects, 11);
      if (!offScreen && !occluded) continue;
      if (seen.has(quest.id)) continue;
      seen.add(quest.id);
      hidden.push(quest);
    }
    // Quests filtrées par projection z hors frustum
    for (const q of this.conquest.getAllQuests()) {
      if (seen.has(q.id)) continue;
      const w = this.conquest.getWorldPosition(q.id, this.worldPos);
      if (!w) continue;
      this.projected.copy(w).project(this.camera);
      if (this.projected.z < -1 || this.projected.z > 1) {
        seen.add(q.id);
        hidden.push(q);
      }
    }
    this.zone.run(() => this.conquestState.setHiddenQuests(hidden));
    this.refreshRewardLabels();
  }

  private refreshRewardLabels(): void {
    if (!this.conquest || !this.camera) return;
    const projected = this.conquest.projectAllToScreen(this.camera);
    const band = measurePlayableBand(
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--floor-peek-height')
      ) || 64
    );
    const focusId = this.focusedId ?? this.hoverPreviewId;
    const rects = collectUiOccluderRects();
    const joyZone = this.getJoystickExclusionZone();

    type L = StarQuestRewardLabel & { x: number; y: number };
    const labels: L[] = [];

    for (const p of projected) {
      // Labels hors viewport / hors bande : masqués (pas de clamp centre)
      if (p.x < -6 || p.x > band.viewportW + 6) continue;
      if (p.y < band.topPx - 2 || p.y > band.viewportH + 4) continue;
      const isFocus = focusId === p.id;
      // Zone très basse : labels autorisés pour les racines underFloor + focus
      const quest = this.conquest.getQuest(p.id);
      const underFloor = quest?.underFloor === true;
      if (p.y > band.floorTopPx + 8 && !isFocus && !underFloor) continue;
      const occluded = isQuestFullyOccluded(p.x, p.y, rects, 8);
      // underGraph : souvent sous app-graph — label OK si focus, sinon dim/occulté
      if (occluded && !isFocus && !quest?.underGraph) continue;
      const nearEdge =
        p.x < 10 ||
        p.x > band.viewportW - 10 ||
        p.y > band.floorTopPx - 4 ||
        p.y > band.viewportH - 18;
      let lx = p.x + 10;
      let ly = p.y;
      if (joyZone) {
        const cleared = pushPointOutOfJoystick(lx, ly, joyZone, JOY_UI_PAD_PX + 4);
        lx = cleared.x;
        ly = cleared.y;
        // Si encore trop proche après push (coin étroit) : forcer à droite du stick
        if (pointInJoystickZone(lx, ly, joyZone, JOY_UI_PAD_PX)) {
          lx = joyZone.x + joyZone.r + JOY_UI_PAD_PX + 8;
          ly = Math.min(ly, joyZone.y - joyZone.r * 0.35);
        }
      }
      if (lx >= 0 && lx <= band.viewportW) {
        lx = Math.max(10, Math.min(band.viewportW - 10, lx));
      }
      if (ly >= band.topPx && ly <= band.viewportH) {
        ly = Math.max(band.topPx + 2, Math.min(band.viewportH - 4, ly));
      }
      // Re-check après clamp viewport
      if (joyZone && pointInJoystickZone(lx, ly, joyZone, JOY_UI_PAD_PX)) {
        if (!isFocus) continue;
        lx = Math.min(band.viewportW - 10, joyZone.x + joyZone.r + JOY_UI_PAD_PX + 10);
        ly = Math.max(band.topPx + 2, joyZone.y - joyZone.r - JOY_UI_PAD_PX - 8);
        if (pointInJoystickZone(lx, ly, joyZone, JOY_UI_PAD_PX)) continue;
      }
      labels.push({
        id: p.id,
        x: lx,
        y: ly,
        text: formatRewardShort(p.reward),
        family: p.family,
        active: isFocus,
        dim: nearEdge && !isFocus,
        reward: p.reward,
        depth: p.depth,
        opacity: isFocus
          ? 1
          : labelOpacityFromDepth(p.depth, p.reward) * (nearEdge ? 0.55 : 1),
      });
    }

    separateLabelPositions(labels, 16, 6);
    if (joyZone) clearLabelsFromJoystick(labels, joyZone, JOY_UI_PAD_PX + 2);
    for (const l of labels) {
      if (l.x < 4 || l.x > band.viewportW - 4) continue;
      l.x = Math.max(8, Math.min(band.viewportW - 8, l.x));
      l.y = Math.max(band.topPx + 1, Math.min(band.viewportH - 4, l.y));
      if (joyZone) {
        const p = pushPointOutOfJoystick(l.x, l.y, joyZone, JOY_UI_PAD_PX + 2);
        l.x = p.x;
        l.y = p.y;
      }
    }

    this.zone.run(() =>
      this.conquestState.setRewardLabels(
        labels.filter((l) => {
          if (l.x < 4 || l.x > band.viewportW - 4) return false;
          if (joyZone && pointInJoystickZone(l.x, l.y, joyZone, JOY_UI_PAD_PX)) {
            return false;
          }
          return true;
        })
      )
    );
  }

  private getJoystickExclusionZone(): JoystickExclusionZone | null {
    const joy = this.joyBridge.get();
    if (!joy || !this.camera) return null;
    return joy.getExclusionZone(this.camera, JOY_UI_PAD_PX);
  }

  private projectToScreen(
    world: THREE.Vector3
  ): { x: number; y: number; compact: boolean } {
    if (!this.camera) return { x: 16, y: 16, compact: false };
    this.projected.copy(world).project(this.camera);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sx = (this.projected.x * 0.5 + 0.5) * vw;
    const sy = (-this.projected.y * 0.5 + 0.5) * vh;

    let panelW = Math.min(156, vw - 10);
    let panelH = Math.min(112, vh - 10);
    const margin = 6;
    const joyZone = this.getJoystickExclusionZone();
    const preferred =
      this.lastAnchorX || this.lastAnchorY
        ? { x: this.lastAnchorX, y: this.lastAnchorY }
        : null;

    const placed = placeQuestPanelNearParticle(
      sx,
      sy,
      panelW,
      panelH,
      joyZone,
      vw,
      vh,
      margin,
      JOY_UI_PAD_PX,
      preferred
    );
    return { x: placed.x, y: placed.y, compact: placed.compact };
  }

  private syncPanelAnchor(): void {
    if (!this.focusedId || !this.conquest || !this.conquestState.selected()) return;
    const world = this.conquest.getWorldPosition(this.focusedId, this.worldPos);
    if (!world) return;
    const anchor = this.projectToScreen(world);
    if (
      Math.abs(anchor.x - this.lastAnchorX) < 2.5 &&
      Math.abs(anchor.y - this.lastAnchorY) < 2.5 &&
      this.conquestState.panelCompact() === anchor.compact
    ) {
      return;
    }
    this.lastAnchorX = anchor.x;
    this.lastAnchorY = anchor.y;
    this.zone.run(() =>
      this.conquestState.move(anchor.x, anchor.y, anchor.compact)
    );
  }

  private animate = (): void => {
    if (!this.animating || !this.scene || !this.camera || !this.renderer) return;
    this.animationId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const delta = now - this.lastFrameMs;
    this.lastFrameMs = now;

    if (shouldAnimateWebGl()) {
      // Stick → transform globale du contenu (pas le floor / joystick)
      if (this.world) {
        const stick = this.conquestState.stick();
        if (this.conquestState.worldNavigating()) {
          this.world.setStick(stick.x, stick.y);
        } else if (this.world.isDragging()) {
          this.world.releaseStick();
        }
        this.world.tick(delta);
        this.world.root.updateMatrixWorld(true);
        if (this.camera) {
          this.world.applyToCamera(this.camera, 160);
          const floorPeek =
            parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(
                '--floor-peek-height'
              )
            ) || 64;
          // Rebond uniquement hors drag — sinon les Quests bas restent inaccessibles
          if (this.conquest && !this.conquestState.worldNavigating()) {
            const band = measurePlayableBand(floorPeek);
            const projected = this.conquest.projectAllToScreen(this.camera);
            this.world.applyViewportEdgeBounce(projected, band);
          } else {
            this.world.clearEdgeBounce();
          }
          // Recalcule les limites de pan (dérive peut éloigner les Quests)
          if (this.conquestState.worldNavigating()) {
            this.updateTravelBoundsFromQuests();
          }
          this.joystick?.layoutInGapAboveFloor(this.camera, floorPeek);
        }
      }
      if (this.joystick) {
        const stick = this.conquestState.stick();
        if (this.conquestState.worldNavigating()) {
          this.joystick.setKnob(stick.x, stick.y);
        } else {
          this.joystick.clearKnob();
        }
        this.joystick.tick(delta);
        if (this.camera) this.joystick.refreshScreenFromCamera(this.camera);
        const zone = this.getJoystickExclusionZone();
        if (zone) {
          const prev = this.conquestState.joyExclusion();
          if (
            !prev ||
            Math.abs(prev.left - zone.left) > 2 ||
            Math.abs(prev.top - zone.top) > 2 ||
            Math.abs(prev.right - zone.right) > 2 ||
            Math.abs(prev.bottom - zone.bottom) > 2
          ) {
            this.zone.run(() =>
              this.conquestState.setJoyExclusion({
                left: zone.left,
                top: zone.top,
                right: zone.right,
                bottom: zone.bottom,
                x: zone.x,
                y: zone.y,
              })
            );
          }
        }
        if (zone && this.conquest) {
          this.conquest.setJoystickExclusion(zone.x, zone.y, zone.r, zone);
        } else {
          this.conquest?.clearJoystickExclusion();
        }
      }
      if (this.conquest) {
        this.conquest.tick(delta, this.camera);
      }
      if (this.focusedId && this.conquestState.selected()) {
        this.syncPanelAnchor();
      }
      this.occlusionAccMs += delta;
      this.labelAccMs += delta;
      if (this.occlusionAccMs > 280) {
        this.occlusionAccMs = 0;
        this.labelAccMs = 0;
        this.refreshOcclusion();
      } else if (this.labelAccMs > 48) {
        this.labelAccMs = 0;
        this.refreshRewardLabels();
      }
    }
    this.renderFrame();
  };

  private renderFrame(): void {
    if (!this.scene || !this.camera || !this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }

  private pauseAnimation(): void {
    this.renderFrame();
    this.animating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private resumeAnimation(): void {
    if (this.animating) return;
    this.animating = true;
    this.lastFrameMs = performance.now();
    this.animate();
  }

  private applyRendererSize(width: number, height: number): void {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(1);
    this.relayoutBackground();
  }
}
