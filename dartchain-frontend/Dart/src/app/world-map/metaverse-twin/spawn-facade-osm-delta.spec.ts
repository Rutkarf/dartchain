import { shopsEastOsmDeltaMeters } from './spawn-facade-osm-delta';
import { SPAWN_FACADE_OSM_ALIGN } from './spawn-facade-align.config';

describe('spawn-facade-osm-delta (ITER-022/029)', () => {
  it('mesure l écart shopsEast vs OSM sans activer l alignement mesh', () => {
    expect(SPAWN_FACADE_OSM_ALIGN.enabled).toBe(false);
    const delta = shopsEastOsmDeltaMeters();
    expect(delta.deltaMeters).toBeGreaterThan(0.2);
    expect(delta.deltaMeters).toBeLessThan(15);
  });
});
