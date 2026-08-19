import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import {
  clustersAlongMovement,
  clusterWorldCenter,
  getCellsAlongMovement,
  getDeterministicVariant,
  getPlayerHeadWorldPosition,
  placeM4T3RAboveGround,
  sampleCollectTrailVisualPoints,
} from './m4t3r-trail.util';
import {
  COLLECT_TRAIL_VISUAL_CONFIG,
  FOOTPRINT_CONFIG,
  M4T3R_DENSITY_CONFIG,
  M4T3R_PICKUP_FX,
  TRAIL_CONFIG,
} from './map-configuration';

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
    expect(M4T3R_PICKUP_FX.headOffsetMeters).toBeCloseTo(0.32);
    expect(M4T3R_PICKUP_FX.text).toBe('+1');
  });

  it('place un M4T3R au-dessus du sol', () => {
    const token = new THREE.Object3D();
    placeM4T3RAboveGround(token, new THREE.Vector3(2, 0, 3));
    expect(token.position.y).toBeCloseTo(M4T3R_DENSITY_CONFIG.groundY);
    expect(token.position.x).toBe(2);
  });

  it('derive empreintes et glow collecte de TRAIL_CONFIG.width', () => {
    expect(TRAIL_CONFIG.width).toBe(0.8);
    expect(FOOTPRINT_CONFIG.footprintSizeX).toBeCloseTo(0.336);
    expect(FOOTPRINT_CONFIG.lateralOffset).toBeCloseTo(0.176);
    expect(COLLECT_TRAIL_VISUAL_CONFIG.quadWidth).toBeCloseTo(0.44);
    expect(COLLECT_TRAIL_VISUAL_CONFIG.lifetimeMs).toBe(2_500);
  });

  it('convertit un cluster en centre monde et échantillonne un segment visuel', () => {
    const center = clusterWorldCenter('m4t3r-cluster:10:20');
    expect(center).toEqual({
      x: (10 + 0.5) * M4T3R_DENSITY_CONFIG.visualClusterSize,
      z: (20 + 0.5) * M4T3R_DENSITY_CONFIG.visualClusterSize,
    });
    const points = sampleCollectTrailVisualPoints(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1.2, 0, 0)
    );
    expect(points.length).toBeGreaterThan(2);
    expect(points[0].x).toBe(0);
    expect(points.at(-1)?.x).toBeCloseTo(1.2);
  });
});
