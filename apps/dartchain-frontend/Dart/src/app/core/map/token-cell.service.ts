import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import { MapConfigService } from './map-config.service';

import {
  M4T3R_DENSITY_CONFIG,
  M4T3R_LOD_CONFIG,
  M4T3R_RENDER_CONFIG,
  R4V3_GROUND_FIELD,
  TRAIL_CONFIG,
  WORLD_SCALE,
} from './map-configuration';
import type { TokenCollectionRequest } from './token-cell.types';
import {
  getLodBand,
  lodBobAmplitude,
  lodDistanceFromPlayer,
  lodRotationSpeed,
  shouldAnimateLodBand,
  type M4T3RLodBand,
} from './m4t3r-lod.util';
import { isGroundCellExcluded, shouldRenderGroundCell } from './m4t3r-ground-exclusion.util';
import { isOnDiagonalCheckerboard, isWorldPositionOnCheckerboard } from './m4t3r-grid.util';
import {
  clustersAlongMovement,
  worldToCluster,
  clusterId as trailClusterId,
} from './m4t3r-trail.util';
import { groupClustersByRenderCell } from './m4t3r-pickup-fx.util';

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
  tokenAnimationFrequencyHz: number;
  nearAnimationFrequencyHz: number;
  midAnimationFrequencyHz: number;
  variantCounts: Record<string, number>;
  lodCounts: Record<M4T3RLodBand, number>;
}

const R4V3_TOKEN_COLORS = [0x40e0ff, 0xff3ecf, 0x7a5cff, 0xffe600, 0x235789];
const CELLS_PER_CLUSTER =
  (M4T3R_DENSITY_CONFIG.visualClusterSize / M4T3R_DENSITY_CONFIG.logicalCellSize) ** 2;

/** Timestamp « jamais » — cluster collecté ne réapparaît pas visuellement. */
const PERMANENT_HIDE_UNTIL = Number.MAX_SAFE_INTEGER;

function hideUntilForCollect(now: number): number {
  return TRAIL_CONFIG.permanentHide ? PERMANENT_HIDE_UNTIL : now + TRAIL_CONFIG.respawnDelayMs;
}

function isPermanentlyHidden(until: number): boolean {
  return until >= PERMANENT_HIDE_UNTIL - 1;
}

const ORIGINAL_TOKEN_THICKNESS = R4V3_GROUND_FIELD.tokenThickness;
const SCALED_TOKEN_THICKNESS = ORIGINAL_TOKEN_THICKNESS * M4T3R_RENDER_CONFIG.heightMultiplier;
// After rotateZ(PI/2), the standing coin's visual height = radius * 2 * scaleY.
const STANDING_COIN_HALF_HEIGHT = R4V3_GROUND_FIELD.tokenRadius * M4T3R_RENDER_CONFIG.heightMultiplier;
const R4V3_TOKEN_MESH_KEY = 'r4v3-token';

interface VisibleTokenCell {
  x: number;
  z: number;
  phase: number;
  speed: number;
  lod: M4T3RLodBand;
}

