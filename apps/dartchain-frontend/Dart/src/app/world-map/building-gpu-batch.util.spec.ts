import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import {
  batchGroundMeshesByMaterial,
  BuildingMassingInstancedPool,
} from './building-gpu-batch.util';

describe('building-gpu-batch Phase 24', () => {
  it('fusionne les polygones sol OSM par matériau', () => {
    const root = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), mat);
      mesh.name = `ground-osm-poly-${i}`;
      mesh.position.set(i * 3, 0, 0);
      root.add(mesh);
    }

    const result = batchGroundMeshesByMaterial(root);
    expect(result.sourceMeshes).toBe(4);
    expect(result.mergedMeshes).toBe(1);
    expect(root.children).toHaveLength(1);
    expect(root.children[0]!.name.startsWith('ground-osm-batched-')).toBe(true);
  });

  it('instancie le massing LOD sans retirer le mesh source', () => {
    const root = new THREE.Group();
    const pool = new BuildingMassingInstancedPool(root, 64);
    const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });

    const group = new THREE.Group();
    group.name = 'b1';
    group.userData['geoBuilding'] = true;
    group.userData['heightMeters'] = 10;
    group.userData['lodCenterX'] = 0;
    group.userData['lodCenterZ'] = 0;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 10, 6), mat);
    wall.name = 'b1';
    group.add(wall);
    root.add(group);

    pool.register(group);
    pool.syncLod(group, 'massing');

    expect(wall.visible).toBe(false);
    expect(pool.activePools).toBe(1);
    expect(pool.batchedBuildingCount).toBe(1);

    pool.syncLod(group, 'full');
    pool.dispose();
  });
});
