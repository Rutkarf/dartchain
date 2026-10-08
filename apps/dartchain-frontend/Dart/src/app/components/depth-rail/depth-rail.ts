import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';

import {
  heroDepthFor,
  itemDepth,
  nearestIndex,
  offsetForIndex,
  stepSpring,
  tiltKick,
} from './depth-rail.math';

export type DepthRailPreset = 'compact' | 'band' | 'shell';
export type DepthRailMode = 'navigate' | 'browse';

interface DepthRailPresetConfig {
  cameraRotation: number;
  cameraTilt: number;
  scaleMin: number;
  scaleMax: number;
  stiffness: number;
  damping: number;
  wheelSensitivity: number;
  maxTiltKick: number;
}

const PRESETS: Record<DepthRailPreset, DepthRailPresetConfig> = {
  compact: {
    cameraRotation: -12,
    cameraTilt: -4,
    scaleMin: 0.92,
    scaleMax: 1.04,
    stiffness: 90,
    damping: 24,
    wheelSensitivity: 0.42,
    maxTiltKick: 2,
  },
  band: {
    cameraRotation: -22,
    cameraTilt: -7,
    scaleMin: 0.74,
    scaleMax: 1.04,
    stiffness: 100,
    damping: 28,
    wheelSensitivity: 0.55,
    maxTiltKick: 2.5,
  },
  shell: {
    cameraRotation: -10,
    cameraTilt: -4,
    scaleMin: 0.94,
    scaleMax: 1,
    stiffness: 62,
    damping: 18,
    wheelSensitivity: 0.45,
    maxTiltKick: 1.5,
  },
};

@Component({
  selector: 'app-depth-rail',
  standalone: true,
  templateUrl: './depth-rail.html',
  styleUrl: './depth-rail.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.depth-rail]': 'true',
    '[class.depth-rail--compact]': 'preset === "compact"',
    '[class.depth-rail--band]': 'preset === "band"',
    '[class.depth-rail--shell]': 'preset === "shell"',
    '[class.depth-rail--dragging]': 'dragging',
    '[class.is-disabled]': '!enabled',
  },
})
export class DepthRailComponent implements AfterViewInit, OnChanges, OnDestroy {
  /** compact = onglets, band = navigation interne du showcase. */
  @Input() preset: DepthRailPreset = 'band';
  /** navigate = molette et glisser changent l'index. browse = défilement libre. */
  @Input() mode: DepthRailMode = 'browse';
  @Input() loop = true;
  @Input() enabled = true;
  @Input() activeIndex = 0;
  @Input() itemSelector = '.is-depth-item';

  @Output() readonly indexChange = new EventEmitter<number>();
  /** Index le plus proche du premier plan, en mode browse. */
  @Output() readonly frontIndexChange = new EventEmitter<number>();

  @ViewChild('scene', { static: true })
  private readonly sceneRef!: ElementRef<HTMLElement>;

  dragging = false;

  private readonly host: HTMLElement;
  private items: HTMLElement[] = [];
  private offset = 0;
  private velocity = 0;
  private target = 0;
  private tilt = 0;
  private tiltVelocity = 0;
  private spacing = 48;
  private cardW = 120;
  private cardH = 28;
  private rafId = 0;
  private lastFrameTs = 0;
  private reducedMotion = false;
  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;
  private dragPointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartOffset = 0;
  private dragMoved = false;
  private dragAxis: 'x' | null = null;
  private readonly dragThresholdPx = 6;
  private wheelAccum = 0;
  private lastFrontIndex = -1;
  private transitionFromIndex = 0;
  private transitionStartedAt = 0;
  private transitionDirect = false;
  private readonly transitionMs = 420;

  constructor(hostRef: ElementRef<HTMLElement>) {
    this.host = hostRef.nativeElement;
  }

