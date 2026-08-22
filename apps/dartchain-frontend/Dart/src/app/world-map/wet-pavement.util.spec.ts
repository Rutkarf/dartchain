import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { mapPerfProfile } from './marseille-perf.config';
import { tickWetPavementMaterials } from './wet-pavement.util';

describe('wet-pavement Phase 14', () => {
  it('ultra-low anime avec tick skip (frames paires)', () => {
    const road = new THREE.MeshPhysicalMaterial({ roughness: 0.32, metalness: 0.38 });
    const baseRough = road.roughness;
    tickWetPavementMaterials({ road }, 5, 'ultra-low', 1);
    expect(road.roughness).toBe(baseRough);
    tickWetPavementMaterials({ road }, 5, 'ultra-low', 0);
    expect(road.roughness).not.toBe(baseRough);
    expect(mapPerfProfile('ultra-low').wetPavementTickSkip).toBeGreaterThan(0);
    road.dispose();
  });

  it('module la roughness route en medium+', () => {
    const road = new THREE.MeshPhysicalMaterial({
      roughness: 0.32,
      metalness: 0.38,
      clearcoat: 0.22,
    });
    tickWetPavementMaterials({ road }, 0, 'medium');
    expect(road.roughness).toBeLessThan(0.32);
    expect(road.clearcoat).toBeGreaterThan(0.22);
    road.dispose();
  });

  it('anime le quai (sheen / clearcoat)', () => {
    const quay = new THREE.MeshPhysicalMaterial({
      roughness: 0.34,
      metalness: 0.26,
      clearcoat: 0.12,
    });
    tickWetPavementMaterials({ quay }, 1.2, 'high');
    expect(quay.sheen).toBeGreaterThan(0.06);
    expect(quay.clearcoat).toBeGreaterThan(0.12);
    quay.dispose();
  });
});
