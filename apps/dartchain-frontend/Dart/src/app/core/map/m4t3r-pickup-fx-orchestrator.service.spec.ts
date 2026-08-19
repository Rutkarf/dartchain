/**
 * @vitest-environment jsdom
 */
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { M4t3rCoinPickupFxService } from './m4t3r-coin-pickup-fx.service';
import { M4t3rPickupFxOrchestratorService } from './m4t3r-pickup-fx-orchestrator.service';
import { M4t3rPickupFxService } from './m4t3r-pickup-fx.service';

describe('M4t3rPickupFxOrchestratorService', () => {
  it('spawn exactement 1 pièce 3D et 1 +1 par token visuel', () => {
    TestBed.configureTestingModule({});
    const orchestrator = TestBed.inject(M4t3rPickupFxOrchestratorService);
    const plusOne = TestBed.inject(M4t3rPickupFxService);
    const coin = TestBed.inject(M4t3rCoinPickupFxService);

    const scene = new THREE.Scene();
    const character = new THREE.Object3D();
    scene.add(character);
    plusOne.attach(scene);
    coin.attach(scene);

    orchestrator.spawnForCollect(
      ['m4t3r-cluster:0:0', 'm4t3r-cluster:1:0', 'm4t3r-cluster:0:1'],
      character,
      () => 0
    );

    const visiblePlus = scene.children.filter(
      (child) => child.name.startsWith('m4t3r-pickup-plus-one') && child.visible
    );
    const visibleCoins = scene.children.filter(
      (child) =>
        child.name.startsWith('m4t3r-coin-pickup-') &&
        !child.name.includes('sparkle') &&
        !child.name.includes('burst') &&
        child.visible
    );
    expect(visiblePlus).toHaveLength(1);
    expect(visibleCoins).toHaveLength(1);

    orchestrator.spawnForCollect(['m4t3r-cluster:11:0'], character, () => 0);
    expect(
      scene.children.filter(
        (child) => child.name.startsWith('m4t3r-pickup-plus-one') && child.visible
      ).length
    ).toBe(2);

    plusOne.dispose();
    coin.dispose();
  });
});
