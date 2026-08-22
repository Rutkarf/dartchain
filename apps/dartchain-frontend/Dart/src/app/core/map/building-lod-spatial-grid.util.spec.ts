import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { BuildingLodSpatialGrid } from './building-lod-spatial-grid.util';

function mockBuilding(x: number, z: number): THREE.Object3D {
  const group = new THREE.Group();
  group.userData['geoBuilding'] = true;
  group.userData['lodCenterX'] = x;
  group.userData['lodCenterZ'] = z;
  return group;
}

describe('BuildingLodSpatialGrid Phase 22', () => {
  it('queryRadius ne retourne que les bâtiments proches', () => {
    const grid = new BuildingLodSpatialGrid(32);
    const near = mockBuilding(10, 10);
    const far = mockBuilding(400, 400);
    grid.register(near, 10, 10);
    grid.register(far, 400, 400);

    const hits = grid.queryRadius(0, 0, 120);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toBe(near);
  });

  it('unregister retire du bucket', () => {
    const grid = new BuildingLodSpatialGrid(32);
    const a = mockBuilding(0, 0);
    grid.register(a, 0, 0);
    expect(grid.size).toBe(1);
    grid.unregister(a);
    expect(grid.size).toBe(0);
    expect(grid.queryRadius(0, 0, 64)).toHaveLength(0);
  });
});
