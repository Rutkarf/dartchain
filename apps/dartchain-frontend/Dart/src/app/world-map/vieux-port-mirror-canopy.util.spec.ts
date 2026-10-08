/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import {
  MIRROR_SPAWN_SAFE_ZONE,
  SPAWN_CIRCLE_GROUND_COLOR,
} from './map-configuration';
import {
  buildVieuxPortMirrorCanopy,
  createCamberedCanopyGeometry,
  createMetaVerseBbTitleTexture,
  METAVERSE_BB_TITLE_FONT,
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

  it('assembles glass, steel posts and plaza as a named group', () => {
    const built = buildVieuxPortMirrorCanopy('high', { x: 0, y: 8.0, z: 0 });
    expect(built.group.name).toBe('metaverse-mirror-canopy-group');
    const names: string[] = [];
    built.group.traverse((obj) => {
      if (obj.name) names.push(obj.name);
    });
    expect(names).toContain('metaverse-mirror-canopy');
    expect(names).toContain('metaverse-mirror-canopy-top');
    expect(names).toContain('metaverse-mirror-glass-title');
    expect(names).toContain('metaverse-mirror-plaza');
    expect(names).not.toContain('metaverse-mirror-caustic');
    expect(names).not.toContain('metaverse-mirror-aura');
    expect(names).toContain('metaverse-mirror-under-light');
    expect(names.some((n) => n.startsWith('metaverse-mirror-post-'))).toBe(true);
    expect(built.geometries.length).toBeGreaterThan(8);
    expect(built.materials.length).toBeGreaterThan(6);

    const plaza = built.group.getObjectByName('metaverse-mirror-plaza') as THREE.Mesh;
    const plazaMat = plaza.material as THREE.MeshLambertMaterial;
    expect(plazaMat.color.getHex()).toBe(SPAWN_CIRCLE_GROUND_COLOR);
    expect(plazaMat.map).toBeNull();
    expect((plaza.geometry as THREE.CircleGeometry).parameters.radius).toBe(
      MIRROR_SPAWN_SAFE_ZONE.radiusMeters
    );

    const glass = built.group.getObjectByName('metaverse-mirror-canopy') as THREE.Mesh;
    expect(glass).toBeTruthy();
    const mat = glass.material as THREE.MeshPhysicalMaterial;
    expect(mat.transmission).toBeGreaterThan(0.4);
    expect(mat.ior).toBeGreaterThan(1.4);

    const top = built.group.getObjectByName('metaverse-mirror-canopy-top') as THREE.Mesh;
    const topMat = top.material as THREE.MeshPhysicalMaterial;
    expect(topMat.metalness).toBeGreaterThan(0.7);
    expect(topMat.roughness).toBeLessThan(0.08);
    expect(topMat.emissiveIntensity).toBeGreaterThan(0.3);
    expect(topMat.color.getHex()).toBeGreaterThan(0xede7d9);

    for (const g of built.geometries) g.dispose();
    for (const m of built.materials) m.dispose();
    for (const t of built.textures) t.dispose();
  });

  it('skips physical transmission on low and medium quality', () => {
    for (const quality of ['low', 'medium'] as const) {
      const built = buildVieuxPortMirrorCanopy(quality, { x: 0, y: 8.0, z: 0 });
      const glass = built.group.getObjectByName('metaverse-mirror-canopy') as THREE.Mesh;
      const mat = glass.material as THREE.MeshStandardMaterial;
      expect(mat.type).toBe('MeshStandardMaterial');
      expect(mat.metalness).toBeGreaterThan(0.5);
      for (const g of built.geometries) g.dispose();
      for (const m of built.materials) m.dispose();
      for (const t of built.textures) t.dispose();
    }
  });

  it('paints the MetaVerseBB title at most once (Orbitron only, no morph)', async () => {
    expect(METAVERSE_BB_TITLE_FONT).toBe('700 188px Orbitron');
    expect(METAVERSE_BB_TITLE_FONT).not.toMatch(/Arial|Orbit,|900/);

    let painted = 0;
    const tex = createMetaVerseBbTitleTexture(() => {
      painted += 1;
    });
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(painted).toBeLessThanOrEqual(1);
    if (tex.userData['metaverseBbTitlePainted']) {
      expect(painted).toBe(1);
    }
    tex.dispose();
  });
});
