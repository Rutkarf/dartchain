import { Injectable } from '@angular/core';

/** Intervalles sim SC idle (ms) — visuel inchangé, fréquence CPU seule. */
export const SC_IDLE_SIM_INTERVAL_MS = 33.3;
export const SC_IDLE_SIM_INTERVAL_OSM_MS = 50;
export const SC_IDLE_SIM_INTERVAL_STRESSED_MS = 66.7;

export interface DualContextFrameHints {
  dualContextActive: boolean;
  osmBatchActive: boolean;
  scWorldNavigating: boolean;
  floorAvatarMoving: boolean;
  /** Intervalle cible sim particules idle (~30 Hz par défaut). */
  scIdleSimIntervalMs: number;
  /** Reporter sim SC idle cette frame. */
  deferScIdleSim: boolean;
  /** Décimer sim SC active (stick) — 1 frame sur 2. */
  decimateScActiveSim: boolean;
  /** Boost additive mapSimIdleTickSkip. */
  mapIdleTickSkipBoost: number;
  /** Multiplicateur streamCheckIntervalMs quand dual actif. */
  streamIntervalScale: number;
}

const DUAL_STREAM_INTERVAL_SCALE = 1.5;

/**
 * Phase 21 — gouverneur charge combinée Star Conquest + MetaVerseBB floor.
 * Scale la fréquence simulation ; le rendu et les visuels restent intacts.
 */
@Injectable({ providedIn: 'root' })
export class DualContextGovernorService {
  private dualContextActive = false;
  private osmBatchDepth = 0;
  private scWorldNavigating = false;
  private floorAvatarMoving = false;
  private overBudget = false;
  private frameHints: DualContextFrameHints = this.emptyHints();

  beginOsmBatch(): void {
    this.osmBatchDepth++;
  }

  endOsmBatch(): void {
    this.osmBatchDepth = Math.max(0, this.osmBatchDepth - 1);
  }

  get osmBatchActive(): boolean {
    return this.osmBatchDepth > 0;
  }

  setScWorldNavigating(active: boolean): void {
    this.scWorldNavigating = active;
  }

  setFloorAvatarMoving(active: boolean): void {
    this.floorAvatarMoving = active;
  }

  /** Appelé par le scheduler au début de chaque frame combinée. */
  prepareFrame(dualContextActive: boolean, overBudget: boolean): DualContextFrameHints {
    this.dualContextActive = dualContextActive;
    this.overBudget = overBudget;
    this.frameHints = this.resolveHints();
    return this.frameHints;
  }

  getFrameHints(): DualContextFrameHints {
    return this.frameHints;
  }

  private emptyHints(): DualContextFrameHints {
    return {
      dualContextActive: false,
      osmBatchActive: false,
      scWorldNavigating: false,
      floorAvatarMoving: false,
      scIdleSimIntervalMs: SC_IDLE_SIM_INTERVAL_MS,
      deferScIdleSim: false,
      decimateScActiveSim: false,
      mapIdleTickSkipBoost: 0,
      streamIntervalScale: 1,
    };
  }

  private resolveHints(): DualContextFrameHints {
    const dual = this.dualContextActive;
    const osm = this.osmBatchActive;
    const scNav = this.scWorldNavigating;
    const floorMove = this.floorAvatarMoving;
    const stressed = this.overBudget;

    let scIdleSimIntervalMs = SC_IDLE_SIM_INTERVAL_MS;
    let deferScIdleSim = stressed;
    let decimateScActiveSim = false;
    let mapIdleTickSkipBoost = 0;
    let streamIntervalScale = 1;

    if (dual) {
      streamIntervalScale = DUAL_STREAM_INTERVAL_SCALE;
    }

    if (osm) {
      mapIdleTickSkipBoost += 1;
      scIdleSimIntervalMs = SC_IDLE_SIM_INTERVAL_OSM_MS;
    }

    if (scNav && floorMove) {
      decimateScActiveSim = true;
      deferScIdleSim = true;
      scIdleSimIntervalMs = Math.max(scIdleSimIntervalMs, SC_IDLE_SIM_INTERVAL_OSM_MS);
    } else if (scNav && osm) {
      decimateScActiveSim = true;
    }

    if (stressed) {
      deferScIdleSim = true;
      scIdleSimIntervalMs = Math.max(scIdleSimIntervalMs, SC_IDLE_SIM_INTERVAL_STRESSED_MS);
    }

    return {
      dualContextActive: dual,
      osmBatchActive: osm,
      scWorldNavigating: scNav,
      floorAvatarMoving: floorMove,
      scIdleSimIntervalMs,
      deferScIdleSim,
      decimateScActiveSim,
      mapIdleTickSkipBoost,
      streamIntervalScale,
    };
  }
}

/** Boost mapSimIdleTickSkip sous charge OSM / dual context. */
export function effectiveMapIdleTickSkip(baseIdleSkip: number, boost: number): number {
  return baseIdleSkip + Math.max(0, boost);
}

/** Interval streaming OSM scalé (dual context). */
export function scaledStreamCheckIntervalMs(baseMs: number, scale: number): number {
  if (scale <= 1) return baseMs;
  return Math.round(baseMs * scale);
}

/** Sim SC active (stick) — décimation 1 frame sur 2 si demandé. */
export function shouldRunScActiveSimTick(frameIndex: number, decimate: boolean): boolean {
  if (!decimate) return true;
  return frameIndex % 2 === 0;
}