  ngAfterViewInit(): void {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.host.addEventListener('wheel', this.onWheel, { passive: false });
    this.host.addEventListener('click', this.onClickCapture, true);
    this.resizeObserver = new ResizeObserver(() => this.layout(false));
    this.resizeObserver.observe(this.host);
    this.mutationObserver = new MutationObserver(() => this.layout(false));
    this.mutationObserver.observe(this.sceneRef.nativeElement, {
      childList: true,
      subtree: true,
    });
    this.layout(true);
    this.start();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['enabled'] && !changes['enabled'].firstChange) {
      this.layout(true);
    }
    if (changes['activeIndex'] && !this.dragging && this.mode === 'navigate') {
      const change = changes['activeIndex'];
      const previous = Number(change.previousValue);
      if (
        !change.firstChange &&
        !this.reducedMotion &&
        Number.isFinite(previous) &&
        previous !== this.activeIndex
      ) {
        this.transitionFromIndex = this.wrapIndex(previous);
        this.transitionStartedAt = this.transitionDirect ? performance.now() : 0;
      }
      this.snapTo(this.activeIndex, !change.firstChange && !this.reducedMotion);
    }
    if (changes['preset'] && !changes['preset'].firstChange) {
      this.layout(true);
    }
  }

  ngOnDestroy(): void {
    this.stop();
    this.host.removeEventListener('wheel', this.onWheel);
    this.host.removeEventListener('click', this.onClickCapture, true);
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.clearItemStyles();
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.enabled || (event.button !== 0 && event.pointerType === 'mouse')) {
      return;
    }

    this.dragging = true;
    this.dragMoved = false;
    this.dragAxis = null;
    this.dragPointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartOffset = this.offset;
    if (this.preset !== 'shell') {
      this.sceneRef.nativeElement.setPointerCapture(event.pointerId);
    }
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging || this.dragPointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    if (this.preset === 'shell' && this.dragAxis === null) {
      if (Math.abs(dx) < this.dragThresholdPx && Math.abs(dy) < this.dragThresholdPx) {
        return;
      }
      if (Math.abs(dy) > Math.abs(dx) && this.flatContains(event.target)) {
        this.dragging = false;
        this.dragPointerId = null;
        return;
      }
      this.dragAxis = 'x';
      this.transitionDirect = false;
      this.sceneRef.nativeElement.setPointerCapture(event.pointerId);
    }

    const delta = this.preset === 'shell' && Math.abs(dy) > Math.abs(dx) ? dy : dx;
    if (Math.abs(delta) > this.dragThresholdPx) {
      this.dragMoved = true;
    }
    this.target = this.dragStartOffset - delta * 0.85;
    if (this.preset === 'shell' && !this.loop) {
      const max = Math.max(this.items.length - 1, 0) * this.spacing;
      this.target = Math.max(0, Math.min(max, this.target));
    }
    this.offset = this.target;
    this.velocity = 0;
    this.paint();
  }

  onPointerUp(event: PointerEvent): void {
    if (this.dragPointerId !== event.pointerId) {
      return;
    }

    if (this.sceneRef.nativeElement.hasPointerCapture(event.pointerId)) {
      this.sceneRef.nativeElement.releasePointerCapture(event.pointerId);
    }
    this.dragging = false;
    this.dragPointerId = null;
    this.dragAxis = null;

    if (this.dragMoved && this.mode === 'navigate') {
      this.snapTo(this.nearest(), true);
    }
  }

  private readonly onWheel = (event: WheelEvent): void => {
    if (!this.enabled || (this.preset === 'shell' && this.wheelScrollsFront(event))) {
      return;
    }

    event.preventDefault();
    const preset = PRESETS[this.preset];
    const modeScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
    const dominant = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const delta = dominant * modeScale * preset.wheelSensitivity;

    if (this.mode === 'browse') {
      this.target += delta;
      return;
    }

    this.wheelAccum += delta;
    const step = Math.max(18, this.spacing * 0.55);
    let cursor = this.activeIndex;
    while (this.wheelAccum > step) {
      this.wheelAccum -= step;
      cursor = this.wrapIndex(cursor + 1);
    }
    while (this.wheelAccum < -step) {
      this.wheelAccum += step;
      cursor = this.wrapIndex(cursor - 1);
    }
    if (cursor !== this.activeIndex) {
      this.snapTo(cursor, true);
    }
  };

  private flatContains(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) {
      return false;
    }
    const panel = target.closest('.showcase-tab-panel');
    return panel instanceof HTMLElement && panel.dataset['depthRank'] === '0';
  }

  private wheelScrollsFront(event: WheelEvent): boolean {
    if (!this.flatContains(event.target) || !this.innerCanScroll(event)) {
      return false;
    }
    return Math.abs(event.deltaY) >= Math.abs(event.deltaX);
  }

  private innerCanScroll(event: WheelEvent): boolean {
    const target = event.target;
    if (!(target instanceof Element)) {
      return false;
    }

    let node: Element | null = target;
    while (node && node !== this.host) {
      if (node instanceof HTMLElement) {
        const style = getComputedStyle(node);
        const scrollable = /(auto|scroll)/.test(style.overflowY);
        if (scrollable && node.scrollHeight > node.clientHeight + 1) {
          const atTop = node.scrollTop <= 0;
          const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
          if ((event.deltaY < 0 && !atTop) || (event.deltaY > 0 && !atBottom)) {
            return true;
          }
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  private readonly onClickCapture = (event: MouseEvent): void => {
    if (this.dragMoved) {
      event.preventDefault();
      event.stopPropagation();
      this.dragMoved = false;
      return;
    }

    if (this.preset !== 'shell' || !this.enabled) {
      return;
    }

    const panel = this.panelAt(event);
    if (!(panel instanceof HTMLElement)) {
      return;
    }

    const index = this.items.indexOf(panel);
    if (index < 0 || index === this.wrapIndex(this.activeIndex)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.transitionDirect = true;
    this.snapTo(index, true);
  };

  private panelAt(event: MouseEvent): HTMLElement | null {
    if (event.target instanceof Element) {
      const direct = event.target.closest('.showcase-tab-panel');
      if (direct instanceof HTMLElement && this.items.includes(direct)) {
        return direct;
      }
    }

    let best: HTMLElement | null = null;
    let bestZ = Number.NEGATIVE_INFINITY;
    for (const item of this.items) {
      const rect = item.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        continue;
      }
      const z = Number(item.style.zIndex) || 0;
      if (z >= bestZ) {
        best = item;
        bestZ = z;
      }
    }
    return best;
  }

  private layout(resetOffset: boolean): void {
    this.collectItems();
    this.measure();
    if (!this.enabled) {
      this.clearItemStyles();
      this.paintScene(0);
      return;
    }

    if (resetOffset) {
      this.snapTo(this.activeIndex, false);
      return;
    }
    if (this.mode === 'navigate' && this.items.length > 0) {
      const hero = heroDepthFor(this.items.length, this.spacing, this.loop);
      this.target = offsetForIndex(
        this.wrapIndex(this.activeIndex),
        this.spacing,
        hero,
        this.loop,
      );
    }
    this.paint();
  }

  private collectItems(): void {
    const scene = this.sceneRef?.nativeElement;
    if (!scene) {
      this.items = [];
      return;
    }

    const found = Array.from(scene.querySelectorAll<HTMLElement>(this.itemSelector));
    const next = new Set(found);
    for (const previous of this.items) {
      if (!next.has(previous)) {
        this.resetItem(previous);
      }
    }
    this.items = found;
    for (const item of this.items) {
      item.classList.add('is-depth-item');
    }
  }

  private measure(): void {
    const width = this.host.clientWidth || 1;
    const height = this.host.clientHeight || 1;
    const count = Math.max(this.items.length, 2);
    const swing = this.planeSwing();

    if (this.preset === 'compact') {
      const slot = width / count;
      this.cardH = Math.min(16, Math.max(14, height * 0.42));
      const maxW = this.cardWidthLimit(height, swing);
      this.cardW = Math.min(Math.max(72, slot * 0.9), maxW);
      this.spacing = Math.max(16, slot * 0.45);
      return;
    }

    if (this.preset === 'shell') {
      this.cardW = Math.max(120, width * 0.62);
      this.cardH = Math.max(48, height * 0.9);
      this.spacing = 64;
      return;
    }

    this.cardH = Math.min(30, Math.max(18, height * 0.26));
    const maxW = this.cardWidthLimit(height, swing);
    this.cardW = Math.min(width * 0.3, Math.max(180, maxW));
    this.spacing = Math.max(20, Math.min(56, width * 0.04));
  }

  /** Déplacement vertical d'un pixel horizontal après rotateX/rotateY. */
  private planeSwing(): number {
    const preset = PRESETS[this.preset];
    const rot = (Math.abs(preset.cameraRotation) * Math.PI) / 180;
    const tilt = (Math.abs(preset.cameraTilt) * Math.PI) / 180;
    return Math.max(0.01, Math.sin(rot) * Math.sin(tilt));
  }

  /** Largeur de carte dont les coins restent dans la hauteur du rail. */
  private cardWidthLimit(height: number, swing: number): number {
    const budget = Math.max(6, height * 0.34);
    return (budget / swing) * 2;
  }

  /** Course horizontale dont la projection reste dans le rail. */
  private travelLimit(width: number, height: number): number {
    const swing = this.planeSwing();
    const cardLift = (this.cardW / 2) * swing;
    const pad = this.preset === 'compact' ? 1 : 8;
    const budget = Math.max(4, height / 2 - this.cardH / 2 - pad - cardLift);
    const slack = this.preset === 'compact' ? 1 : 0.55;
    const maxAbsX = (budget / swing) * slack;
    const desired = this.preset === 'compact' ? width * 0.92 : width * 0.62;
    return Math.max(48, Math.min(desired, maxAbsX * 2));
  }

  private snapTo(index: number, emit: boolean): void {
    const count = this.items.length;
    if (count === 0) {
      return;
    }

    const safe = this.wrapIndex(index);
    const hero = heroDepthFor(count, this.spacing, this.loop);
    this.target = offsetForIndex(safe, this.spacing, hero, this.loop);
    if (this.reducedMotion || !emit) {
      this.offset = this.target;
      this.velocity = 0;
      this.paint();
    } else if (this.transitionDirect) {
      this.offset = this.target;
      this.velocity = 0;
    }
    if (emit && safe !== this.activeIndex) {
      this.indexChange.emit(safe);
    }
  }

  private nearest(): number {
    const hero = heroDepthFor(this.items.length, this.spacing, this.loop);
    return nearestIndex(this.items.length, this.offset, this.spacing, this.loop, hero);
  }

  private wrapIndex(index: number): number {
    const count = this.items.length;
    if (count <= 0) {
      return 0;
    }
    if (this.loop && this.mode === 'browse') {
      return ((index % count) + count) % count;
    }
    return Math.max(0, Math.min(count - 1, index));
  }

  private start(): void {
    if (this.rafId) {
      return;
    }
    this.lastFrameTs = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private readonly tick = (timestamp: number): void => {
    const dt = this.lastFrameTs
      ? Math.min((timestamp - this.lastFrameTs) / 1000, 0.033)
      : 0.016;
    this.lastFrameTs = timestamp;

    if (this.enabled && !this.dragging && this.host.offsetParent !== null) {
      const preset = PRESETS[this.preset];
      if (this.reducedMotion) {
        this.offset = this.target;
        this.velocity = 0;
        this.tilt = 0;
      } else {
        const next = stepSpring(
          this.offset,
          this.velocity,
          this.target,
          preset.stiffness,
          preset.damping,
          dt,
        );
        this.offset = next.current;
        this.velocity = next.velocity;
        const tiltTarget = tiltKick(this.velocity, preset.maxTiltKick);
        const tiltNext = stepSpring(
          this.tilt,
          this.tiltVelocity,
          tiltTarget,
          preset.stiffness,
          preset.damping,
          dt,
        );
        this.tilt = tiltNext.current;
        this.tiltVelocity = tiltNext.velocity;
      }
      this.paint();
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private paint(): void {
    if (!this.enabled) {
      return;
    }

    const preset = PRESETS[this.preset];
    const count = this.items.length;
    const hero = heroDepthFor(count, this.spacing, this.loop);
    const depths = Array.from({ length: count }, (_, index) =>
      itemDepth(index, count, this.offset, this.spacing, this.loop),
    );
    const width = this.host.clientWidth || 1;
    const height = this.host.clientHeight || 1;
    const travel = this.travelLimit(width, height);
    const yRoom = Math.max(2, height / 2 - this.cardH / 2 - 4);
    const stepX = Math.min(128, width * 0.1);
    const rankOf = new Map(
      depths
        .map((depth, index) => ({ depth, index }))
        .sort((a, b) => b.depth - a.depth)
        .map((entry, rank) => [entry.index, rank] as const),
    );

    const selectedIndex =
      this.mode === 'navigate'
        ? this.wrapIndex(this.activeIndex)
        : ([...rankOf.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] ?? 0);
    const focus = this.spacing > 0 ? this.offset / this.spacing : selectedIndex;
    const primary = Math.max(0, Math.min(count - 1, Math.round(focus)));
    const toward =
      focus > primary ? Math.min(count - 1, primary + 1) : Math.max(0, primary - 1);

    for (let index = 0; index < count; index += 1) {
      const item = this.items[index];
      const depth = depths[index];
      const shell = this.preset === 'shell';
      const compact = this.preset === 'compact';
      const focus = this.spacing > 0 ? this.offset / this.spacing : selectedIndex;
      const fromIndex = this.wrapIndex(this.transitionFromIndex);
      const elapsed = this.transitionStartedAt === 0 ? this.transitionMs : performance.now() - this.transitionStartedAt;
      const raw = Math.max(0, Math.min(1, elapsed / this.transitionMs));
      const progress = 1 - (1 - raw) ** 3;
      const direct = shell && this.transitionDirect && fromIndex !== selectedIndex;
      const flatness = direct
        ? index === selectedIndex
          ? progress
          : index === fromIndex
            ? 1 - progress
            : 0
        : Math.max(0, Math.min(1, 1 - Math.abs(index - focus)));
      const fromMid = index - (count - 1) / 2;
      const flat = flatness > 0.55;
      const anchor = index === primary && toward !== primary ? toward : primary;
      const fanRank = index === anchor ? 0 : index > anchor ? index - 1 : index;
      const rank = flat ? 0 : fanRank + 1;
      const shown = Math.min(rank, 2);
      let cardWidth = this.cardW;
      let cardHeight = this.cardH;
      let x = 0;
      let y = 0;
      let yaw = 0;
      let pitch = 0;
      let stack = 0;
      if (shell) {
        const blend = 1 - flatness;
        const pad = 4;
        const behind = Math.max(count - 1, 1);
        const faceW = Math.min(108, Math.max(92, width * 0.42));
        const gap = 0;
        const faceH = Math.min(76, Math.max(64, height * 0.32));
        const stackSlot = Math.min(fanRank, behind - 1);
        stack = stackSlot;
        const flatW = Math.max(96, width - faceW - pad * 3);
        const flatH = Math.max(48, height - pad * 2);
        const flatX = pad + flatW / 2 - width / 2;
        const faceX = width - pad - faceW / 2 - width / 2;
        const step = Math.max(36, (height - pad * 2 - faceH) / Math.max(behind - 1, 1));
        const faceTop = pad + stackSlot * step;
        const faceY = faceTop + faceH / 2 - height / 2;
        cardWidth = flatW + (faceW - flatW) * blend;
        cardHeight = flatH + (faceH - flatH) * blend;
        x = flatX + (faceX - flatX) * blend;
        y = faceY * blend;
        yaw = -26 * blend;
        pitch = -4 * blend;
      } else if (compact) {
        x = fromMid * (travel / count);
        y = fromMid * Math.min(1.2, yRoom / Math.max(count, 2));
        if (flatness < 0.55) {
          yaw = -14;
          pitch = -5;
        }
      } else {
        x = shown * stepX;
        y = 16 - shown * 34;
      }
      const opacity = shell ? 1 : compact ? (flat ? 1 : 0.88) : rank > 2 ? 0 : 1;
      item.style.pointerEvents = 'auto';
      const z = shell
        ? flatness > 0.55
          ? 3000
          : 120 + stack
        : Math.round(1000 + depth) + (flat ? 800 : 0);
      item.dataset['depthRank'] = String(rank);
      item.style.zIndex = String(z);
      item.style.setProperty('--depth-w', `${cardWidth.toFixed(1)}px`);
      item.style.setProperty('--depth-h', `${cardHeight.toFixed(1)}px`);
      item.style.setProperty('--depth-x', `${x.toFixed(1)}px`);
      item.style.setProperty('--depth-y', `${y.toFixed(1)}px`);
      item.style.setProperty('--depth-z', shell ? '0px' : `${((-rank * 12) * (1 - flatness)).toFixed(1)}px`);
      item.style.setProperty('--depth-yaw', `${yaw}deg`);
      item.style.setProperty('--depth-tilt', `${pitch}deg`);
      item.style.setProperty('--depth-scale', shell ? '1' : (0.94 + 0.06 * flatness).toFixed(4));
      item.style.setProperty('--depth-opacity', opacity.toFixed(3));
      item.style.setProperty('--shell-content', shell ? flatness.toFixed(3) : '1');
    }
    if (this.transitionDirect && this.transitionStartedAt > 0 && performance.now() - this.transitionStartedAt >= this.transitionMs) {
      this.transitionDirect = false;
    }
    this.paintScene(this.tilt);
    this.noteFront();
  }

  private noteFront(): void {
    if (this.mode !== 'browse' || this.items.length === 0) {
      return;
    }
    const front = this.nearest();
    if (front === this.lastFrontIndex) {
      return;
    }
    this.lastFrontIndex = front;
    this.frontIndexChange.emit(front);
  }

  private paintScene(kick: number): void {
    const scene = this.sceneRef?.nativeElement;
    if (!scene) {
      return;
    }
    if (!this.enabled || this.preset === 'shell' || this.preset === 'compact') {
      scene.style.transform = 'none';
      return;
    }
    const preset = PRESETS[this.preset];
    scene.style.transform = `rotateX(${preset.cameraTilt + kick}deg) rotateY(${preset.cameraRotation}deg)`;
  }

  private clearItemStyles(): void {
    for (const item of this.items) {
      this.resetItem(item);
    }
  }

  private resetItem(item: HTMLElement): void {
    item.classList.remove('is-depth-item');
    item.style.zIndex = '';
    item.style.removeProperty('--depth-w');
    item.style.removeProperty('--depth-h');
    item.style.removeProperty('--depth-x');
    item.style.removeProperty('--depth-y');
    item.style.removeProperty('--depth-z');
    item.style.removeProperty('--depth-yaw');
    item.style.removeProperty('--depth-tilt');
    item.style.removeProperty('--depth-scale');
    item.style.removeProperty('--depth-opacity');
    item.style.pointerEvents = '';
    delete item.dataset['depthRank'];
  }
}
