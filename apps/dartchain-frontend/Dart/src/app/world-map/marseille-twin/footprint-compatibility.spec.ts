import { landmarkFootprintCompatibility } from './footprint-compatibility';

describe('footprint-compatibility (ITER-019)', () => {
  it('classe les 4 héros comme anneaux OSM way, pas des rectangles AABB', () => {
    const records = landmarkFootprintCompatibility();
    expect(records.length).toBe(4);
    expect(records.every((item) => item.currentKind === 'osm-way-ring')).toBe(true);
    expect(records.every((item) => item.uniqueVertexCount > 4)).toBe(true);
  });
});
