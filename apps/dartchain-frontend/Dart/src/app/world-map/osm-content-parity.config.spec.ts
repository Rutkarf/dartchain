import { describe, expect, it } from 'vitest';

import { mapPerfProfile } from './marseille-perf.config';
import {
  OSM_CONTENT_PARITY,
  osmContentBuildingCap,
  osmContentStreetCap,
} from './osm-content-parity.config';

describe('osm-content-parity Phase 23', () => {
  it('aligne le catalogue OSM sur high pour tous les tiers', () => {
    expect(osmContentBuildingCap('ultra-low')).toBe(OSM_CONTENT_PARITY.buildingCap);
    expect(osmContentStreetCap('high')).toBe(OSM_CONTENT_PARITY.streetCap);
    expect(mapPerfProfile('ultra-low').osmBuildingCap).toBe(mapPerfProfile('high').osmBuildingCap);
    expect(mapPerfProfile('low').osmStreetCap).toBe(mapPerfProfile('high').osmStreetCap);
  });
});
