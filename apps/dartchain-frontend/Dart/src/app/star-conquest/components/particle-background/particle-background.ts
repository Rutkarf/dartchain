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
} from '@star-conquest/services/star-conquest-state.service';
import {
  bindContainerResize,
  type ContainerResizeBinding,
} from '../../../core/utils/three-container.util';
import {
  applyCanvasLayerStyles,
  createWebGlRenderer,
} from '../../../core/utils/three-webgl.util';
import {
  WebGlAnimationSchedulerService,
  type WebGlFrameContext,
} from '../../../core/utils/web-gl-animation-scheduler.service';
import { CombinedPerfHudService } from '../../../core/utils/combined-perf-hud.service';
import {
  DualContextGovernorService,
  shouldRunScActiveSimTick,
} from '../../../core/utils/dual-context-governor.service';
import {
  STAR_CONQUEST_OVERLAY,
  STAR_CONQUEST_SCALE,
  STAR_CONQUEST_SCALE_TIER,
  starConquestDprCap,
  starConquestOverlayBox,
  type StarConquestGpuQuality,
} from '@star-conquest/star-conquest-scale';
import { StarConquestGraph, type StarConquestHit } from '@star-conquest/star-conquest-graph';
import { StarConquestWorld, CAMERA_Z } from '@star-conquest/star-conquest-world';
import {
  placeQuestPanelNearParticle,
  type JoystickExclusionZone,
} from '@star-conquest/star-conquest-joystick-zone';
import {
  layoutQuestsInBand,
  measurePlayableBand,
  readFloorPeekPx,
} from '@star-conquest/star-conquest-layout';
import { STAR_CONQUEST_MOCK_QUESTS } from '@star-conquest/star-conquest.mock';
import type { StarQuest } from '@star-conquest/star-conquest.model';
import {
  collectUiOccluderRects,
  isQuestFullyOccluded,
  isScreenPointBlockedByUi,
} from '@star-conquest/star-conquest-occlusion';
import { formatRewardShort } from '@star-conquest/star-conquest-visuals';
import {
  DEFAULT_QUEST_VISUALIZATION_MODE,
  mapQualityToQuestGraphQuality,
} from '@world-map/map-configuration';
import { environment } from '../../../../environments/environment';
import { KnowledgeGraphOrchestratorService } from './knowledge-graph/knowledge-graph-orchestrator.service';
import { QUEST_ORBIT_CONFIG } from './knowledge-graph/knowledge-graph.config';
import { StarConquestProgressService } from '@star-conquest/services/star-conquest-progress.service';
import { StarConquestUniverseService } from '@star-conquest/services/star-conquest-universe.service';
import { StarConquestFacade } from '@star-conquest/services/star-conquest.facade';
import { starConquestUniverseTheme } from '@star-conquest/star-conquest-universes.config';
import {
  starConquestFramePerfHints,
  starConquestLayoutHeight,
  starConquestLayoutWidth,
  starConquestNdcToLayout,
  starConquestRenderSize,
} from '@star-conquest/star-conquest-viewport.util';
import { STAR_CONQUEST_FEATURES } from '@star-conquest/star-conquest-features';
import { mergeStarConquestKeyPan, starConquestKeyToPanDelta } from '@star-conquest/star-conquest-keyboard';
import { idleStarConquestPanIntent } from '@star-conquest/star-conquest-input';
import { recordStarConquestDiag } from '@star-conquest/star-conquest-diagnostics';
import {
  beginStarConquestPointerStroke,
  starConquestShouldResetStickOnCancel,
  updateStarConquestPointerStroke,
  type StarConquestPointerStroke,
} from '@star-conquest/star-conquest-pointer-safety';
import {
  STAR_CONQUEST_ORBIT_DOUBLE_TAP_MS,
  screenDeltaToWorldPan,
  starConquestOrbitShouldPick,
} from '@star-conquest/star-conquest-orbit';
import type { Subscription } from 'rxjs';

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
  private readonly kgOrchestrator = inject(KnowledgeGraphOrchestratorService);
  private readonly universeService = inject(StarConquestUniverseService);
  private readonly progress = inject(StarConquestProgressService);
  private readonly facade = inject(StarConquestFacade);
  private readonly zone = inject(NgZone);
  private readonly animationScheduler = inject(WebGlAnimationSchedulerService);
  private readonly dualContextGovernor = inject(DualContextGovernorService);
  private readonly combinedPerfHud = inject(CombinedPerfHudService);
  private facadeSubs: Subscription[] = [];

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private canvas?: HTMLCanvasElement;
  private conquest?: StarConquestGraph;
  /** Groupe parent global — constellations uniquement. */
  private world?: StarConquestWorld;
  private quests: StarQuest[] = [];

  private schedulerUnregister?: () => void;
  private resizeBinding?: ContainerResizeBinding;
  private layoutObserver?: ResizeObserver;
  private uiChromeRafId = 0;
  private gpuQuality: StarConquestGpuQuality = 'ultra-low';
  private hiddenQuestSignature = '';
  private rewardLabelSignature = '';
  private lastViewportW = 0;
  private lastViewportH = 0;
  /** Après init (quelques frames), la structure Quests est figée hors resize viewport. */
  private structureReady = false;
  private initStructurePassesLeft = 3;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private readonly worldPos = new THREE.Vector3();
  private readonly projected = new THREE.Vector3();
  /** Accu sim particules : ~30 Hz idle (rendu reste 60 Hz). */
  private conquestSimAccMs = 0;
  private pointerActive = false;
  private focusedId: string | null = null;
  private hoverPreviewId: string | null = null;
  private lastAnchorX = 0;
  private lastAnchorY = 0;
  private occlusionAccMs = 0;
  private labelAccMs = 0;
  private renderSkipCounter = 0;
  private safetyBound = false;
  private readonly heldPanKeys = new Set<string>();
  private orbitStroke: StarConquestPointerStroke | null = null;
  private orbitPendingHit: StarConquestHit | null = null;
  private lastEmptyTapMs = 0;
  private bindFacade(): void {
    this.facadeSubs = [
      this.facade.dismiss$.subscribe(() => this.zone.run(() => this.clearSelection())),
      this.facade.select$.subscribe((questId) =>
        this.zone.run(() => this.selectById(questId, true))
      ),
      this.facade.hover$.subscribe((detail) => {
        if (this.conquestState.selected()) return;
        this.zone.run(() => {
          const id = detail.questId ?? null;
          this.hoverPreviewId = id;
          this.conquest?.setFocus(id);
          this.refreshRewardLabels();
          if (this.canvas) this.canvas.style.cursor = id ? 'pointer' : 'default';
        });
      }),
      this.facade.universeChange$.subscribe((universeId) => {
        this.zone.runOutsideAngular(() => {
          const theme = starConquestUniverseTheme(universeId);
          this.kgOrchestrator.setUniverse(universeId);
          this.conquest?.setUniverse(theme);
        });
      }),
      this.facade.progress$.subscribe(() => this.zone.run(() => this.applyRuntimeProgress())),
      this.facade.resetView$.subscribe(() => {
        this.world?.resetView(false);
        recordStarConquestDiag('reset-view');
      }),
    ];
  }

  private unbindFacade(): void {
    for (const sub of this.facadeSubs) sub.unsubscribe();
    this.facadeSubs = [];
  }

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
      const { width, height } = starConquestRenderSize();

      this.scene = new THREE.Scene();
      this.scene.background = null;
      this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
      this.camera.position.z = CAMERA_Z;

      this.renderer.setSize(width, height, false);
      this.renderer.sortObjects = false;
      const gpuQuality = mapQualityToQuestGraphQuality('ultra-low');
      this.gpuQuality = gpuQuality;
      const dpr =
        typeof window !== 'undefined'
          ? Math.min(window.devicePixelRatio || 1, starConquestDprCap(gpuQuality))
          : 1;
      this.renderer.setPixelRatio(dpr);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.autoClear = true;

      if (typeof localStorage !== 'undefined' && localStorage.getItem('PERF_DEBUG') === '1') {
        console.log('[BACKGROUND] Active Angular component:', this.constructor.name);
        console.log(
          '[BACKGROUND] Renderer alpha:',
          this.renderer.getContextAttributes()?.alpha
        );
      }

      applyCanvasLayerStyles(created.canvas, 'background');
      created.canvas.style.pointerEvents = 'auto';
      created.canvas.style.touchAction = 'none';
      created.canvas.style.cursor = 'default';
      created.canvas.style.background = 'transparent';
      created.canvas.setAttribute('data-star-conquest', 'canvas');
      created.canvas.setAttribute('data-sc-tier', STAR_CONQUEST_SCALE_TIER);
      created.canvas.setAttribute('aria-label', 'Univers neuronal Star Conquest');
      created.canvas.removeAttribute('title');
      this.hostRef.nativeElement.appendChild(created.canvas);

      this.world = new StarConquestWorld();
      this.scene.add(this.world.root);
      this.quests = this.progress.hydrateCatalog(STAR_CONQUEST_MOCK_QUESTS);
      this.conquest = new StarConquestGraph(this.quests);
      this.world.attachContent(this.conquest.group);
      this.conquest.clearJoystickExclusion();

      const vizMode = DEFAULT_QUEST_VISUALIZATION_MODE;
      this.conquest.setVisualizationMode(vizMode);
      this.kgOrchestrator.setVisualizationMode(vizMode);
      this.kgOrchestrator.setQuality(gpuQuality);
      this.conquest.setGpuQuality(gpuQuality);
      this.kgOrchestrator.bindGraph(this.conquest);
      this.kgOrchestrator.start(this.quests);
      this.universeService.initCssBackground();
      const initialTheme = this.universeService.theme();
      this.conquest.setUniverse(initialTheme);
      this.kgOrchestrator.setUniverse(initialTheme.id);
      this.scheduleInitialRelayout();

      this.bindPointer(created.canvas);
      this.bindUiWatchers();
      this.bindSafetyListeners();
      window.addEventListener('resize', this.onWindowLayout, { passive: true });
      this.bindFacade();

      this.resizeBinding = bindContainerResize(
        this.hostRef.nativeElement,
        () => this.applyFixedRendererSize(),
        starConquestRenderSize()
      );

      this.schedulerUnregister = this.animationScheduler.register({
        id: 'star-conquest',
        order: 10,
        onFrame: (ctx) => this.onSchedulerFrame(ctx),
        onPause: () => this.renderFrame(),
        onResume: () => {
          this.conquestSimAccMs = 0;
          this.occlusionAccMs = 0;
          this.labelAccMs = 0;
        },
      });
      this.renderFrame();
      this.animationScheduler.resumeSubscriber('star-conquest');
      this.progress.recordFunnel('views');
    } catch (error) {
      console.error('[particle-background] Initialisation impossible.', error);
    }
  }

  ngOnDestroy(): void {
    this.unbindFacade();
    window.removeEventListener('resize', this.onWindowLayout);
    this.unbindSafetyListeners();
    this.layoutObserver?.disconnect();
    if (this.uiChromeRafId) {
      cancelAnimationFrame(this.uiChromeRafId);
      this.uiChromeRafId = 0;
    }
    this.unbindPointer();
    this.schedulerUnregister?.();
    this.schedulerUnregister = undefined;
    this.animationScheduler.pauseSubscriber('star-conquest');
    this.resizeBinding?.unsubscribe();
    this.conquestState.endStick();
    this.conquestState.clear();
    this.conquestState.setHiddenQuests([]);
    this.conquestState.setRewardLabels([]);

    this.conquest?.dispose();
    this.kgOrchestrator.destroy();
    this.camera?.clearViewOffset();
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
    // Repli/dépli Angular : debounce 1 rAF — évite rafales renderFrame.
    this.layoutObserver = new ResizeObserver(() => {
      this.scheduleSyncUiChrome();
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
  /** Init layout après chargement CSS — évite « Layout was forced before the page was fully loaded ». */
  private scheduleInitialRelayout(): void {
    const run = (): void => {
      this.relayoutBackground();
      requestAnimationFrame(() => {
        this.relayoutBackground();
        requestAnimationFrame(() => this.relayoutBackground());
      });
    };
    if (typeof document !== 'undefined' && document.readyState !== 'complete') {
      window.addEventListener('load', run, { once: true });
      return;
    }
    run();
  }

  private relayoutBackground(): void {
    if (!this.camera || !this.conquest) return;

    const vw = starConquestLayoutWidth();
    const vh = starConquestLayoutHeight();
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
    const band = measurePlayableBand(readFloorPeekPx());
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

  /** Occlusion / panel — suit l’UI sans bouger la constellation. */
  private syncUiChrome(): void {
    if (!this.camera) return;
    this.refreshOcclusion();
    this.syncPanelAnchor();
    this.renderFrame();
  }

  /** Phase 18 — coalesce ResizeObserver callbacks. */
  private scheduleSyncUiChrome(): void {
    if (this.uiChromeRafId) return;
    this.uiChromeRafId = requestAnimationFrame(() => {
      this.uiChromeRafId = 0;
      this.syncUiChrome();
    });
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
    const margin = Math.round(36 * STAR_CONQUEST_SCALE.layout);
    const txMax = Math.max(48, Math.max(Math.abs(minX), Math.abs(maxX)) + margin);
    const tyMax = Math.max(48, Math.max(Math.abs(minY), Math.abs(maxY)) + margin);
    this.world.setTravelBounds(txMax, tyMax, 32);
  }

  private bindPointer(canvas: HTMLCanvasElement): void {
    this.zone.runOutsideAngular(() => {
      canvas.addEventListener('pointermove', this.onPointerMove, { passive: false });
      canvas.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
      canvas.addEventListener('pointerdown', this.onPointerDown, { passive: false });
      canvas.addEventListener('pointerup', this.onPointerUp, { passive: false });
      canvas.addEventListener('pointercancel', this.onPointerCancel, { passive: true });
      canvas.addEventListener('wheel', this.onWheel, { passive: false });
      canvas.addEventListener('webglcontextlost', this.onContextLost, false);
    });
    this.pointerActive = true;
  }

  private unbindPointer(): void {
    if (!this.canvas || !this.pointerActive) return;
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.pointerActive = false;
  }

  private bindSafetyListeners(): void {
    if (this.safetyBound || typeof window === 'undefined') return;
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    if (STAR_CONQUEST_FEATURES.keyboardPan) {
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
    }
    this.safetyBound = true;
  }

  private unbindSafetyListeners(): void {
    if (!this.safetyBound || typeof window === 'undefined') return;
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.safetyBound = false;
    this.heldPanKeys.clear();
  }

  private readonly onPointerCancel = (): void => {
    if (this.orbitStroke) {
      this.orbitStroke = null;
      this.orbitPendingHit = null;
    }
    if (!starConquestShouldResetStickOnCancel('pointercancel')) return;
    recordStarConquestDiag('pointer-cancel');
    this.zone.run(() => this.conquestState.endStick());
    this.world?.releaseStick(false);
  };

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
    recordStarConquestDiag('webgl-lost');
    this.zone.run(() => this.conquestState.setRuntime('error', 'Rendu WebGL interrompu.'));
  };

  private readonly onWindowBlur = (): void => {
    if (!starConquestShouldResetStickOnCancel('blur')) return;
    this.heldPanKeys.clear();
    this.zone.run(() => this.conquestState.endStick());
    this.world?.releaseStick(false);
  };

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState !== 'hidden') return;
    if (!starConquestShouldResetStickOnCancel('visibility')) return;
    this.heldPanKeys.clear();
    this.zone.run(() => this.conquestState.endStick());
    this.world?.releaseStick(false);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!STAR_CONQUEST_FEATURES.keyboardPan) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    ) {
      return;
    }
    if (!starConquestKeyToPanDelta(event.code)) return;
    event.preventDefault();
    this.heldPanKeys.add(event.code);
    this.applyHeldPanKeys();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (!this.heldPanKeys.has(event.code)) return;
    this.heldPanKeys.delete(event.code);
    this.applyHeldPanKeys();
  };

  private applyHeldPanKeys(): void {
    const intent = mergeStarConquestKeyPan(idleStarConquestPanIntent(), this.heldPanKeys);
    if (!intent.active) {
      this.zone.run(() => this.conquestState.endStick());
      return;
    }
    this.zone.run(() => this.conquestState.setStick(intent.x, intent.y));
  }

  private readonly onWheel = (event: WheelEvent): void => {
    if (this.conquestState.worldNavigating()) return;
    event.preventDefault();
    const delta = event.deltaY * 0.045 * QUEST_ORBIT_CONFIG.zoomSpeed;
    this.kgOrchestrator.cameraController.adjustUserZoom(delta);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.orbitStroke && event.pointerId === this.orbitStroke.pointerId) {
      const prev = this.orbitStroke;
      this.orbitStroke = updateStarConquestPointerStroke(
        this.orbitStroke,
        event.clientX,
        event.clientY
      );
      if (this.orbitStroke.dragging && this.world) {
        event.preventDefault?.();
        const panMax = this.world.getPanMax();
        const vw = starConquestLayoutWidth();
        const vh = starConquestLayoutHeight();
        const delta = screenDeltaToWorldPan(
          this.orbitStroke.lastX - prev.lastX,
          this.orbitStroke.lastY - prev.lastY,
          panMax.x,
          panMax.y,
          vw,
          vh
        );
        this.world.panByDelta(delta.dxWorld, delta.dyWorld);
        this.zone.run(() => this.conquestState.setStick(0, 0));
      }
      return;
    }

    if (this.conquestState.worldNavigating()) return;
    if (event.pointerType === 'touch') return;

    // Sélection ouverte : pas de parallaxe / pull (la structure ne doit pas bouger)
    if (this.conquestState.selected()) {
      this.conquest?.setPointerNdc(null);
      if (this.canvas) this.canvas.style.cursor = 'default';
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
    if (this.canvas) this.canvas.style.cursor = 'default';
    this.conquest?.setPointerNdc(null);
    if (this.conquestState.selected()) return;
    this.zone.run(() => {
      this.hoverPreviewId = null;
      this.conquest?.setFocus(null);
      this.refreshRewardLabels();
    });
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.conquestState.worldNavigating() && !this.orbitStroke) return;
    const isTouch = event.pointerType === 'touch' || event.pointerType === 'pen';
    if (!isTouch && event.button !== 0) return;
    if (isScreenPointBlockedByUi(event.clientX, event.clientY)) return;

    const questHit = this.hitTest(event.clientX, event.clientY);

    if (STAR_CONQUEST_FEATURES.canvasOrbit) {
      event.preventDefault();
      (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
      this.orbitStroke = beginStarConquestPointerStroke(
        event.pointerId,
        event.clientX,
        event.clientY
      );
      this.orbitPendingHit = questHit;
      return;
    }

    if (questHit) {
      this.zone.run(() => {
        event.preventDefault();
        const quest = this.conquest?.getQuest(questHit.questId) ?? null;
        if (quest) {
          this.applySelection(quest, questHit.worldPosition);
        }
      });
      return;
    }

    this.zone.run(() => {
      if (this.conquestState.selected() || this.focusedId) {
        event.preventDefault();
        this.clearSelection();
      }
    });
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.orbitStroke || event.pointerId !== this.orbitStroke.pointerId) return;
    const stroke = updateStarConquestPointerStroke(
      this.orbitStroke,
      event.clientX,
      event.clientY
    );
    const pending = this.orbitPendingHit;
    this.orbitStroke = null;
    this.orbitPendingHit = null;

    if (!starConquestOrbitShouldPick(stroke)) {
      this.zone.run(() => this.conquestState.endStick());
      this.world?.releaseStick(false);
      recordStarConquestDiag('stick-end', 'orbit');
      return;
    }

    if (pending) {
      this.zone.run(() => {
        const quest = this.conquest?.getQuest(pending.questId) ?? null;
        if (quest) this.applySelection(quest, pending.worldPosition);
      });
      return;
    }

    const now = performance.now();
    const doubleTap = now - this.lastEmptyTapMs < STAR_CONQUEST_ORBIT_DOUBLE_TAP_MS;
    this.lastEmptyTapMs = now;
    this.zone.run(() => {
      if (this.conquestState.selected() || this.focusedId) {
        this.clearSelection();
        return;
      }
      if (doubleTap) {
        this.world?.resetView(false);
        this.facade.resetView();
        recordStarConquestDiag('reset-view', 'double-tap');
      }
    });
  };

  private hitTest(clientX: number, clientY: number) {
    if (!this.camera || !this.conquest || !this.canvas) return null;
    const band = measurePlayableBand(readFloorPeekPx());
    // Autorise toute la hauteur (y compris sous le floor) — seules les Quests hors bande haute sont exclues
    if (clientY < band.topPx - 8) return null;

    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    // Hit plus large en bas (floor) pour les racines underFloor
    const nearFloor = clientY >= band.floorTopPx - 12;
    const pick = STAR_CONQUEST_SCALE.pickRadiusPx;
    const radiusPx = nearFloor
      ? Math.max(pick + 8, Math.min(pick + 18, rect.width * 0.16))
      : Math.max(pick, Math.min(pick + 8, rect.width * 0.1));
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
    this.kgOrchestrator.focusNode(`quest:${quest.id}`);
    if (this.world && this.camera) {
      this.kgOrchestrator.cameraController.focusNode(this.world, this.camera, world);
    }
    this.lastAnchorX = 0;
    this.lastAnchorY = 0;
    const anchor = this.projectToScreen(world);
    this.lastAnchorX = anchor.x;
    this.lastAnchorY = anchor.y;
    this.conquestState.show(quest, anchor.x, anchor.y, anchor.compact);
    this.progress.recordFunnel('picks');
    this.progress.recordFunnel('panels');
    this.refreshRewardLabels();
  }

  private applyRuntimeProgress(): void {
    const hydrated = this.progress.hydrateCatalog(STAR_CONQUEST_MOCK_QUESTS);
    const byId = new Map(hydrated.map((quest) => [quest.id, quest]));
    for (const quest of this.quests) {
      const next = byId.get(quest.id);
      if (next) quest.status = next.status;
    }
    this.conquest?.applyQuestStatuses(this.quests);
    const panel = this.conquestState.panel();
    if (!panel) return;
    const updated = this.conquest?.getQuest(panel.quest.id) ?? byId.get(panel.quest.id);
    if (updated) {
      this.conquestState.show(updated, panel.x, panel.y, this.conquestState.panelCompact());
    }
  }

  private selectById(questId: string, _fromScanner = false): void {
    if (!this.conquest) return;
    const quest = this.conquest.getQuest(questId);
    const world = this.conquest.getWorldPosition(questId, this.worldPos);
    if (!quest || !world) return;
    // Jamais de pan caméra / déplacement structure au clic
    this.applySelection(quest, world);
    this.conquest.pulseFocus();
  }

  private applyKnowledgeNodeSelection(nodeId: string, world: THREE.Vector3): void {
    this.kgOrchestrator.focusNode(nodeId);
    this.conquest?.setNetworkFocus(nodeId);
    if (this.world && this.camera) {
      const cluster = nodeId.startsWith('ai-agent:');
      this.kgOrchestrator.cameraController.focusNode(this.world, this.camera, world, cluster);
    }
  }

  private clearSelection(): void {
    this.focusedId = null;
    this.hoverPreviewId = null;
    this.conquest?.setFocus(null);
    this.kgOrchestrator.clearFocus();
    if (this.world && this.camera) {
      this.kgOrchestrator.cameraController.restore(this.world, this.camera);
    }
    this.conquestState.clear();
    if (this.canvas) this.canvas.style.cursor = 'default';
    this.refreshRewardLabels();
  }

  private refreshOcclusion(): void {
    if (!this.conquest || !this.camera) return;
    this.world?.content.updateMatrixWorld(true);
    const rects = collectUiOccluderRects();
    const projected = this.conquest.projectAllToScreen(this.camera);
    const vw = starConquestLayoutWidth();
    const vh = starConquestLayoutHeight();
    const band = measurePlayableBand(readFloorPeekPx());
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
      const occluded = isQuestFullyOccluded(
        p.x,
        p.y,
        rects,
        Math.round(STAR_CONQUEST_SCALE.pickRadiusPx * 0.5)
      );
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
    const signature = hidden
      .map((q) => q.id)
      .sort()
      .join('|');
    if (signature !== this.hiddenQuestSignature) {
      this.hiddenQuestSignature = signature;
      this.conquestState.setHiddenQuests(hidden);
    }
    this.refreshRewardLabels();
  }

  /**
   * Labels +M4T3R : uniquement survol / sélection.
   * Au repos ils polluent la nébuleuse ; la valeur reste dans le panneau Quest.
   */
  private refreshRewardLabels(): void {
    if (!this.conquest || !this.camera) {
      this.setRewardLabelsIfChanged([]);
      return;
    }
    const focusId = this.focusedId ?? this.hoverPreviewId;
    if (!focusId) {
      this.setRewardLabelsIfChanged([]);
      return;
    }

    const projected = this.conquest.projectAllToScreen(this.camera);
    const band = measurePlayableBand(readFloorPeekPx());
    const rects = collectUiOccluderRects();
    const p = projected.find((row) => row.id === focusId);
    if (!p) {
      this.setRewardLabelsIfChanged([]);
      return;
    }
    if (p.x < -6 || p.x > band.viewportW + 6 || p.y < band.topPx - 2 || p.y > band.viewportH + 4) {
      this.setRewardLabelsIfChanged([]);
      return;
    }

    const quest = this.conquest.getQuest(p.id);
    const underFloor = quest?.underFloor === true;
    if (p.y > band.floorTopPx + 8 && !underFloor) {
      this.setRewardLabelsIfChanged([]);
      return;
    }
    const occluded = isQuestFullyOccluded(
      p.x,
      p.y,
      rects,
      Math.round(STAR_CONQUEST_SCALE.pickRadiusPx * 0.36)
    );
    if (occluded && !quest?.underGraph) {
      this.setRewardLabelsIfChanged([]);
      return;
    }

    const lx = Math.max(10, Math.min(band.viewportW - 10, p.x + 12));
    const ly = Math.max(band.topPx + 4, Math.min(band.viewportH - 8, p.y - 10));
    const label: StarQuestRewardLabel = {
      id: p.id,
      x: lx,
      y: ly,
      text: formatRewardShort(p.reward),
      family: p.family,
      active: true,
      dim: false,
      reward: p.reward,
      depth: p.depth,
      opacity: 1,
    };

    this.setRewardLabelsIfChanged([label]);
  }

  /** Signals Angular — safe hors NgZone, évite CD globale (Phase 18). */
  private setRewardLabelsIfChanged(labels: StarQuestRewardLabel[]): void {
    const signature =
      labels.length === 0
        ? ''
        : `${labels[0]!.id}:${labels[0]!.x.toFixed(1)}:${labels[0]!.y.toFixed(1)}:${labels[0]!.text}`;
    if (signature === this.rewardLabelSignature) return;
    this.rewardLabelSignature = signature;
    this.conquestState.setRewardLabels(labels);
  }

  private projectToScreen(
    world: THREE.Vector3
  ): { x: number; y: number; compact: boolean } {
    if (!this.camera) return { x: 16, y: 16, compact: true };
    this.projected.copy(world).project(this.camera);
    const layout = starConquestNdcToLayout(this.projected.x, this.projected.y);
    const vw = starConquestLayoutWidth();
    const vh = starConquestLayoutHeight();
    const sx = layout.x;
    const sy = layout.y;
    const box = starConquestOverlayBox(vw, vh);
    const joy = this.conquestState.joyExclusion();
    const zone: JoystickExclusionZone | null = joy
      ? {
          ...joy,
          r: Math.hypot((joy.right - joy.left) * 0.5, (joy.bottom - joy.top) * 0.5),
        }
      : null;

    const preferred =
      this.lastAnchorX || this.lastAnchorY
        ? { x: this.lastAnchorX, y: this.lastAnchorY }
        : null;

    const placed = placeQuestPanelNearParticle(
      sx,
      sy,
      box.panelW,
      box.panelH,
      zone,
      vw,
      vh,
      box.margin,
      8,
      preferred,
      box.floorChromeH
    );
    return { x: placed.x, y: placed.y, compact: true };
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
    this.conquestState.move(anchor.x, anchor.y, anchor.compact);
  }

  private onSchedulerFrame(ctx: WebGlFrameContext): void {
    if (!this.scene || !this.camera || !this.renderer) return;

    const delta = ctx.deltaMs;

    if (ctx.animating) {
      // Stick → transform globale du contenu (pas le floor / joystick)
      if (this.world) {
        const stick = this.conquestState.stick();
        if (this.conquestState.worldNavigating()) {
          this.world.setStick(stick.x, stick.y);
        } else if (this.world.isDragging()) {
          this.world.releaseStick(false);
        }
        this.world.tick(delta);
        this.world.root.updateMatrixWorld(true);
        if (this.camera) {
          this.kgOrchestrator.cameraController.tick(delta, this.camera);
          this.world.applyToCamera(this.camera, this.camera.position.z);
          const band = measurePlayableBand(readFloorPeekPx());
          // Rebond uniquement hors drag — sinon les Quests bas restent inaccessibles
          if (this.conquest && !this.conquestState.worldNavigating()) {
            const projected = this.conquest.projectAllToScreen(this.camera);
            this.world.applyViewportEdgeBounce(projected, band);
          } else {
            this.world.clearEdgeBounce();
          }
          // Recalcule les limites de pan (dérive peut éloigner les Quests)
          if (this.conquestState.worldNavigating()) {
            this.updateTravelBoundsFromQuests();
          }
        }
      }
      if (this.conquest) {
        // Navigation stick : sim pleine (décimée si floor actif) ; idle throttle via gouverneur P21
        if (this.conquestState.worldNavigating()) {
          if (shouldRunScActiveSimTick(ctx.frameIndex, ctx.dual.decimateScActiveSim)) {
            this.conquest.tick(delta, this.camera);
          }
          this.conquestSimAccMs = 0;
        } else {
          this.conquestSimAccMs += delta;
          if (
            !ctx.dual.deferScIdleSim &&
            this.conquestSimAccMs >= ctx.dual.scIdleSimIntervalMs
          ) {
            this.conquest.tick(this.conquestSimAccMs, this.camera);
            this.conquestSimAccMs = 0;
          }
        }
      }
      const peerConnected =
        this.kgOrchestrator.adapter.getPeerStates().some((p) => p.status === 'connected');
      this.kgOrchestrator.tick(delta, peerConnected);
      if (this.focusedId && this.conquestState.selected()) {
        this.syncPanelAnchor();
      }
      this.occlusionAccMs += delta;
      this.labelAccMs += delta;
      const perfHints = starConquestFramePerfHints(this.gpuQuality);
      if (this.occlusionAccMs > perfHints.occlusionIntervalMs) {
        this.occlusionAccMs = 0;
        this.labelAccMs = 0;
        this.refreshOcclusion();
      } else if (this.labelAccMs > perfHints.labelIntervalMs) {
        this.labelAccMs = 0;
        this.refreshRewardLabels();
      }
    }
    this.dualContextGovernor.setScWorldNavigating(this.conquestState.worldNavigating());
    if (this.shouldRenderThisFrame(ctx)) {
      this.renderFrame();
    }
    this.combinedPerfHud.reportStarConquest(this.renderer.info);
  }

  /** Skip render idle si dual-context over-budget (fill rate 250×550 déjà bas). */
  private shouldRenderThisFrame(ctx: WebGlFrameContext): boolean {
    if (this.conquestState.worldNavigating() || this.conquestState.selected()) {
      return true;
    }
    const hints = starConquestFramePerfHints(this.gpuQuality);
    if (!ctx.dual.dualContextActive || !ctx.overBudget || !hints.skipRenderWhenIdleDual) {
      return true;
    }
    this.renderSkipCounter += 1;
    return this.renderSkipCounter % 2 === 0;
  }

  private renderFrame(): void {
    if (!this.scene || !this.camera || !this.renderer) return;
    this.camera.clearViewOffset();
    this.renderer.setScissorTest(false);
    const w = this.renderer.domElement.width;
    const h = this.renderer.domElement.height;
    if (w > 0 && h > 0) {
      this.renderer.setViewport(0, 0, w, h);
      this.renderer.setScissor(0, 0, w, h);
    }
    this.renderer.render(this.scene, this.camera);
  }

  private applyFixedRendererSize(): void {
    if (!this.camera || !this.renderer) return;
    const { width, height } = starConquestRenderSize();
    this.camera.clearViewOffset();
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    const dpr =
      typeof window !== 'undefined'
        ? Math.min(window.devicePixelRatio || 1, starConquestDprCap(this.gpuQuality))
        : 1;
    this.renderer.setPixelRatio(dpr);
    this.relayoutBackground();
  }
}
