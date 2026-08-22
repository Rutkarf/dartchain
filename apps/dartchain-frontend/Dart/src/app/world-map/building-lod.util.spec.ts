import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { applyBuildingLodLevel, buildingLodDistanceFrom, tagBuildingLodCenter } from './building-lod.util';
import { buildingLodAtDistance } from './marseille-twin/building-lod.model';
import { mapQualityTier } from './map-configuration';

describe('building-lod.util (Phase 3 finition)', () => {
  it('masque les détails en mode massing', () => {
    const group = new THREE.Group();
    group.name = 'b1';
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    wall.name = 'b1';
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1));
    cornice.name = 'b1-cornice';
    group.add(wall, cornice);

    applyBuildingLodLevel(group, 'massing');
    expect(group.visible).toBe(true);
    expect(wall.visible).toBe(true);
    expect(cornice.visible).toBe(false);
    applyBuildingLodLevel(group, 'massing');
    expect(cornice.visible).toBe(false);
  });

  it('distance LOD depuis userData lodCenter', () => {
    const group = new THREE.Group();
    tagBuildingLodCenter(group, 10, 0);
    expect(buildingLodDistanceFrom(group, 10, 10)).toBeCloseTo(10, 1);
    expect(buildingLodAtDistance(200)).toBe('impostor');
  });
});

describe('mapQualityTier Phase 14', () => {
  it('expose des budgets perf distincts par tier', () => {
    expect(mapQualityTier('low').synthwavePanels).toBe(72);
    expect(mapQualityTier('high').harborSubdivisions).toBeGreaterThan(
      mapQualityTier('low').harborSubdivisions
    );
  });
});
