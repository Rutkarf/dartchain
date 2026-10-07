/**
 * Filtres pointer + coalescence rAF — exclusifs aux joysticks metaverseBB.
 * Deux sticks = deux pointerId ; ne jamais exiger event.isPrimary (casserait le 2ᵉ pouce).
 */
export function isJoystickPointerStart(
  event: Pick<PointerEvent, 'pointerType' | 'button'>,
  activePointer: number | null
): boolean {
  if (activePointer !== null) return false;
  if (event.pointerType === 'mouse' && event.button !== 0) return false;
  return true;
}

/** Dernier échantillon coalescé du navigateur (précision) ; fallback = event. */
export function latestPointerSample(event: PointerEvent): PointerEvent {
  const coalesced = event.getCoalescedEvents?.();
  if (!coalesced || coalesced.length === 0) return event;
  return coalesced[coalesced.length - 1] ?? event;
}

/**
 * pointermove → au plus une émission par frame.
 * Release / premier contact : now() annule le pending et dispatch tout de suite.
 * Les vecteurs identiques au dernier dispatch sont ignorés.
 */
export class JoystickEmitCoalescer {
  private rafId = 0;
  private pendingX = 0;
  private pendingY = 0;
  private hasPending = false;
  private lastX = Number.NaN;
  private lastY = Number.NaN;

  constructor(
    private readonly dispatch: (x: number, y: number) => void,
    private readonly scheduleFrame: (cb: () => void) => number = (cb) =>
      typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : (cb(), 0),
    private readonly cancelFrame: (id: number) => void = (id) => {
      if (typeof cancelAnimationFrame === 'function' && id !== 0) {
        cancelAnimationFrame(id);
      }
    }
  ) {}

  now(x: number, y: number): void {
    this.clearPending();
    this.emitIfChanged(x, y);
  }

  later(x: number, y: number): void {
    if (!this.hasPending && x === this.lastX && y === this.lastY) return;
    this.pendingX = x;
    this.pendingY = y;
    this.hasPending = true;
    if (this.rafId !== 0) return;
    this.rafId = this.scheduleFrame(() => {
      this.rafId = 0;
      if (!this.hasPending) return;
      this.hasPending = false;
      this.emitIfChanged(this.pendingX, this.pendingY);
    });
  }

  dispose(): void {
    this.clearPending();
    this.lastX = Number.NaN;
    this.lastY = Number.NaN;
  }

  private emitIfChanged(x: number, y: number): void {
    if (x === this.lastX && y === this.lastY) return;
    this.lastX = x;
    this.lastY = y;
    this.dispatch(x, y);
  }

  private clearPending(): void {
    if (this.rafId !== 0) {
      this.cancelFrame(this.rafId);
      this.rafId = 0;
    }
    this.hasPending = false;
  }
}
