import { Injectable, signal } from '@angular/core';
import {
  DEFAULT_STAR_CONQUEST_UNIVERSE,
  loadStoredUniverse,
  starConquestUniverseTheme,
  storeUniverse,
} from '../../particle-background/star-conquest/star-conquest-universes.config';
import type {
  StarConquestUniverseId,
  StarConquestUniverseTheme,
} from '../../particle-background/star-conquest/star-conquest-universe.types';

/**
 * État de l’univers spatial Star Conquest (indépendant du metaverse floor).
 */
@Injectable({ providedIn: 'root' })
export class StarConquestUniverseService {
  readonly universeId = signal<StarConquestUniverseId>(loadStoredUniverse());
  readonly theme = signal<StarConquestUniverseTheme>(
    starConquestUniverseTheme(loadStoredUniverse())
  );

  setUniverse(_id: StarConquestUniverseId): void {
    const id = DEFAULT_STAR_CONQUEST_UNIVERSE;
    if (this.universeId() === id) return;
    this.universeId.set(id);
    this.theme.set(starConquestUniverseTheme(id));
    storeUniverse(id);
    if (typeof document !== 'undefined') {
      this.applyCssBackground(this.theme());
    }
    window.dispatchEvent(
      new CustomEvent('star-conquest-universe-change', { detail: { universeId: id } })
    );
  }

  cycleUniverse(): StarConquestUniverseId {
    return this.universeId();
  }

  initCssBackground(): void {
    this.applyCssBackground(this.theme());
  }

  private applyCssBackground(theme: StarConquestUniverseTheme): void {
    const root = document.documentElement;
    root.style.setProperty('--sc-universe-bg-center', theme.bgCenter);
    root.style.setProperty('--sc-universe-bg-edge', theme.bgEdge);
    root.style.setProperty(
      '--sc-universe-aurora-rgb',
      `${Math.round(theme.auroraRgb[0] * 255)}, ${Math.round(theme.auroraRgb[1] * 255)}, ${Math.round(theme.auroraRgb[2] * 255)}`
    );
  }
}

export { DEFAULT_STAR_CONQUEST_UNIVERSE };
