import { Injectable } from '@angular/core';

import {
  DualContextGovernorService,
  type DualContextFrameHints,
} from './dual-context-governor.service';
import { CombinedPerfHudService } from './combined-perf-hud.service';
import {
  bindWebGlVisibilityPause,
  shouldAnimateWebGl,
  type WebGlVisibilityBinding,
} from './three-animation.util';
import { isPerfDebugEnabled, markRafLoopStart, markRafLoopStop, getActiveRafLoops } from './perf-profiler.util';

/** Budget frame combiné SC + floor (Phase 19). */
export const WEBGL_FRAME_BUDGET_MS = 18;

export interface WebGlFrameContext {
  deltaMs: number;
  deltaSeconds: number;
  frameIndex: number;
  /** Frame précédente combinée > budget — reporter sim idle. */
  overBudget: boolean;
  /** Onglet visible et reduced-motion off. */
  animating: boolean;
  /** Phase 21 — politique dual-context pour cette frame. */
  dual: DualContextFrameHints;
}

export interface WebGlFrameSubscriber {
  id: string;
  /** Ordre croissant — Star Conquest (10) avant MetaVerseBB floor (20). */
  order: number;
  onFrame: (ctx: WebGlFrameContext) => void;
  onPause?: () => void;
  onResume?: () => void;
}

interface RegisteredSubscriber extends WebGlFrameSubscriber {
  active: boolean;
}

/**
 * Phase 19 — une seule boucle rAF pour tous les contextes WebGL de l’app.
 * Sim + render restent dans chaque subscriber ; le scheduler partage le budget frame.
 */
@Injectable({ providedIn: 'root' })
export class WebGlAnimationSchedulerService {
  private readonly subscribers = new Map<string, RegisteredSubscriber>();
  private visibilityBinding?: WebGlVisibilityBinding;
  private rafId = 0;
  private loopRunning = false;
  private lastFrameMs = 0;
  private frameIndex = 0;
  private lastCombinedFrameMs = 0;

  constructor(
    private readonly dualGovernor: DualContextGovernorService,
    private readonly perfHud: CombinedPerfHudService
  ) {}

  register(subscriber: WebGlFrameSubscriber): () => void {
    this.subscribers.set(subscriber.id, { ...subscriber, active: false });
    this.ensureVisibilityBinding();
    return () => {
      this.subscribers.delete(subscriber.id);
      this.maybeStopLoop();
    };
  }

  resumeSubscriber(id: string): void {
    const sub = this.subscribers.get(id);
    if (!sub || sub.active) return;
    sub.active = true;
    sub.onResume?.();
    if (this.lastFrameMs <= 0) {
      this.lastFrameMs = performance.now();
    }
    this.startLoop();
  }

  pauseSubscriber(id: string): void {
    const sub = this.subscribers.get(id);
    if (!sub || !sub.active) return;
    sub.onPause?.();
    sub.active = false;
    this.maybeStopLoop();
  }

  getLastCombinedFrameMs(): number {
    return this.lastCombinedFrameMs;
  }

  private ensureVisibilityBinding(): void {
    if (this.visibilityBinding || typeof document === 'undefined') return;
    this.visibilityBinding = bindWebGlVisibilityPause(
      () => this.handleVisibilityPause(),
      () => this.handleVisibilityResume()
    );
  }

  private handleVisibilityPause(): void {
    for (const sub of this.subscribers.values()) {
      if (!sub.active) continue;
      sub.onPause?.();
      sub.active = false;
    }
    this.stopLoop();
  }

  private handleVisibilityResume(): void {
    if (!shouldAnimateWebGl()) return;
    for (const sub of this.subscribers.values()) {
      if (sub.active) continue;
      sub.active = true;
      sub.onResume?.();
    }
    this.lastFrameMs = performance.now();
    this.startLoop();
  }

  private startLoop(): void {
    if (this.loopRunning) return;
    if (!this.hasActiveSubscriber()) return;
    if (!shouldAnimateWebGl()) return;

    this.loopRunning = true;
    if (this.lastFrameMs <= 0) {
      this.lastFrameMs = performance.now();
    }
    markRafLoopStart();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private maybeStopLoop(): void {
    if (this.hasActiveSubscriber()) return;
    this.stopLoop();
  }

  private stopLoop(): void {
    if (!this.loopRunning) return;
    this.loopRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    markRafLoopStop();
  }

  private hasActiveSubscriber(): boolean {
    for (const sub of this.subscribers.values()) {
      if (sub.active) return true;
    }
    return false;
  }

  private tick = (): void => {
    if (!this.loopRunning) return;

    this.rafId = requestAnimationFrame(this.tick);

    const now = performance.now();
    const deltaMs = Math.max(0, now - this.lastFrameMs);
    this.lastFrameMs = now;
    this.frameIndex++;

    const overBudget = this.lastCombinedFrameMs > WEBGL_FRAME_BUDGET_MS;
    const animating = shouldAnimateWebGl();
    const dualContextActive =
      this.subscribers.get('star-conquest')?.active === true &&
      this.subscribers.get('metaverse-floor')?.active === true;
    const dual = this.dualGovernor.prepareFrame(dualContextActive, overBudget);
    const ctx: WebGlFrameContext = {
      deltaMs,
      deltaSeconds: Math.min(0.05, deltaMs / 1000),
      frameIndex: this.frameIndex,
      overBudget,
      animating,
      dual,
    };

    const frameStart = performance.now();
    const ordered = [...this.subscribers.values()].sort((a, b) => a.order - b.order);
    for (const sub of ordered) {
      if (!sub.active) continue;
      try {
        sub.onFrame(ctx);
      } catch (err) {
        console.error(`[WebGL scheduler] ${sub.id} frame error`, err);
      }
    }
    this.lastCombinedFrameMs = performance.now() - frameStart;

    this.perfHud.publishFrame(deltaMs, this.lastCombinedFrameMs, dual, getActiveRafLoops());

    if (isPerfDebugEnabled() && this.frameIndex % 120 === 0) {
      console.log('[COMBINED:BASELINE]', {
        combinedFrameMs: Math.round(this.lastCombinedFrameMs * 10) / 10,
        overBudget: this.lastCombinedFrameMs > WEBGL_FRAME_BUDGET_MS,
        subscribers: ordered.filter((s) => s.active).map((s) => s.id),
        dual: {
          active: dual.dualContextActive,
          osmBatch: dual.osmBatchActive,
          scNav: dual.scWorldNavigating,
          floorMove: dual.floorAvatarMoving,
          scIdleMs: Math.round(dual.scIdleSimIntervalMs),
          decimateSc: dual.decimateScActiveSim,
        },
      });
    }

    if (!this.hasActiveSubscriber()) {
      this.stopLoop();
    }
  };
}
