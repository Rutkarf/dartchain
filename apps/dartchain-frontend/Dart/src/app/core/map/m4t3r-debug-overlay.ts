import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import { TokenCellService, type M4T3RDebugStats } from './token-cell.service';
import { MapConfigService } from './map-config.service';
import { FootprintTrailManager } from './footprint-trail-manager.service';
import { M4t3rCollectTrailVisualService } from './m4t3r-collect-trail-visual.service';
import { M4t3rRewardRuntimeService } from './m4t3r-reward-runtime.service';
import { R4V3_GROUND_FIELD } from './map-configuration';

interface MetaversePerformanceMetrics {
  mapQuality: 'low' | 'medium' | 'high';
  fps: number;
  averageFrameTimeMs: number;
  p95FrameTimeMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs?: number;
  visibleM4T3RInstances: number;
  activeM4T3RChunks: number;
  tokenAnimationFrequencyHz: number;
  activeFootprints: number;
  activeM4T3RTrailQuads: number;
  visibleBuildings: number;
  activeLights: number;
  canvasWidth: number;
  canvasHeight: number;
  pixelRatio: number;
}

/**
 * Dev-only overlay showing M4T3R field stats + world coordinate diagnostics.
 * Activated by pressing F9 when enableDebug is true. Hidden in production.
 */
@Injectable({ providedIn: 'root' })
export class M4t3rDebugOverlay {
  private readonly tokenCells = inject(TokenCellService);
  private readonly mapConfig = inject(MapConfigService);
  private readonly footprints = inject(FootprintTrailManager);
  private readonly collectTrailVisual = inject(M4t3rCollectTrailVisualService);
  private readonly rewardRuntime = inject(M4t3rRewardRuntimeService);

  private panel: HTMLDivElement | null = null;
  private visible = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private fps = 0;
  private frameTimes: number[] = [];
  private rendererMetrics: MetaversePerformanceMetrics | null = null;
  private lastPlayerPos = new THREE.Vector3();
  private lastCameraPos = new THREE.Vector3();
  private m4t3rRoot: THREE.Group | null = null;

  attach(m4t3rRoot?: THREE.Group): void {
    if (!this.mapConfig.configuration.enableDebug) return;
    if (typeof document === 'undefined') return;
    this.m4t3rRoot = m4t3rRoot ?? null;

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'F9') this.toggle();
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  updatePositions(playerPos: THREE.Vector3, cameraPos?: THREE.Vector3): void {
    this.lastPlayerPos.copy(playerPos);
    if (cameraPos) this.lastCameraPos.copy(cameraPos);
  }

  sampleFrame(deltaMs: number): void {
    if (!this.visible) return;
    this.frameTimes.push(deltaMs);
    if (this.frameTimes.length > 60) this.frameTimes.shift();
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.fps = avg > 0 ? 1000 / avg : 0;
  }

  setRendererMetrics(metrics: MetaversePerformanceMetrics): void {
    this.rendererMetrics = metrics;
  }

  private toggle(): void {
    this.visible = !this.visible;
    if (this.visible) {
      this.show();
    } else {
      this.hide();
    }
  }

  private show(): void {
    if (!this.panel) {
      this.panel = document.createElement('div');
      this.panel.id = 'm4t3r-debug-panel';
      Object.assign(this.panel.style, {
        position: 'fixed',
        top: '8px',
        left: '8px',
        background: 'rgba(0,0,0,0.88)',
        color: '#40e0ff',
        fontFamily: 'monospace',
        fontSize: '10px',
        padding: '10px 14px',
        borderRadius: '6px',
        border: '1px solid #40e0ff33',
        zIndex: '99999',
        pointerEvents: 'none',
        lineHeight: '1.55',
        minWidth: '300px',
        maxHeight: '90vh',
        overflow: 'auto',
      });
      document.body.appendChild(this.panel);
    }
    this.panel.style.display = 'block';
    this.intervalId = setInterval(() => this.refresh(), 200);
  }

