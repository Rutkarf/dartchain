import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import {
  M4T3R_DENSITY_CONFIG,
  M4T3R_PICKUP_FX,
  TRAIL_CONFIG,
} from './map-configuration';
import {
  clustersAlongMovement,
  getCellsAlongMovement,
  getDeterministicVariant,
  getPlayerHeadWorldPosition,
  placeM4T3RAboveGround,
} from './m4t3r-trail.util';

describe('M4T3R trail sampling', () => {
  it('parcourt le segment sans trou et applique la largeur de traînée', () => {
    const previous = new THREE.Vector3(0, 0, 0);
    const current = new THREE.Vector3(1.2, 0, 0);
    const cells = getCellsAlongMovement(previous, current, M4T3R_DENSITY_CONFIG.logicalCellSize);
    const clusters = clustersAlongMovement(previous, current);
    expect(cells.length).toBeGreaterThan(100);
    expect(cells.length).toBeLessThanOrEqual(TRAIL_CONFIG.maxCellsPerUpdate);
    expect(clusters.length).toBeGreaterThan(4);
    expect(clusters.every((id) => id.startsWith('m4t3r-cluster:'))).toBe(true);
    expect(getDeterministicVariant(clusters[0])).toMatch(
      /thin-leaf|vertical-chip|metal-fragment|neon-shard/
    );
  });

  it('place le feedback au-dessus de la tete ou du sommet de bbox', () => {
    const player = new THREE.Object3D();
    player.position.set(3, 0, 4);
    const head = new THREE.Object3D();
    head.name = 'Head';
    head.position.set(0, 3.9, 0);
    player.add(head);
    player.updateMatrixWorld(true);
    const world = getPlayerHeadWorldPosition(player);
    expect(world.y).toBeCloseTo(3.9, 3);
    expect(world.x).toBeCloseTo(3, 3);
    expect(M4T3R_PICKUP_FX.headOffsetMeters).toBeCloseTo(0.45);
    expect(M4T3R_PICKUP_FX.text).toBe('+1');
  });

  it('place un M4T3R au-dessus du sol', () => {
    const token = new THREE.Object3D();
    placeM4T3RAboveGround(token, new THREE.Vector3(2, 0, 3));
    expect(token.position.y).toBeCloseTo(M4T3R_DENSITY_CONFIG.groundY);
    expect(token.position.x).toBe(2);
  });
});
