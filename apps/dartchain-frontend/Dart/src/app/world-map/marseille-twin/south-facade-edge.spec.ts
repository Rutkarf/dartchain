import { MARSEILLE_LANDMARK_BUILDINGS } from '../geo-reference.config';
import {
  footprintCentroidWorld,
  southFacadeEdgeFromFootprint,
} from './south-facade-edge';
import { shopsEastNeonSignageZones } from './neon-signage-zones';

describe('south-facade-edge + neon zones (ITER-023/024/030)', () => {
  it('trouve la façade sud (+Z) du landmark 02', () => {
    const landmark = MARSEILLE_LANDMARK_BUILDINGS.find(
      (item) => item.id === 'mirror-adjacent-building-02'
    )!;
    const edge = southFacadeEdgeFromFootprint(landmark.footprint);
    const centroid = footprintCentroidWorld(landmark.footprint);
    expect(edge).not.toBeNull();
    expect(edge!.lengthMeters).toBeGreaterThan(4);
    expect(edge!.midZ).toBeGreaterThanOrEqual(centroid.z - 0.05);
  });

  it('place 5 baies enseigne sur cette arête', () => {
    const zones = shopsEastNeonSignageZones();
    expect(zones.length).toBe(5);
    expect(zones.every((zone) => zone.overlayOnly)).toBe(true);
    expect(zones.every((zone) => zone.sourceQuality === 'PROJECTED')).toBe(true);
  });
});
