import * as THREE from 'three';

import { OverlayResourceRegistry } from './overlay-resource-registry';

describe('OverlayResourceRegistry (ITER-009)', () => {
  it('dispose geometries, materials et textures suivis', () => {
    const registry = new OverlayResourceRegistry();
    const geometry = registry.trackGeometry(new THREE.BoxGeometry(1, 1, 1));
    const material = registry.trackMaterial(new THREE.MeshBasicMaterial());
    const texture = registry.trackTexture(new THREE.Texture());
    expect(registry.counts.geometries).toBe(1);
    registry.dispose();
    expect(registry.counts.geometries).toBe(0);
    expect(geometry.uuid).toBeTruthy();
    expect(material.uuid).toBeTruthy();
    expect(texture.uuid).toBeTruthy();
  });
});
