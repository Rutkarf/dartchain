import { describe, expect, it } from 'vitest';

import { MAP_PERF_PROFILES, MAP_VISUAL_PARITY, mapPerfProfile } from './marseille-perf.config';

describe('marseille-perf.config Phase 14', () => {
  it('scale le coût GPU sans couper les éléments visuels', () => {
    for (const flag of Object.values(MAP_VISUAL_PARITY)) {
      expect(flag).toBe(true);
    }
  });

  it('Phase 23 — parité contenu OSM identique sur tous les tiers', () => {
    const ultra = mapPerfProfile('ultra-low');
    const high = mapPerfProfile('high');
    expect(ultra.osmBuildingCap).toBe(high.osmBuildingCap);
    expect(ultra.osmStreetCap).toBe(high.osmStreetCap);
  });

  it('ultra-low reste agressif sur DPR, LOD et textures eau', () => {
    const ultra = mapPerfProfile('ultra-low');
    const high = mapPerfProfile('high');
    expect(ultra.pixelRatioCap).toBeLessThan(high.pixelRatioCap);
    expect(ultra.waterPlanarTexSize).toBeLessThan(high.waterPlanarTexSize);
    expect(ultra.lodFullMaxM).toBeLessThan(high.lodFullMaxM);
    expect(ultra.useTaa).toBe(false);
    expect(ultra.useSsao).toBe(false);
    expect(ultra.useFxaa).toBe(true);
  });

  it('high charge OSM par paquets avec LOD actif', () => {
    const high = mapPerfProfile('high');
    expect(high.buildingLodEnforce).toBe(true);
    expect(high.osmBuildingCap).toBeLessThanOrEqual(3200);
    expect(high.osmMeshBatchSize).toBeGreaterThan(0);
    expect(high.osmMeshBatchUseIdle).toBe(true);
    expect(high.shadowMapSize).toBeLessThanOrEqual(512);
    expect(high.taaSampleLevel).toBe(1);
  });

  it('ultra-low throttle simulation et réseau', () => {
    const ultra = mapPerfProfile('ultra-low');
    expect(ultra.mapSimTickSkip).toBeGreaterThan(0);
    expect(ultra.networkTickSkip).toBeGreaterThan(0);
    expect(ultra.atmosphereTickSkip).toBeGreaterThan(0);
  });

  it('conserve synthwave et props sur tous les tiers', () => {
    for (const quality of Object.keys(MAP_PERF_PROFILES) as Array<keyof typeof MAP_PERF_PROFILES>) {
      expect(mapPerfProfile(quality).synthwavePanelCap).toBe(72);
    }
  });
});