  private hide(): void {
    if (this.panel) this.panel.style.display = 'none';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private fv(v: THREE.Vector3): string {
    return `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})`;
  }

  private refresh(): void {
    if (!this.panel) return;
    const s: M4T3RDebugStats = this.tokenCells.getDebugStats();
    const pp = this.lastPlayerPos;
    const cp = this.lastCameraPos;

    const rootParent = this.m4t3rRoot?.parent?.name ?? 'unknown';
    const rootWorldPos = new THREE.Vector3();
    this.m4t3rRoot?.getWorldPosition(rootWorldPos);

    const gridSize = R4V3_GROUND_FIELD.cellSize;
    const playerChunkX = Math.floor(pp.x / gridSize);
    const playerChunkZ = Math.floor(pp.z / gridSize);

    const rewardDebug = this.rewardRuntime.debugInfo();

    this.panel.innerHTML = [
      '<b style="color:#ffe600">M4T3R WORLD DEBUG (F9)</b>',
      '',
      '<b>Hierarchy</b>',
      `m4t3rRoot parent: <span style="color:#7f7">${rootParent}</span>`,
      `m4t3rRoot worldPos: ${this.fv(rootWorldPos)}`,
      `frustumCulled: variant-based (default true)`,
      '',
      '<b>Positions</b>',
      `Player world: ${this.fv(pp)}`,
      `Camera world: ${this.fv(cp)}`,
      `Player grid cell: (${playerChunkX}, ${playerChunkZ})`,
      '',
      '<b>Token Field</b>',
      `Total grid cells: ${s.totalCells}`,
      `Visible instances: ${s.visibleInstances}`,
      `Collected (hidden): ${s.collectedTokens}`,
      `Respawning: ${s.respawningTokens}`,
      `Coords: WORLD-SPACE (deterministic grid)`,
      `Coverage: 360° circular r=${R4V3_GROUND_FIELD.visibleRadius}m`,
      `No direction filter: YES`,
      '',
      '<b>Geometry</b>',
      `Orientation: STANDING (rotateZ π/2)`,
      `Height: ${s.previousTokenHeight.toFixed(3)} → ${s.currentTokenHeight.toFixed(3)} (×${s.heightMultiplier})`,
      `Rotation: ${s.rotationSpeed.toFixed(2)} rad/s`,
      `Vertical offset: ${s.verticalOffset}`,
      '',
      '<b>Collection</b>',
      `Last collect: ${s.cellsCollectedLastMove} clusters`,
      `Trail width: ${s.trailWidth}m`,
      `Footprints actives: ${this.footprints.activeFootprintCount()}`,
      `Trail glow quads: ${this.collectTrailVisual.activeQuadCount()}`,
      `Respawn: ${s.respawnDelayMs}ms`,
      `Render→trail grid: 9-point sample`,
      '',
      '<b>Performance</b>',
      `FPS: ${this.fps.toFixed(1)}`,
      `Token anim Hz: ${s.tokenAnimationFrequencyHz}`,
      `R4V3 tokens: ${s.variantCounts['r4v3-token'] ?? s.visibleInstances}`,
      `LOD near/mid/far: ${s.lodCounts.near}/${s.lodCounts.mid}/${s.lodCounts.far}`,
      `Init at startup: ${s.chunksInitialized ? '<span style="color:#7f7">YES</span>' : '<span style="color:#f77">NO</span>'}`,
      this.rendererMetrics
        ? `Renderer calls/triangles: ${this.rendererMetrics.drawCalls}/${this.rendererMetrics.triangles}`
        : 'Renderer calls/triangles: n/a',
      this.rendererMetrics
        ? `Geom/tex/programs: ${this.rendererMetrics.geometries}/${this.rendererMetrics.textures}/${this.rendererMetrics.programs ?? 0}`
        : 'Geom/tex/programs: n/a',
      this.rendererMetrics
        ? `Canvas ${this.rendererMetrics.canvasWidth}x${this.rendererMetrics.canvasHeight} @${this.rendererMetrics.pixelRatio.toFixed(2)}x`
        : 'Canvas: n/a',
      '',
      '<b style="color:#ffe600">M4T3R REWARD DEBUG</b>',
      rewardDebug
        ? [
            `rewardId: ${rewardDebug.rewardId}`,
            `tokenId: ${rewardDebug.tokenId}`,
            `collectionId: ${this.rewardRuntime.maskProof(rewardDebug.collectionId)}`,
            `clientSpeedEstimate: ${rewardDebug.clientSpeedEstimate ?? 'n/a'}`,
            `serverMeasuredSpeed: ${rewardDebug.serverMeasuredSpeed}`,
            `maxAllowedSpeed: ${rewardDebug.maxAllowedSpeed}`,
            `proofHash: ${this.rewardRuntime.maskProof(rewardDebug.proofHash)}`,
            `signatureValid: ${rewardDebug.signatureValid ?? 'n/a'}`,
            `rewardStatus: ${rewardDebug.rewardStatus}`,
            `balanceAfter: ${rewardDebug.balanceAfter ?? 'n/a'}`,
            `transactionId: ${rewardDebug.transactionId ? this.rewardRuntime.maskProof(rewardDebug.transactionId) : 'n/a'}`,
          ].join('<br>')
        : 'No reward yet',
    ].join('<br>');
  }

  dispose(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    this.hide();
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
    this.m4t3rRoot = null;
  }
}
