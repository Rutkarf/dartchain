import { describe, expect, it } from 'vitest';

import { MARSEILLE_GEO_ORIGIN } from './geo-reference.config';
import { VIEUX_PORT_OSM_STREET_BOUNDS } from './ground-osm.config';
import { VIEUX_PORT_CORE_BUILDING_RADIUS } from './geo-reference.config';

describe('ground-osm.config (Phase 1.5)', () => {
  it('centre le bbox sur l Ombrière', () => {
    const latMid = (VIEUX_PORT_OSM_STREET_BOUNDS.north + VIEUX_PORT_OSM_STREET_BOUNDS.south) / 2;
    const lonMid = (VIEUX_PORT_OSM_STREET_BOUNDS.east + VIEUX_PORT_OSM_STREET_BOUNDS.west) / 2;
    expect(latMid).toBeCloseTo(MARSEILLE_GEO_ORIGIN.latitude, 4);
    expect(lonMid).toBeCloseTo(MARSEILLE_GEO_ORIGIN.longitude, 4);
  });

  it('couvre environ le rayon cœur Vieux-Port', () => {
    const latSpan =
      (VIEUX_PORT_OSM_STREET_BOUNDS.north - VIEUX_PORT_OSM_STREET_BOUNDS.south) * 111_320;
    expect(latSpan).toBeGreaterThan(VIEUX_PORT_CORE_BUILDING_RADIUS * 1.8);
    expect(latSpan).toBeLessThan(VIEUX_PORT_CORE_BUILDING_RADIUS * 2.2);
  });
});
