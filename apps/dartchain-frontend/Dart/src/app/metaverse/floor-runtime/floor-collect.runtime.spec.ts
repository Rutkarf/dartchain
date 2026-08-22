import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import * as THREE from 'three';
import { vi } from 'vitest';

import { MapLoadingService } from '../../core/map/map-loading.service';
import { M4t3rCoinPickupFxService } from '../../core/map/m4t3r-coin-pickup-fx.service';
import { M4t3rCollectTrailVisualService } from '../../core/map/m4t3r-collect-trail-visual.service';
import { M4t3rPickupFxOrchestratorService } from '../../core/map/m4t3r-pickup-fx-orchestrator.service';
import { M4t3rPickupFxService } from '../../core/map/m4t3r-pickup-fx.service';
import { M4t3rTrailApiService } from '../../core/map/m4t3r-trail-api.service';
import type { M4t3rTrailPickupAccepted } from '../../core/map/m4t3r-trail-api.service';
import { FootprintTrailManager } from '../../core/map/footprint-trail-manager.service';
import { TokenCellService } from '../../core/map/token-cell.service';
import type { TrailCollectResult } from '../../core/map/token-cell.service';
import { FloorCollectRuntime } from './floor-collect.runtime';
import { FloorRewardBridge } from './floor-reward.bridge';

describe('FloorCollectRuntime', () => {
  let runtime: FloorCollectRuntime;
  let collectTrail: ReturnType<typeof vi.fn>;
  let commitTrailCollect: ReturnType<typeof vi.fn>;
  let restoreClusters: ReturnType<typeof vi.fn>;
  let applyServerHide: ReturnType<typeof vi.fn>;
  let submitTrail: ReturnType<typeof vi.fn>;
  let handleAcceptedTrail: ReturnType<typeof vi.fn>;
  let spawnForCollect: ReturnType<typeof vi.fn>;

  const trail: TrailCollectResult = {
    type: 'M4T3R_TRAIL_PICKUP_REQUEST',
    clusterIds: ['c1'],
    candidateCellIds: ['cell-1'],
    logicalEstimate: 1,
    previousPosition: { x: 0, y: 0, z: 0 },
    currentPosition: { x: 1, y: 0, z: 0 },
    timestamp: Date.now(),
  };

  const accepted: M4t3rTrailPickupAccepted = {
    type: 'M4T3R_TRAIL_PICKUP_ACCEPTED',
    playerId: 'p1',
    collectedCells: ['cell-1'],
    amount: 1,
    respawnAt: 1,
    balanceAfter: '1',
    playerSpeed: '1',
    maxAllowedSpeed: '5',
    settlementMode: 'OFFCHAIN',
    rewards: [],
  };

  function createRuntime(submitResult: M4t3rTrailPickupAccepted | null = accepted): void {
    collectTrail = vi.fn().mockReturnValue(trail);
    commitTrailCollect = vi.fn();
    restoreClusters = vi.fn();
    applyServerHide = vi.fn();
    submitTrail = vi.fn().mockReturnValue(of(submitResult));
    handleAcceptedTrail = vi.fn();
    spawnForCollect = vi.fn();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FloorCollectRuntime,
        {
          provide: TokenCellService,
          useValue: {
            collectTrail,
            commitTrailCollect,
            restoreClusters,
            applyServerHide,
            syncHiddenFromServer: vi.fn(),
          },
        },
        { provide: M4t3rPickupFxService, useValue: { update: vi.fn() } },
        { provide: M4t3rCoinPickupFxService, useValue: { update: vi.fn() } },
        { provide: M4t3rPickupFxOrchestratorService, useValue: { spawnForCollect } },
        {
          provide: M4t3rTrailApiService,
          useValue: { submitTrail, listHidden: () => of({ type: 'x', cells: [] }) },
        },
        { provide: M4t3rCollectTrailVisualService, useValue: { addCollectSegment: vi.fn() } },
        { provide: FootprintTrailManager, useValue: { update: vi.fn() } },
        { provide: MapLoadingService, useValue: { getActiveProvider: () => null } },
        { provide: FloorRewardBridge, useValue: { handleAcceptedTrail } },
      ],
    });
    runtime = TestBed.inject(FloorCollectRuntime);
  }

  function walkOnce(): void {
    const mesh = new THREE.Object3D();
    mesh.position.set(0, 0, 0);
    runtime.updateGround(mesh, 'p1', 0.016, new THREE.Vector3());
    mesh.position.set(1, 0, 0);
    runtime.updateGround(mesh, 'p1', 0.016, new THREE.Vector3());
  }

  it('n’appelle pas le bridge tant que le trail n’est pas amorcé', () => {
    createRuntime();
    const mesh = new THREE.Object3D();
    runtime.updateGround(mesh, 'p1', 0.016, new THREE.Vector3());
    expect(collectTrail).not.toHaveBeenCalled();
    expect(handleAcceptedTrail).not.toHaveBeenCalled();
  });

  it('soumet le trail et appelle le bridge (crédit faucet) si le serveur accepte', () => {
    createRuntime(accepted);
    walkOnce();
    expect(commitTrailCollect).toHaveBeenCalled();
    expect(submitTrail).toHaveBeenCalled();
    expect(applyServerHide).toHaveBeenCalledWith(['cell-1'], 1);
    expect(handleAcceptedTrail).toHaveBeenCalledTimes(1);
    expect(handleAcceptedTrail.mock.calls[0][0]).toEqual(accepted);
  });

  it('restaure les clusters si le serveur n’accepte aucune cellule', () => {
    createRuntime({ ...accepted, collectedCells: [] });
    walkOnce();
    expect(restoreClusters).toHaveBeenCalledWith(['c1']);
    expect(handleAcceptedTrail).not.toHaveBeenCalled();
  });
});
