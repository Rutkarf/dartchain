import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import {
  buildVieuxPortMirrorCanopy,
  createCamberedCanopyGeometry,
  MIRROR_CANOPY,
} from './vieux-port-mirror-canopy.util';

describe('Vieux-Port mirror canopy', () => {
  it('keeps the glass deck at spawn height and a walkable plaza', () => {
    expect(MIRROR_CANOPY.deckY).toBe(8.0);
    expect(MIRROR_CANOPY.width).toBeGreaterThan(16);
    expect(MIRROR_CANOPY.depth).toBeGreaterThan(10);
    expect(MIRROR_CANOPY.thickness).toBeLessThan(0.2);
    expect(MIRROR_CANOPY.postRadius).toBeLessThan(0.2);
  });

  it('builds a cambered slab instead of a flat box', () => {
    const geo = createCamberedCanopyGeometry(18, 12, 16);
    const pos = geo.getAttribute('position');
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    expect(maxY - minY).toBeGreaterThan(0.15);
    expect(pos.count).toBeGreaterThan(16 * 8);
    geo.dispose();
  });

  it('assembles glass, steel posts, plaza and caustics as a named group', () => {
    const built = buildVieuxPortMirrorCanopy('medium', { x: 0, y: 8.0, z: 0 });
    expect(built.group.name).toBe('marseille-mirror-canopy-group');
    const names: string[] = [];
    built.group.traverse((obj) => {
      if (obj.name) names.push(obj.name);
    });
    expect(names).toContain('marseille-mirror-canopy');
    expect(names).toContain('marseille-mirror-canopy-top');
    expect(names).toContain('marseille-mirror-glass-title');
    expect(names).toContain('marseille-mirror-plaza');
    expect(names).toContain('marseille-mirror-caustic');
    expect(names).toContain('marseille-mirror-aura');
    expect(names).toContain('marseille-mirror-under-light');
    expect(names.some((n) => n.startsWith('marseille-mirror-post-'))).toBe(true);
    expect(built.geometries.length).toBeGreaterThan(8);
    expect(built.materials.length).toBeGreaterThan(6);

    const glass = built.group.getObjectByName('marseille-mirror-canopy') as THREE.Mesh;
    expect(glass).toBeTruthy();
    const mat = glass.material as THREE.MeshPhysicalMaterial;
    expect(mat.transmission).toBeGreaterThan(0.4);
    expect(mat.ior).toBeGreaterThan(1.4);

    for (const g of built.geometries) g.dispose();
    for (const m of built.materials) m.dispose();
    for (const t of built.textures) t.dispose();
  });

  it('skips physical transmission on low quality', () => {
    const built = buildVieuxPortMirrorCanopy('low', { x: 0, y: 8.0, z: 0 });
    const glass = built.group.getObjectByName('marseille-mirror-canopy') as THREE.Mesh;
    const mat = glass.material as THREE.MeshStandardMaterial;
    expect(mat.type).toBe('MeshStandardMaterial');
    expect(mat.metalness).toBeGreaterThan(0.5);
    for (const g of built.geometries) g.dispose();
    for (const m of built.materials) m.dispose();
    for (const t of built.textures) t.dispose();
  });
});
