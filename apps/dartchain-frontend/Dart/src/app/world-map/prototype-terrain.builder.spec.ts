import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { MARSEILLE_HARBOR_WATER } from './map-configuration';
import { buildPrototypeTerrainGeometry } from './prototype-terrain.builder';

describe('prototype-terrain.builder', () => {
  it('découpe le bassin et le bras sud sous le plan terrain', () => {
    const geo = buildPrototypeTerrainGeometry(260, MARSEILLE_HARBOR_WATER);
    const pos = geo.getAttribute('position');
    expect(pos.count).toBeGreaterThan(4);

    let basinHole = false;
    let channelHole = false;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (Math.abs(x + 40) < 8 && Math.abs(y) < 8) basinHole = true;
      if (Math.abs(x) < 8 && y > MARSEILLE_HARBOR_WATER.waterMinZ + 0.5) channelHole = true;
    }
    expect(basinHole).toBe(false);
    expect(channelHole).toBe(false);
    geo.dispose();
  });

  it('conserve les bords terre (hors trous bassin / bras sud)', () => {
    const geo = buildPrototypeTerrainGeometry(260, MARSEILLE_HARBOR_WATER);
    geo.computeBoundingBox();
    const pos = geo.getAttribute('position');
    let northEdge = false;
    let eastRim = false;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i);
      if (z < -400) northEdge = true;
      if (x > 100 && Math.abs(z) < 10) eastRim = true;
    }
    expect(geo.boundingBox).not.toBeNull();
    expect(northEdge).toBe(true);
    expect(eastRim).toBe(true);
    geo.dispose();
  });
});
