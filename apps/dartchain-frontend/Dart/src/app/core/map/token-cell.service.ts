import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import { MapConfigService } from './map-config.service';

import {
  M4T3R_DENSITY_CONFIG,
  M4T3R_RENDER_CONFIG,
  R4V3_GROUND_FIELD,
  TRAIL_CONFIG,
  WORLD_SCALE,
} from './map-configuration';
import type { TokenCollectionRequest } from './token-cell.types';
import {
  clustersAlongMovement,
  worldToCluster,
  clusterId as trailClusterId,
} from './m4t3r-trail.util';

export interface TrailCollectResult {
  type: 'M4T3R_TRAIL_PICKUP_REQUEST';
  clusterIds: string[];
  candidateCellIds: string[];
  logicalEstimate: number;
  previousPosition: { x: number; y: number; z: number };
  currentPosition: { x: number; y: number; z: number };
  timestamp: number;
}

export interface M4T3RDebugStats {
  totalCells: number;
  availableTokens: number;
  collectedTokens: number;
  respawningTokens: number;
  visibleInstances: number;
  chunksInitialized: number;
  previousTokenHeight: number;
  currentTokenHeight: number;
  heightMultiplier: number;
  rotationSpeed: number;
  verticalOffset: number;
  cellsCollectedLastMove: number;
  trailWidth: number;
  respawnDelayMs: number;
}

const R4V3_TOKEN_COLORS = [0x40e0ff, 0xff3ecf, 0x7a5cff, 0xffe600, 0x235789];
const CELLS_PER_CLUSTER =
  (M4T3R_DENSITY_CONFIG.visualClusterSize / M4T3R_DENSITY_CONFIG.logicalCellSize) ** 2;

const ORIGINAL_TOKEN_THICKNESS = R4V3_GROUND_FIELD.tokenThickness;
const SCALED_TOKEN_THICKNESS = ORIGINAL_TOKEN_THICKNESS * M4T3R_RENDER_CONFIG.heightMultiplier;
// After rotateZ(PI/2), the standing coin's visual height = radius * 2 * scaleY.
const STANDING_COIN_HALF_HEIGHT = R4V3_GROUND_FIELD.tokenRadius * M4T3R_RENDER_CONFIG.heightMultiplier;

function createR4v3TokenGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(
    R4V3_GROUND_FIELD.tokenRadius,
    R4V3_GROUND_FIELD.tokenRadius,
    SCALED_TOKEN_THICKNESS,
    6
  );
  // CylinderGeometry default: Y is the height axis.
  // Rotate 90° around Z so the flat circular face points forward (visible)
  // and the height axis becomes horizontal → coin standing upright on the ground.
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

function deterministicPhase(gx: number, gz: number): number {
  return ((gx * 73 + gz * 137) & 0xffff) / 0xffff * M4T3R_RENDER_CONFIG.phaseSpread;
}

function deterministicSpeed(gx: number, gz: number): number {
  const base = M4T3R_RENDER_CONFIG.rotationSpeedRadiansPerSecond;
  const variation = ((gx * 31 + gz * 97) & 0xff) / 0xff;
  return base * (0.8 + variation * 0.4);
}

/**
 * Tapis R4V3 : jetons hexagonaux ancrés sur une grille monde fixe.
 * Pas de crédit token côté client. Le streaming ne déplace jamais une cellule.
 *
 * Améliorations :
 * - Tokens 50 % plus hauts (heightMultiplier)
 * - Rotation continue autour de Y + léger bob vertical
 * - Tokens collectés masqués (traînée visible)
 * - Initialisation possible sans mouvement du joueur
 */
