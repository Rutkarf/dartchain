import { Injectable } from '@angular/core';
import * as THREE from 'three';

import {
  M4T3R_DENSITY_CONFIG,
  R4V3_GROUND_FIELD,
  TRAIL_CONFIG,
} from './map-configuration';
import type { TokenCollectionRequest } from './token-cell.types';
import {
  clustersAlongMovement,
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

const R4V3_TOKEN_COLORS = [0x40e0ff, 0xff3ecf, 0x7a5cff, 0xffe600, 0x235789];
const CELLS_PER_CLUSTER =
  (M4T3R_DENSITY_CONFIG.visualClusterSize / M4T3R_DENSITY_CONFIG.logicalCellSize) ** 2;

function createR4v3TokenGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(
    R4V3_GROUND_FIELD.tokenRadius,
    R4V3_GROUND_FIELD.tokenRadius,
    R4V3_GROUND_FIELD.tokenThickness,
    6
  );
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/**
 * Tapis R4V3 : jetons hexagonaux ancrés sur une grille monde fixe.
 * Pas de crédit token côté client. Le streaming ne déplace jamais une cellule.
 */
@Injectable({ providedIn: 'root' })
export class TokenCellService {
  private root: THREE.Group | null = null;
  private instances: THREE.InstancedMesh | null = null;
  private readonly dummy = new THREE.Object3D();
  private readonly scratch = new THREE.Vector3();
  private readonly color = new THREE.Color();
  private readonly hiddenUntil = new Map<string, number>();
  private readonly pending: TokenCollectionRequest[] = [];
  private visibleCount = 0;
  private lastLogicalCount = 0;
  private rateWindowStart = 0;
  private rateWindowCount = 0;
  private lastOriginCell = { x: Number.NaN, z: Number.NaN };

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
  }

  update(playerPosition: THREE.Vector3): number {
    if (!this.instances) return 0;
    const size = R4V3_GROUND_FIELD.cellSize;
    const originX = Math.round(playerPosition.x / size);
    const originZ = Math.round(playerPosition.z / size);
    if (
      originX === this.lastOriginCell.x &&
      originZ === this.lastOriginCell.z &&
      this.visibleCount > 0
    ) {
      return this.visibleCount;
    }
    this.lastOriginCell = { x: originX, z: originZ };
    const radius = R4V3_GROUND_FIELD.visibleRadius;
    const minX = Math.floor((playerPosition.x - radius) / size);
    const maxX = Math.ceil((playerPosition.x + radius) / size);
    const minZ = Math.floor((playerPosition.z - radius) / size);
    const maxZ = Math.ceil((playerPosition.z + radius) / size);
    let count = 0;
    for (let gz = minZ; gz <= maxZ && count < R4V3_GROUND_FIELD.maxVisibleInstances; gz++) {
      for (let gx = minX; gx <= maxX && count < R4V3_GROUND_FIELD.maxVisibleInstances; gx++) {
        const x = (gx + 0.5) * size;
        const z = (gz + 0.5) * size;
        if (z > R4V3_GROUND_FIELD.waterMinZ) continue;
        if (Math.hypot(x - playerPosition.x, z - playerPosition.z) > radius) continue;
        const yaw = (gx * 13 + gz * 7) * 0.11;
        this.dummy.position.set(x, R4V3_GROUND_FIELD.groundY, z);
        this.dummy.rotation.set(0, yaw, 0);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        this.instances.setMatrixAt(count, this.dummy.matrix);
        this.color.setHex(R4V3_TOKEN_COLORS[Math.abs(gx * 17 + gz * 5) % R4V3_TOKEN_COLORS.length]);
        this.instances.setColorAt(count, this.color);
        count += 1;
      }
    }
    this.instances.count = count;
    this.instances.instanceMatrix.needsUpdate = true;
    if (this.instances.instanceColor) {
      this.instances.instanceColor.needsUpdate = true;
    }
    this.visibleCount = count;
    return count;
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
  }

  restoreClusters(clusterIds: string[]): void {
    for (const id of clusterIds) {
      this.hiddenUntil.delete(id);
    }
  }

  applyServerHide(clusterIds: string[], respawnAt: number): void {
    for (const id of clusterIds) {
      this.hiddenUntil.set(id, respawnAt);
    }
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
    this.lastOriginCell = { x: Number.NaN, z: Number.NaN };
  }

  private expireHidden(): void {
    const now = Date.now();
    for (const [id, until] of this.hiddenUntil) {
      if (until <= now) {
        this.hiddenUntil.delete(id);
      }
    }
  }
}
