import { Injectable, inject } from '@angular/core';

import { MapConfigService } from '../map-config.service';
import type { WigleGeoDebugStats } from './wigle-point.types';
import type { HorizonScaleDebugStats } from './wigle.types';

@Injectable({ providedIn: 'root' })
export class WigleDebugOverlay {
  private readonly mapConfig = inject(MapConfigService);

  private panel: HTMLDivElement | null = null;
  private visible = false;
  private keyHandler: ((event: KeyboardEvent) => void) | null = null;
  private effectsEnabled = true;
  private effectsToggleHandler: ((enabled: boolean) => void) | null = null;
  private lastStats: { geo: WigleGeoDebugStats; horizon: HorizonScaleDebugStats } | null = null;

  attach(): void {
    if (typeof document === 'undefined') return;
    if (!this.mapConfig.configuration.enableDebug) return;

    this.keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'F10') {
        this.toggleDebugPanel();
      }
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  setEffectsToggleHandler(handler: (enabled: boolean) => void): void {
    this.effectsToggleHandler = handler;
  }

  setEffectsEnabledState(enabled: boolean): void {
    this.effectsEnabled = enabled;
  }

  /** Légende réseau désactivée — conservé pour compat API. */
  setLegendVisible(_visible: boolean): void {}

  updateGeoStats(stats: { geo: WigleGeoDebugStats; horizon: HorizonScaleDebugStats }): void {
    this.lastStats = stats;
    if (!this.visible || !this.panel) return;
    this.renderDebugPanel(stats);
  }

  dispose(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    this.panel?.remove();
    this.panel = null;
  }

  private toggleDebugPanel(): void {
    this.visible = !this.visible;
    if (!this.visible) {
      this.panel?.remove();
      this.panel = null;
      return;
    }
    this.panel = document.createElement('div');
    this.panel.className = 'metaverse-network-debug-panel';
    Object.assign(this.panel.style, {
      position: 'fixed',
      top: '8px',
      right: '8px',
      background: 'rgba(0,0,0,0.88)',
      color: '#9fefff',
      fontFamily: 'monospace',
      fontSize: '10px',
      padding: '10px 14px',
      borderRadius: '6px',
      border: '1px solid rgba(111,247,255,0.25)',
      zIndex: '99999',
      pointerEvents: 'none',
      lineHeight: '1.55',
      minWidth: '280px',
      maxHeight: '90vh',
      overflow: 'auto',
    });
    document.body.appendChild(this.panel);
    if (this.lastStats) {
      this.renderDebugPanel(this.lastStats);
    }
  }

  private renderDebugPanel(stats: {
    geo: WigleGeoDebugStats;
    horizon: HorizonScaleDebugStats;
  }): void {
    if (!this.panel) return;
    const g = stats.geo;
    const h = stats.horizon;
    const ensembles =
      g.buildingEnsembles.length > 0
        ? g.buildingEnsembles.slice(0, 5).join(', ')
        : '—';
    this.panel.innerHTML = `
      <strong>CARTE RÉSEAU / BÂTIMENTS (F10)</strong><br/>
      totalPoints: ${g.totalPoints}<br/>
      visiblePoints: ${g.visiblePoints}<br/>
      entranceMapped: ${g.entranceMappedPoints}<br/>
      activeBuildings: ${g.activeBuildings}<br/>
      activeWaveEffects: ${g.activeWaveEffects}<br/>
      osmFootprintsActive: ${g.osmFootprintsActive}<br/>
      osmMatchedPoints: ${g.osmMatchedPoints}<br/>
      drawCallsEstimate: ${g.drawCallsEstimate}<br/>
      loadRadiusMeters: ${g.loadRadiusMeters}<br/>
      effectsEnabled: ${g.effectsEnabled}<br/>
      ensembles: ${ensembles}<br/><br/>
      <strong>HORIZON SCALE</strong><br/>
      rocketVisible: ${h.rocketVisible}<br/>
      rocketLod: ${h.rocketLod}<br/>
      rocketDistance: ${h.rocketDistanceFromCamera.toFixed(1)} m
    `;
  }
}
