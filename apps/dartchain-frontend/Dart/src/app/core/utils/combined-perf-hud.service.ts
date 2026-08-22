import { Injectable, signal } from '@angular/core';

import type { DualContextFrameHints } from './dual-context-governor.service';
import { isPerfDebugEnabled } from './perf-debug.util';

export interface CombinedPerfHudSnapshot {
  fps: number;
  combinedFrameMs: number;
  overBudget: boolean;
  floorDrawCalls: number;
  floorTriangles: number;
  scDrawCalls: number;
  scTriangles: number;
  lodQueried: number;
  lodTotal: number;
  osmBatch: boolean;
  dualActive: boolean;
  rafLoops: number;
}

/**
 * Phase 22 — HUD dev combiné SC + floor (metrics only, zero impact si perfDebug off).
 */
@Injectable({ providedIn: 'root' })
export class CombinedPerfHudService {
  readonly snapshot = signal<CombinedPerfHudSnapshot | null>(null);
  readonly visible = signal(false);

  private floorDrawCalls = 0;
  private floorTriangles = 0;
  private scDrawCalls = 0;
  private scTriangles = 0;
  private lodQueried = 0;
  private lodTotal = 0;

  reportFloor(info: { render: { calls: number; triangles: number } }): void {
    if (!this.visible()) return;
    this.floorDrawCalls = info.render.calls;
    this.floorTriangles = info.render.triangles;
  }

  reportStarConquest(info: { render: { calls: number; triangles: number } }): void {
    if (!this.visible()) return;
    this.scDrawCalls = info.render.calls;
    this.scTriangles = info.render.triangles;
  }

  reportLod(queried: number, total: number): void {
    if (!this.visible()) return;
    this.lodQueried = queried;
    this.lodTotal = total;
  }

  syncVisibility(): void {
    this.visible.set(isPerfDebugEnabled());
    if (!this.visible()) {
      this.snapshot.set(null);
    }
  }

  publishFrame(
    deltaMs: number,
    combinedFrameMs: number,
    dual: DualContextFrameHints,
    rafLoops: number
  ): void {
    this.syncVisibility();
    if (!this.visible()) return;

    const fps = deltaMs > 0 ? Math.round(1000 / deltaMs) : 0;
    this.snapshot.set({
      fps,
      combinedFrameMs: Math.round(combinedFrameMs * 10) / 10,
      overBudget: combinedFrameMs > 18,
      floorDrawCalls: this.floorDrawCalls,
      floorTriangles: this.floorTriangles,
      scDrawCalls: this.scDrawCalls,
      scTriangles: this.scTriangles,
      lodQueried: this.lodQueried,
      lodTotal: this.lodTotal,
      osmBatch: dual.osmBatchActive,
      dualActive: dual.dualContextActive,
      rafLoops,
    });
  }
}