@Injectable({ providedIn: 'root' })
export class TokenCellService {
  private root: THREE.Group | null = null;
  private instances: THREE.InstancedMesh | null = null;
  private readonly dummy = new THREE.Object3D();
  private readonly scratch = new THREE.Vector3();
  private readonly anchorCenterScratch = new THREE.Vector3();
  private readonly color = new THREE.Color();
  private readonly mapConfig = inject(MapConfigService);
  private readonly hiddenUntil = new Map<string, number>();
  private readonly pending: TokenCollectionRequest[] = [];
  private visibleCount = 0;
  // Liste stable des instances visibles (remplie lors de rebuildGrid()).
  // Permet d'éviter de rescanner la grille à chaque frame.
  private visibleCells: Array<{
    x: number;
    z: number;
    phase: number;
    speed: number;
  }> = [];
  private totalGridCells = 0;
  private lastLogicalCount = 0;
  private lastCollectedCellCount = 0;
  private rateWindowStart = 0;
  private rateWindowCount = 0;
  private lastOriginCell = { x: Number.NaN, z: Number.NaN };
  private elapsedTime = 0;
  private initialized = false;
  /**
   * Accumulateur pour throttle CPU des updates rotation/bobbing
   * (rotation est lente, donc 20–30Hz suffit visuellement).
   */
  private tokenAnimAccumulatorSeconds = 0;
  private tokenAnimIntervalSeconds = 1 / M4T3R_RENDER_CONFIG.animationUpdateHzMedium;

  attach(root: THREE.Group): void {
    this.root = root;
    const geometry = createR4v3TokenGeometry();
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.72,
      emissive: 0x1a3048,
      emissiveIntensity: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.instances = new THREE.InstancedMesh(
      geometry,
      material,
      R4V3_GROUND_FIELD.maxVisibleInstances
    );
    this.instances.name = 'r4v3-token-instances';
    this.instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instances.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(R4V3_GROUND_FIELD.maxVisibleInstances * 3),
      3
    );
    this.instances.count = 0;
    this.instances.frustumCulled = false;
    this.instances.castShadow = false;
    this.instances.receiveShadow = false;
    this.instances.renderOrder = 2;
    this.instances.raycast = () => {};
    root.add(this.instances);
    this.lastOriginCell = { x: Number.NaN, z: Number.NaN };