interface GridCandidate {
  gx: number;
  gz: number;
  x: number;
  z: number;
  dist: number;
  lod: M4T3RLodBand;
}

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
  private variantRoot: THREE.Group | null = null;
  private tokenMesh: THREE.InstancedMesh | null = null;
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
  private visibleCells: VisibleTokenCell[] = [];
  private readonly lastPlayerPosition = new THREE.Vector3();
  private readonly lodCounts: Record<M4T3RLodBand, number> = { near: 0, mid: 0, far: 0 };
  private lastRebuildPlayerX = Number.NaN;
  private lastRebuildPlayerZ = Number.NaN;
  private totalGridCells = 0;
  private lastLogicalCount = 0;
  private lastCollectedCellCount = 0;
  private rateWindowStart = 0;
  private rateWindowCount = 0;
  private lastOriginCell = { x: Number.NaN, z: Number.NaN };
  private elapsedTime = 0;
  private initialized = false;
  /** Phase 35a — mid LOD throttle ; near = chaque frame via tickVisuals(). */
  private midAnimAccumulatorSeconds = 0;
  private midAnimIntervalSeconds = 1 / M4T3R_RENDER_CONFIG.animationUpdateHzMedium;
  private visualTickCount = 0;
  private readonly variantCounts: Record<string, number> = {};

  private getMaxInstancesForQuality(): number {
    const q = this.mapConfig.configuration.quality;
    if (q === 'low') return 4096;
    if (q === 'high') return 8192;
    return 6144;
  }

  attach(root: THREE.Group): void {
    this.root = root;
    this.variantRoot = new THREE.Group();
    this.variantRoot.name = 'r4v3-token-instances';
    root.add(this.variantRoot);
    const maxInstances = this.getMaxInstancesForQuality();
    const geometry = createR4v3TokenGeometry();
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.34,
      metalness: 0.52,
      emissive: 0x2d3f66,
      emissiveIntensity: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, maxInstances);
    mesh.name = 'r4v3-token-instances-mesh';
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(maxInstances * 3), 3);
    mesh.count = 0;
    mesh.frustumCulled = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 2;
    mesh.raycast = () => {};
    this.variantRoot.add(mesh);
    this.tokenMesh = mesh;
    this.lastOriginCell = { x: Number.NaN, z: Number.NaN };

    this.midAnimIntervalSeconds = 1 / this.resolveMidAnimationHz();
    this.midAnimAccumulatorSeconds = 0;
    this.visualTickCount = 0;
  }

  private resolveMidAnimationHz(): number {
    const q = this.mapConfig.configuration.quality;
    if (q === 'ultra-low' || q === 'low') {
      return M4T3R_RENDER_CONFIG.animationUpdateHzLow;
    }
    if (q === 'high') return M4T3R_RENDER_CONFIG.animationUpdateHzMedium;
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
    this.lastRebuildPlayerX = position.x;
    this.lastRebuildPlayerZ = position.z;
    this.anchorCenterScratch.set(position.x, 0, position.z);
    this.lastPlayerPosition.copy(position);
    this.rebuildGrid(this.anchorCenterScratch, position);
    this.initialized = true;
  }

  /**
   * Phase 35a — rotation/bob à fréquence render (near) + mid throttlé.
   * Indépendant de mapSimTickSkip.
   */
  tickVisuals(deltaSeconds: number): void {
    if (!this.tokenMesh || this.visibleCount === 0) return;

    this.elapsedTime += deltaSeconds;
    this.visualTickCount += 1;
    this.updateAnimationsForBands(['near']);

    this.midAnimAccumulatorSeconds += deltaSeconds;
    if (this.midAnimAccumulatorSeconds >= this.midAnimIntervalSeconds) {
      this.midAnimAccumulatorSeconds %= this.midAnimIntervalSeconds;
      this.updateAnimationsForBands(['mid']);
    }
  }

  /** Streaming / rebuild grille — sans animation (→ tickVisuals). */
  update(playerPosition: THREE.Vector3): number {
    if (!this.tokenMesh) return 0;

    this.lastPlayerPosition.copy(playerPosition);
    this.expireHidden();

    // Rebuild quand on change de chunk ou que le joueur s'éloigne du centre
    // de la dernière fenêtre (≈ moitié du rayon near LOD) pour garder la densité près du perso.
    const snap = WORLD_SCALE.chunkSizeMeters;
    const originX = Math.floor(playerPosition.x / snap);
    const originZ = Math.floor(playerPosition.z / snap);

    const gridMoved =
      originX !== this.lastOriginCell.x ||
      originZ !== this.lastOriginCell.z;
    const rebuildTravelThreshold = M4T3R_LOD_CONFIG.nearMaxDistance * 0.5;
    const playerMoved =
      Number.isFinite(this.lastRebuildPlayerX) &&
      Math.hypot(
        playerPosition.x - this.lastRebuildPlayerX,
        playerPosition.z - this.lastRebuildPlayerZ
      ) >= rebuildTravelThreshold;

    if (gridMoved || this.visibleCount === 0 || playerMoved) {
      this.lastOriginCell = { x: originX, z: originZ };
      this.lastRebuildPlayerX = playerPosition.x;
      this.lastRebuildPlayerZ = playerPosition.z;
      this.anchorCenterScratch.set(playerPosition.x, 0, playerPosition.z);
      this.rebuildGrid(this.anchorCenterScratch, playerPosition);
    }

    return this.visibleCount;
  }

  private rebuildGrid(centerPosition: THREE.Vector3, playerPosition: THREE.Vector3): void {
    const mesh = this.tokenMesh;
    if (!mesh) return;

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
    const maxInstances = this.getMaxInstancesForQuality();

    let count = 0;
    let totalCells = 0;
    this.visibleCells.length = 0;
    this.lodCounts.near = 0;
    this.lodCounts.mid = 0;
    this.lodCounts.far = 0;
    for (const key of Object.keys(this.variantCounts)) delete this.variantCounts[key];

    const candidates: GridCandidate[] = [];
    for (let gz = minZ; gz <= maxZ; gz++) {
      for (let gx = minX; gx <= maxX; gx++) {
        const x = (gx + 0.5) * size;
        const z = (gz + 0.5) * size;
        if (Math.hypot(x - centerPosition.x, z - centerPosition.z) > radius) continue;
        totalCells++;

        if (!isOnDiagonalCheckerboard(gx, gz)) continue;

        const dist = lodDistanceFromPlayer(playerPosition.x, playerPosition.z, x, z);
        const lod = getLodBand(dist);
        if (!shouldRenderGroundCell(gx, gz, x, z, lod)) continue;
        if (this.isRenderCellHidden(x, z, now)) continue;
        candidates.push({ gx, gz, x, z, dist, lod });
      }
    }

    candidates.sort((a, b) => a.dist - b.dist);

    for (const candidate of candidates) {
      if (count >= maxInstances) break;

      const { gx, gz, x, z, lod } = candidate;
      const phase = deterministicPhase(gx, gz);
      const speed = deterministicSpeed(gx, gz);
      const animSpeed = lodRotationSpeed(speed, lod);
      const bobAmp = lodBobAmplitude(lod);
      const rotY = shouldAnimateLodBand(lod) ? t * animSpeed + phase : phase;
      const bobY = shouldAnimateLodBand(lod)
        ? Math.sin(t * M4T3R_RENDER_CONFIG.bobFrequency + phase) * bobAmp
        : 0;

      this.dummy.position.set(x, tokenY + bobY, z);
      this.dummy.rotation.set(0, rotY, 0);
      this.dummy.scale.set(1, M4T3R_RENDER_CONFIG.heightMultiplier, 1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(count, this.dummy.matrix);
      this.color.setHex(R4V3_TOKEN_COLORS[Math.abs(gx * 17 + gz * 5) % R4V3_TOKEN_COLORS.length]);
      if (lod === 'far') {
        this.color.multiplyScalar(0.82);
      } else if (lod === 'mid') {
        this.color.multiplyScalar(0.92);
      }
      mesh.setColorAt(count, this.color);
      const cell: VisibleTokenCell = { x, z, phase, speed, lod };
      this.visibleCells.push(cell);
      this.lodCounts[lod] += 1;
      count += 1;
    }

    this.totalGridCells = totalCells;
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (count > 0) {
      mesh.computeBoundingSphere();
    }
    this.variantCounts[R4V3_TOKEN_MESH_KEY] = count;
    if (this.variantRoot && count > 0) {
      this.variantRoot.frustumCulled = true;
    }
    this.visibleCount = count;
  }

  /** Met à jour rotation + bob pour les bandes LOD demandées. */
  private updateAnimationsForBands(bands: readonly M4T3RLodBand[]): void {
    const mesh = this.tokenMesh;
    if (!mesh || this.visibleCount === 0) return;

    const bandSet = new Set<M4T3RLodBand>(bands);
    const groundY = R4V3_GROUND_FIELD.groundY;
    const tokenY = groundY + STANDING_COIN_HALF_HEIGHT + M4T3R_RENDER_CONFIG.verticalOffset;
    const t = this.elapsedTime;
    let changed = false;

    for (let i = 0; i < this.visibleCells.length; i++) {
      const c = this.visibleCells[i];
      if (!bandSet.has(c.lod) || !shouldAnimateLodBand(c.lod)) continue;
      changed = true;
      const animSpeed = lodRotationSpeed(c.speed, c.lod);
      const bobAmp = lodBobAmplitude(c.lod);
      const rotY = t * animSpeed + c.phase;
      const bobY = Math.sin(t * M4T3R_RENDER_CONFIG.bobFrequency + c.phase) * bobAmp;
      this.dummy.position.set(c.x, tokenY + bobY, c.z);
      this.dummy.rotation.set(0, rotY, 0);
      this.dummy.scale.set(1, M4T3R_RENDER_CONFIG.heightMultiplier, 1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (changed) {
      mesh.instanceMatrix.needsUpdate = true;
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
      if (isPermanentlyHidden(until)) continue;
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
      tokenAnimationFrequencyHz: M4T3R_RENDER_CONFIG.animationUpdateHzNear,
      nearAnimationFrequencyHz: M4T3R_RENDER_CONFIG.animationUpdateHzNear,
      midAnimationFrequencyHz: Math.round(1 / this.midAnimIntervalSeconds),
      variantCounts: { ...this.variantCounts },
      lodCounts: { ...this.lodCounts },
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
    deltaSeconds = 0,
    commit = true
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
      const x = (Number(parts[1]) + 0.5) * M4T3R_DENSITY_CONFIG.visualClusterSize;
      return (
        isWorldPositionOnCheckerboard(x, z) &&
        !isGroundCellExcluded(x, z) &&
        (this.hiddenUntil.get(id) ?? 0) <= now
      );
    });
    if (clusterIds.length === 0) return null;

    const visualCells = groupClustersByRenderCell(clusterIds);
    const remaining = Math.max(0, TRAIL_CONFIG.maxVisualPickupsPerSecond - this.rateWindowCount);
    const allowedCells = visualCells.slice(0, remaining);
    if (allowedCells.length === 0) return null;
    const accepted = allowedCells.flatMap((cell) => cell.clusterIds);

    const trail: TrailCollectResult = {
      type: 'M4T3R_TRAIL_PICKUP_REQUEST',
      clusterIds: accepted,
      candidateCellIds: accepted,
      logicalEstimate: Math.min(
        TRAIL_CONFIG.maxCellsPerUpdate,
        Math.round(accepted.length * CELLS_PER_CLUSTER)
      ),
      previousPosition: { x: previous.x, y: previous.y, z: previous.z },
      currentPosition: { x: current.x, y: current.y, z: current.z },
      timestamp: now,
    };

    if (commit) {
      this.commitTrailCollect(playerId, trail);
    }

    return trail;
  }

  /** Applique le masquage local après confirmation visuelle (FX ramassage). */
  commitTrailCollect(playerId: string, trail: TrailCollectResult): void {
    const now = trail.timestamp;
    this.rateWindowCount += groupClustersByRenderCell(trail.clusterIds).length;
    const respawnAt = hideUntilForCollect(now);
    for (const id of trail.clusterIds) {
      this.hiddenUntil.set(id, respawnAt);
      this.pending.push({ cellId: id, playerId, timestamp: now });
    }
    this.lastLogicalCount = trail.logicalEstimate;
    this.lastCollectedCellCount = trail.clusterIds.length;
    this.forceGridDirty();
  }

  requestCollect(playerId: string, playerPosition: THREE.Vector3): TokenCollectionRequest | null {
    this.scratch.set(playerPosition.x - 0.08, playerPosition.y, playerPosition.z);
    const trail = this.collectTrail(playerId, this.scratch, playerPosition);
    if (!trail) return null;
    return this.pending[this.pending.length - 1] ?? null;
  }

  markCollected(cellId: string, respawnAt = hideUntilForCollect(Date.now())): void {
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
    void respawnAt;
    const until = hideUntilForCollect(Date.now());
    for (const id of clusterIds) {
      this.hiddenUntil.set(id, until);
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
      if (isPermanentlyHidden(until)) continue;
      if (until <= now) this.hiddenUntil.delete(id);
      else if (!incoming.has(id) && until - now > TRAIL_CONFIG.respawnDelayMs) {
        this.hiddenUntil.delete(id);
      }
    }
    for (const cell of cells) {
      this.hiddenUntil.set(cell.cellId, hideUntilForCollect(now));
    }
    this.forceGridDirty();
  }

  dispose(): void {
    if (this.root && this.variantRoot) {
      this.root.remove(this.variantRoot);
      if (this.tokenMesh) {
        this.tokenMesh.geometry.dispose();
        (this.tokenMesh.material as THREE.Material).dispose();
      }
    }
    this.tokenMesh = null;
    this.root = null;
    this.variantRoot = null;
    this.hiddenUntil.clear();
    this.pending.length = 0;
    this.visibleCount = 0;
    this.visibleCells.length = 0;
    this.totalGridCells = 0;
    this.elapsedTime = 0;
    this.midAnimAccumulatorSeconds = 0;
    this.visualTickCount = 0;
    this.initialized = false;
    this.lastOriginCell = { x: Number.NaN, z: Number.NaN };
    this.lastRebuildPlayerX = Number.NaN;
    this.lastRebuildPlayerZ = Number.NaN;
  }

  private expireHidden(): void {
    const now = Date.now();
    let expired = false;
    for (const [id, until] of this.hiddenUntil) {
      if (isPermanentlyHidden(until)) continue;
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
        if (until !== undefined && (isPermanentlyHidden(until) || until > now)) return true;
      }
    }
    return false;
  }

  /** Force a full grid rebuild on the next update() call. */
  private forceGridDirty(): void {
    this.lastOriginCell = { x: Number.NaN, z: Number.NaN };
  }
}
