import { Injectable, inject, signal } from '@angular/core';
import { StarConquestFacade } from './star-conquest.facade';
import {
  DEFAULT_STAR_CONQUEST_UNIVERSE,
  loadStoredUniverse,
  starConquestUniverseTheme,
  storeUniverse,
} from '@star-conquest/star-conquest-universes.config';
import {
  STAR_CONQUEST_DESIGN_VIEWPORT,
  STAR_CONQUEST_OVERLAY,
  STAR_CONQUEST_SCALE,
  STAR_CONQUEST_SCALE_TIER,
} from '@star-conquest/star-conquest-scale';
import type {
  StarConquestUniverseId,
  StarConquestUniverseTheme,
} from '@star-conquest/star-conquest-universe.types';

/**
 * État de l’univers spatial Star Conquest (indépendant du metaverse floor).
 */
@Injectable({ providedIn: 'root' })
export class StarConquestUniverseService {
  private readonly facade = inject(StarConquestFacade);
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
    this.facade.notifyUniverseChange(id);
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
    root.style.setProperty('--sc-scale', String(STAR_CONQUEST_SCALE.visual));
    root.style.setProperty('--sc-ui-scale', String(STAR_CONQUEST_SCALE.ui));
    root.style.setProperty('--sc-scale-tier', STAR_CONQUEST_SCALE_TIER);
    root.style.setProperty('--sc-vp-w', `${STAR_CONQUEST_DESIGN_VIEWPORT.w}px`);
    root.style.setProperty('--sc-vp-h', `${STAR_CONQUEST_DESIGN_VIEWPORT.h}px`);
    root.style.setProperty('--sc-overlay-panel-w', `${STAR_CONQUEST_OVERLAY.panelW}px`);
    root.style.setProperty(
      '--sc-overlay-panel-compact-w',
      `${STAR_CONQUEST_OVERLAY.panelCompactW}px`
    );
    root.style.setProperty('--sc-overlay-scanner-w', `${STAR_CONQUEST_OVERLAY.scannerW}px`);
    root.style.setProperty('--sc-overlay-scanner-h', `${STAR_CONQUEST_OVERLAY.scannerMaxH}px`);
    root.style.setProperty('--sc-overlay-floor-chrome', `${STAR_CONQUEST_OVERLAY.floorChromeH}px`);
    root.style.setProperty(
      '--sc-universe-aurora-rgb',
      `${Math.round(theme.auroraRgb[0] * 255)}, ${Math.round(theme.auroraRgb[1] * 255)}, ${Math.round(theme.auroraRgb[2] * 255)}`
    );
  }
}

export { DEFAULT_STAR_CONQUEST_UNIVERSE };
