import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';

import { MapLoadingService } from '../../core/map/map-loading.service';
import { M4t3rCoinPickupFxService } from '../../core/map/m4t3r-coin-pickup-fx.service';
import { M4t3rCollectTrailVisualService } from '../../core/map/m4t3r-collect-trail-visual.service';
import { M4t3rPickupFxOrchestratorService } from '../../core/map/m4t3r-pickup-fx-orchestrator.service';
import { M4t3rPickupFxService } from '../../core/map/m4t3r-pickup-fx.service';
import { M4t3rTrailApiService } from '../../core/map/m4t3r-trail-api.service';
import { FootprintTrailManager } from '../../core/map/footprint-trail-manager.service';
import { TokenCellService } from '../../core/map/token-cell.service';
import { FloorRewardBridge } from './floor-reward.bridge';

/**
 * Tokens au sol, FX, footprints — hors CharacterControl.
 * Le crédit faucet reste dans M4t3rRewardRuntimeService via FloorRewardBridge.
 */
@Injectable({ providedIn: 'root' })
export class FloorCollectRuntime {
  private readonly tokenCells = inject(TokenCellService);
  private readonly pickupFx = inject(M4t3rPickupFxService);
  private readonly coinPickupFx = inject(M4t3rCoinPickupFxService);
  private readonly pickupFxOrchestrator = inject(M4t3rPickupFxOrchestratorService);
  private readonly trailApi = inject(M4t3rTrailApiService);
  private readonly collectTrailVisual = inject(M4t3rCollectTrailVisualService);
  private readonly footprints = inject(FootprintTrailManager);
  private readonly mapLoading = inject(MapLoadingService);
  private readonly rewardBridge = inject(FloorRewardBridge);

  private readonly trailPrev = new THREE.Vector3();
  private trailPrevReady = false;
  private trailSyncAge = 0;

  reset(): void {
    this.trailPrevReady = false;
    this.trailSyncAge = 0;
  }

  updateGround(
    mesh: THREE.Object3D,
    playerId: string,
    deltaSeconds: number,
    velocity: THREE.Vector3
  ): void {
    const groundY = this.getGroundYAt(mesh.position.x, mesh.position.z);
    this.footprints.update(mesh.position, velocity, deltaSeconds, groundY);
    this.updateMarseilleTrail(mesh, playerId, deltaSeconds);
    this.pickupFx.update(deltaSeconds);
    this.coinPickupFx.update(deltaSeconds);
  }

  private updateMarseilleTrail(
    mesh: THREE.Object3D,
    playerId: string,
    deltaSeconds: number
  ): void {
    if (!this.trailPrevReady) {
      this.trailPrev.copy(mesh.position);
      this.trailPrevReady = true;
      return;
    }
    const trail = this.tokenCells.collectTrail(
      playerId,
      this.trailPrev,
      mesh.position,
      deltaSeconds,
      false
    );
    this.trailPrev.copy(mesh.position);
    if (trail) {
      this.pickupFxOrchestrator.spawnForCollect(trail.clusterIds, mesh, (x, z) =>
        this.getGroundYAt(x, z)
      );
      this.tokenCells.commitTrailCollect(playerId, trail);
      this.collectTrailVisual.addCollectSegment(
        trail.previousPosition,
        { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
        trail.clusterIds,
        this.getGroundYAt(mesh.position.x, mesh.position.z)
      );

      const submitted = trail;
      this.trailApi.submitTrail(playerId, submitted).subscribe((accepted) => {
        if (!accepted) return;
        if (accepted.collectedCells.length === 0) {
          this.tokenCells.restoreClusters(submitted.clusterIds);
          return;
        }
        this.tokenCells.applyServerHide(accepted.collectedCells, accepted.respawnAt);

        const dx = submitted.currentPosition.x - submitted.previousPosition.x;
        const dz = submitted.currentPosition.z - submitted.previousPosition.z;
        const dist = Math.hypot(dx, dz);
        const clientSpeedEstimate = dist > 0 ? (dist / 0.016).toFixed(3) : '0';
        this.rewardBridge.handleAcceptedTrail(accepted, clientSpeedEstimate);
      });
    }
    this.trailSyncAge += deltaSeconds;
    if (this.trailSyncAge >= 2) {
      this.trailSyncAge = 0;
      this.trailApi.listHidden().subscribe((payload) => {
        if (payload.cells.length > 0) {
          this.tokenCells.syncHiddenFromServer(payload.cells);
        }
      });
    }
  }

  private getGroundYAt(x: number, z: number): number {
    const provider = this.mapLoading.getActiveProvider();
    const surface = provider?.getSurfaceProvider();
    const sync = surface?.getSurfaceHeightSync;
    if (sync) {
      const y = sync(x, z);
      if (typeof y === 'number') return y;
    }
    return 0;
  }
}