    // Throttle selon la qualité demandée (low-end-friendly).
    this.tokenAnimIntervalSeconds = 1 / this.resolveTokenAnimationHz();
    this.tokenAnimAccumulatorSeconds = 0;
  }

  private resolveTokenAnimationHz(): number {
    const q = this.mapConfig.configuration.quality;
    if (q === 'low') return M4T3R_RENDER_CONFIG.animationUpdateHzLow;
    if (q === 'high') return M4T3R_RENDER_CONFIG.animationUpdateHzHigh;
    return M4T3R_RENDER_CONFIG.animationUpdateHzMedium;
  }

  /**
   * Force initial token field build at a given position.
   * Call this once after terrain is ready, before player moves.
   */
  initializeField(position: THREE.Vector3): void {
    if (this.initialized) return;
    this.lastOriginCell = { x: Number.NaN, z: Number.NaN };
    this.visibleCount = 0;

    // Ancrage identique à update() (anti-défilement visuel dès le premier frame).
    const snap = WORLD_SCALE.chunkSizeMeters;
    const originX = Math.floor(position.x / snap);
    const originZ = Math.floor(position.z / snap);
    this.lastOriginCell = { x: originX, z: originZ };
    const centerX = originX * snap + snap * 0.5;
    const centerZ = originZ * snap + snap * 0.5;
    this.anchorCenterScratch.set(centerX, 0, centerZ);
    this.rebuildGrid(this.anchorCenterScratch);
    this.initialized = true;
  }

  update(playerPosition: THREE.Vector3, deltaSeconds = 0): number {
    if (!this.instances) return 0;

    this.elapsedTime += deltaSeconds;
    this.expireHidden();

    // IMPORTANT (anti-défilement visuel) :
    // on ancre la "fenêtre de rendu" sur la grille des chunks (128m),
    // afin que les tokens ne semblent pas glisser lors de micro-déplacements.
    const snap = WORLD_SCALE.chunkSizeMeters;
    const originX = Math.floor(playerPosition.x / snap);
    const originZ = Math.floor(playerPosition.z / snap);

    const gridMoved =
      originX !== this.lastOriginCell.x ||
      originZ !== this.lastOriginCell.z;

    if (gridMoved || this.visibleCount === 0) {
      this.lastOriginCell = { x: originX, z: originZ };
      const centerX = originX * snap + snap * 0.5;
      const centerZ = originZ * snap + snap * 0.5;
      this.anchorCenterScratch.set(centerX, 0, centerZ);
      this.rebuildGrid(this.anchorCenterScratch);
      this.tokenAnimAccumulatorSeconds = 0;
    } else {
      // Les animations tournent toujours, mais la sélection visible reste ancrée au même center de chunk.
      this.tokenAnimAccumulatorSeconds += deltaSeconds;
      if (this.tokenAnimAccumulatorSeconds >= this.tokenAnimIntervalSeconds) {
        this.tokenAnimAccumulatorSeconds = 0;
        this.updateAnimations(this.anchorCenterScratch);
      }
    }

    return this.visibleCount;
  }

  private rebuildGrid(centerPosition: THREE.Vector3): void {
    if (!this.instances) return;

    const size = R4V3_GROUND_FIELD.cellSize;
    const radius = R4V3_GROUND_FIELD.visibleRadius;
    const minX = Math.floor((centerPosition.x - radius) / size);
    const maxX = Math.ceil((centerPosition.x + radius) / size);
    const minZ = Math.floor((centerPosition.z - radius) / size);
    const maxZ = Math.ceil((centerPosition.z + radius) / size);
    const now = Date.now();
    const groundY = R4V3_GROUND_FIELD.groundY;
    const tokenY = groundY + STANDING_COIN_HALF_HEIGHT + M4T3R_RENDER_CONFIG.verticalOffset;
    const t = this.elapsedTime;

    let count = 0;
    let totalCells = 0;
    this.visibleCells.length = 0;
    for (let gz = minZ; gz <= maxZ; gz++) {
      for (let gx = minX; gx <= maxX; gx++) {
        const x = (gx + 0.5) * size;
        const z = (gz + 0.5) * size;
        if (z > R4V3_GROUND_FIELD.waterMinZ) continue;
        if (Math.hypot(x - centerPosition.x, z - centerPosition.z) > radius) continue;
        totalCells++;

        if (count >= R4V3_GROUND_FIELD.maxVisibleInstances) continue;

        if (this.isRenderCellHidden(x, z, now)) continue;

        const phase = deterministicPhase(gx, gz);
        const speed = deterministicSpeed(gx, gz);
        const rotY = t * speed + phase;
        const bobY = Math.sin(t * M4T3R_RENDER_CONFIG.bobFrequency + phase) * M4T3R_RENDER_CONFIG.bobAmplitude;

        this.dummy.position.set(x, tokenY + bobY, z);
        this.dummy.rotation.set(0, rotY, 0);
        this.dummy.scale.set(1, M4T3R_RENDER_CONFIG.heightMultiplier, 1);
        this.dummy.updateMatrix();
        this.instances.setMatrixAt(count, this.dummy.matrix);
        this.color.setHex(R4V3_TOKEN_COLORS[Math.abs(gx * 17 + gz * 5) % R4V3_TOKEN_COLORS.length]);
        this.instances.setColorAt(count, this.color);
        this.visibleCells.push({ x, z, phase, speed });
        count += 1;
      }
    }
    this.totalGridCells = totalCells;
    this.instances.count = count;
    this.instances.instanceMatrix.needsUpdate = true;
    if (this.instances.instanceColor) {
      this.instances.instanceColor.needsUpdate = true;
    }
    this.visibleCount = count;
  }

  /**
   * Per-frame animation update without full grid rebuild.
   * Only updates matrices for rotation + bob.
   */
  private updateAnimations(playerPosition: THREE.Vector3): void {
    if (!this.instances || this.visibleCount === 0) return;

    // Sélection déjà figée dans visibleCells : pas de rescanner la grille.
    const groundY = R4V3_GROUND_FIELD.groundY;
    const tokenY = groundY + STANDING_COIN_HALF_HEIGHT + M4T3R_RENDER_CONFIG.verticalOffset;
    const t = this.elapsedTime;

    const count = this.visibleCells.length;
    this.instances.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < count; i++) {
      const c = this.visibleCells[i];
      const rotY = t * c.speed + c.phase;
      const bobY = Math.sin(t * M4T3R_RENDER_CONFIG.bobFrequency + c.phase) * M4T3R_RENDER_CONFIG.bobAmplitude;

      this.dummy.position.set(c.x, tokenY + bobY, c.z);
      this.dummy.rotation.set(0, rotY, 0);
      this.dummy.scale.set(1, M4T3R_RENDER_CONFIG.heightMultiplier, 1);
      this.dummy.updateMatrix();
      this.instances.setMatrixAt(i, this.dummy.matrix);
    }
  }

  visibleTokenCount(): number {
    return this.visibleCount;
  }

  lastCollectedLogicalEstimate(): number {
    return this.lastLogicalCount;
  }

  pendingRequests(): readonly TokenCollectionRequest[] {
    return this.pending;
  }

  hiddenClusterCount(): number {
    return this.hiddenUntil.size;
  }

  getDebugStats(): M4T3RDebugStats {
    const now = Date.now();
    let respawning = 0;
    for (const until of this.hiddenUntil.values()) {
      if (until > now) respawning++;
    }
    return {
      totalCells: this.totalGridCells,
      availableTokens: this.visibleCount,
      collectedTokens: this.hiddenUntil.size,
      respawningTokens: respawning,
      visibleInstances: this.visibleCount,
      chunksInitialized: this.initialized ? 1 : 0,
      previousTokenHeight: R4V3_GROUND_FIELD.tokenRadius * 2,
      currentTokenHeight: R4V3_GROUND_FIELD.tokenRadius * 2 * M4T3R_RENDER_CONFIG.heightMultiplier,
      heightMultiplier: M4T3R_RENDER_CONFIG.heightMultiplier,
      rotationSpeed: M4T3R_RENDER_CONFIG.rotationSpeedRadiansPerSecond,
      verticalOffset: M4T3R_RENDER_CONFIG.verticalOffset,
      cellsCollectedLastMove: this.lastCollectedCellCount,
      trailWidth: TRAIL_CONFIG.width,
      respawnDelayMs: TRAIL_CONFIG.respawnDelayMs,
    };
  }

  /**
   * Collecte la traînée entre deux positions. Validation locale (vitesse / max).
   * N'attribue aucun solde — payload prêt pour M4T3R_TRAIL_PICKUP_REQUEST.
   */
  collectTrail(
    playerId: string,
    previous: THREE.Vector3,
    current: THREE.Vector3,
    deltaSeconds = 0
  ): TrailCollectResult | null {
    const step = Math.hypot(current.x - previous.x, current.z - previous.z);
    if (step < 0.02 || step > TRAIL_CONFIG.maxStepMeters) {
      return null;
    }
    if (
      deltaSeconds > 1e-4 &&
      step / deltaSeconds > TRAIL_CONFIG.maxSpeedMetersPerSecond
    ) {
      return null;
    }
    const now = Date.now();
    if (now - this.rateWindowStart >= 1000) {
      this.rateWindowStart = now;
      this.rateWindowCount = 0;
    }
    const clusterIds = clustersAlongMovement(previous, current).filter((id) => {
      const parts = id.split(':');
      const z = (Number(parts[2]) + 0.5) * M4T3R_DENSITY_CONFIG.visualClusterSize;
      return z <= M4T3R_DENSITY_CONFIG.waterMinZ && (this.hiddenUntil.get(id) ?? 0) <= now;
    });
    if (clusterIds.length === 0) return null;
    const remaining = Math.max(0, 250 - this.rateWindowCount);
    const accepted = clusterIds.slice(0, remaining);
    if (accepted.length === 0) return null;
    this.rateWindowCount += accepted.length;
    const respawnAt = now + TRAIL_CONFIG.respawnDelayMs;
    for (const id of accepted) {
      this.hiddenUntil.set(id, respawnAt);
      this.pending.push({ cellId: id, playerId, timestamp: now });
    }
    this.lastLogicalCount = Math.min(
      TRAIL_CONFIG.maxCellsPerUpdate,
      Math.round(accepted.length * CELLS_PER_CLUSTER)
    );
    this.lastCollectedCellCount = accepted.length;

    this.forceGridDirty();

    return {
      type: 'M4T3R_TRAIL_PICKUP_REQUEST',
      clusterIds: accepted,
      candidateCellIds: accepted,
      logicalEstimate: this.lastLogicalCount,
      previousPosition: { x: previous.x, y: previous.y, z: previous.z },
      currentPosition: { x: current.x, y: current.y, z: current.z },
      timestamp: now,
    };
  }

  requestCollect(playerId: string, playerPosition: THREE.Vector3): TokenCollectionRequest | null {
    this.scratch.set(playerPosition.x - 0.08, playerPosition.y, playerPosition.z);
    const trail = this.collectTrail(playerId, this.scratch, playerPosition);
    if (!trail) return null;
    return this.pending[this.pending.length - 1] ?? null;
  }

  markCollected(cellId: string, respawnAt = Date.now() + TRAIL_CONFIG.respawnDelayMs): void {
    this.hiddenUntil.set(cellId, respawnAt);
    this.forceGridDirty();
  }

  restoreClusters(clusterIds: string[]): void {
    for (const id of clusterIds) {
      this.hiddenUntil.delete(id);
    }
    this.forceGridDirty();
  }

  applyServerHide(clusterIds: string[], respawnAt: number): void {
    for (const id of clusterIds) {
      this.hiddenUntil.set(id, respawnAt);
    }
    this.forceGridDirty();
  }

  applyServerRespawn(clusterIds: string[]): void {
    this.restoreClusters(clusterIds);
  }

  syncHiddenFromServer(cells: Array<{ cellId: string; respawnAt: number }>): void {
    const now = Date.now();
    const incoming = new Set(cells.map((cell) => cell.cellId));
    for (const [id, until] of this.hiddenUntil) {
      if (until <= now) this.hiddenUntil.delete(id);
      else if (!incoming.has(id) && until - now > TRAIL_CONFIG.respawnDelayMs) {
        this.hiddenUntil.delete(id);
      }
    }
    for (const cell of cells) {
      if (cell.respawnAt > now) {
        this.hiddenUntil.set(cell.cellId, cell.respawnAt);
      }
    }
    this.forceGridDirty();
  }

  dispose(): void {
    if (this.instances && this.root) {
      this.root.remove(this.instances);
      this.instances.geometry.dispose();
      (this.instances.material as THREE.Material).dispose();
    }
    this.instances = null;
    this.root = null;
    this.hiddenUntil.clear();
    this.pending.length = 0;
    this.visibleCount = 0;
    this.visibleCells.length = 0;
    this.totalGridCells = 0;
    this.elapsedTime = 0;
    this.initialized = false;
    this.lastOriginCell = { x: Number.NaN, z: Number.NaN };
  }

  private expireHidden(): void {
    const now = Date.now();
    let expired = false;
    for (const [id, until] of this.hiddenUntil) {
      if (until <= now) {
        this.hiddenUntil.delete(id);
        expired = true;
      }
    }
    if (expired) {
      this.forceGridDirty();
    }
  }

  /**
   * Check if a render cell (1.25m grid) overlaps any hidden trail cluster (0.14m grid).
   * Samples 9 points (center + edges) to catch any cluster collected within the cell.
   */
  private isRenderCellHidden(worldX: number, worldZ: number, now: number): boolean {
    const half = R4V3_GROUND_FIELD.cellSize * 0.5;
    const offsets = [-half, 0, half];
    for (const dx of offsets) {
      for (const dz of offsets) {
        const cx = worldToCluster(worldX + dx);
        const cz = worldToCluster(worldZ + dz);
        const key = trailClusterId(cx, cz);
        const until = this.hiddenUntil.get(key);
        if (until !== undefined && until > now) return true;
      }
    }
    return false;
  }

  /** Force a full grid rebuild on the next update() call. */
  private forceGridDirty(): void {
    this.lastOriginCell = { x: Number.NaN, z: Number.NaN };
  }
}
