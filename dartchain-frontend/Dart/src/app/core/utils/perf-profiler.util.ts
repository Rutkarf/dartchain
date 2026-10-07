/**
 * Profiler léger — actif si ?perfDebug=1 ou localStorage PERF_DEBUG=1.
 * Ne tourne pas en production sans opt-in explicite.
 */

import { isPerfDebugEnabled } from './perf-debug.util';

export { isPerfDebugEnabled } from './perf-debug.util';

export interface PerfSnapshot {
  fps: number;
  avgFrameMs: number;
  worstFrameMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  sceneChildren: number;
  collisionChecks: number;
  rafLoops: number;
}

let activeRafLoops = 0;
let collisionChecksThisFrame = 0;

export function getActiveRafLoops(): number {
  return activeRafLoops;
}

export function markRafLoopStart(): void {
  if (!isPerfDebugEnabled()) return;
  activeRafLoops++;
}

export function markRafLoopStop(): void {
  if (!isPerfDebugEnabled()) return;
  activeRafLoops = Math.max(0, activeRafLoops - 1);
}

export function addCollisionChecks(n: number): void {
  if (!isPerfDebugEnabled()) return;
  collisionChecksThisFrame += n;
}

export function resetCollisionChecks(): void {
  collisionChecksThisFrame = 0;
}

export class PerfProfiler {
  private frames = 0;
  private accMs = 0;
  private worstMs = 0;
  private reportEveryMs = 2000;
  private sinceReport = 0;

  sample(frameMs: number): void {
    if (!isPerfDebugEnabled()) return;
    this.frames++;
    this.accMs += frameMs;
    this.worstMs = Math.max(this.worstMs, frameMs);
    this.sinceReport += frameMs;
  }

  maybeReport(
    renderer: { info: { render: { calls: number; triangles: number }; memory: { geometries: number; textures: number } } },
    sceneChildren: number,
    label = 'floor'
  ): PerfSnapshot | null {
    if (!isPerfDebugEnabled() || this.sinceReport < this.reportEveryMs) return null;

    const avg = this.frames > 0 ? this.accMs / this.frames : 0;
    const snap: PerfSnapshot = {
      fps: avg > 0 ? 1000 / avg : 0,
      avgFrameMs: avg,
      worstFrameMs: this.worstMs,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      sceneChildren,
      collisionChecks: collisionChecksThisFrame,
      rafLoops: activeRafLoops,
    };

    const heap =
      typeof performance !== 'undefined' &&
      (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
        ? Math.round(
            ((performance as Performance & { memory: { usedJSHeapSize: number } }).memory
              .usedJSHeapSize /
              1048576) *
              10
          ) / 10
        : null;

    console.log(`[PERF:${label}]`, {
      fps: Math.round(snap.fps),
      avgFrameMs: Math.round(snap.avgFrameMs * 10) / 10,
      worstFrameMs: Math.round(snap.worstFrameMs * 10) / 10,
      drawCalls: snap.drawCalls,
      triangles: snap.triangles,
      geometries: snap.geometries,
      textures: snap.textures,
      sceneChildren: snap.sceneChildren,
      collisionChecks: snap.collisionChecks,
      rafLoops: snap.rafLoops,
      heapMb: heap,
    });

    this.frames = 0;
    this.accMs = 0;
    this.worstMs = 0;
    this.sinceReport = 0;
    return snap;
  }
}
