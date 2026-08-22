import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import {
  createArchitecturalGlassMaterial,
  createQuaySurfaceMaterial,
  usesPhysicalPbrFeatures,
} from './pbr-material.util';

describe('pbr-material.util', () => {
  it('réserve le physical PBR au tier high', () => {
    expect(usesPhysicalPbrFeatures('medium')).toBe(false);
    expect(usesPhysicalPbrFeatures('high')).toBe(true);
  });

  it('quai medium = MeshStandardMaterial', () => {
    const mat = createQuaySurfaceMaterial('medium', {
      roughness: 0.34,
      metalness: 0.26,
      envMapIntensity: 0.88,
    });
    expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
    mat.dispose();
  });

  it('vitrage high = MeshPhysicalMaterial avec transmission', () => {
    const mat = createArchitecturalGlassMaterial('high', { color: 0xffffff });
    expect(mat).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect((mat as THREE.MeshPhysicalMaterial).transmission).toBeGreaterThan(0);
    mat.dispose();
  });
});
