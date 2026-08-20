import { OSM_ODBL_ATTRIBUTION } from './osm-attribution';

describe('osm-attribution (ITER-007)', () => {
  it('enregistre la licence ODbL sans prétendre une approbation Ville / IGN', () => {
    expect(OSM_ODBL_ATTRIBUTION.licence).toBe('ODbL');
    expect(OSM_ODBL_ATTRIBUTION.text).toContain('OpenStreetMap');
    expect(OSM_ODBL_ATTRIBUTION.url).toContain('openstreetmap.org/copyright');
  });
});
