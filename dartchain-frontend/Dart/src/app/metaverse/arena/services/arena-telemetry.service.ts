import { Injectable, signal } from '@angular/core';

export interface ArenaTelemetrySnapshot {
  shots: number;
  hits: number;
  misses: number;
  kills: number;
  deaths: number;
  earnedFaucet: number;
  sessionStartedAt: number;
  lastFps: number;
}

/**
 * Télémétrie anonyme locale (session) — pas d’envoi réseau.
 */
@Injectable({ providedIn: 'root' })
export class ArenaTelemetryService {
  private readonly snap: ArenaTelemetrySnapshot = {
    shots: 0,
    hits: 0,
    misses: 0,
    kills: 0,
    deaths: 0,
    earnedFaucet: 0,
    sessionStartedAt: Date.now(),
    lastFps: 0,
  };
  private readonly snapshotSignal = signal({ ...this.snap });

  readonly snapshot = this.snapshotSignal.asReadonly();

  resetSession(): void {
    this.snap.shots = 0;
    this.snap.hits = 0;
    this.snap.misses = 0;
    this.snap.kills = 0;
    this.snap.deaths = 0;
    this.snap.earnedFaucet = 0;
    this.snap.sessionStartedAt = Date.now();
    this.publish();
  }

  recordShot(result: 'hit' | 'miss' | 'kill'): void {
    this.snap.shots += 1;
    if (result === 'miss') this.snap.misses += 1;
    else this.snap.hits += 1;
    if (result === 'kill') this.snap.kills += 1;
    this.publish();
  }

  recordDeath(): void {
    this.snap.deaths += 1;
    this.publish();
  }

  recordEarn(amount: number): void {
    this.snap.earnedFaucet += Math.max(0, amount);
    this.publish();
  }

  setFps(fps: number): void {
    this.snap.lastFps = Math.round(fps);
    this.publish();
  }

  accuracyPct(): number {
    if (this.snap.shots <= 0) return 0;
    return Math.round((this.snap.hits / this.snap.shots) * 100);
  }

  private publish(): void {
    this.snapshotSignal.set({ ...this.snap });
  }
}
