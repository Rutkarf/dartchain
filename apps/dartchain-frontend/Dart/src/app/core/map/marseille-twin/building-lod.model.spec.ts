import { BUILDING_LOD_POLICY, buildingLodAtDistance } from './building-lod.model';

describe('building-lod.model (ITER-008)', () => {
  it('classe les distances sans toucher au LOD M4T3R', () => {
    expect(buildingLodAtDistance(10)).toBe('full');
    expect(buildingLodAtDistance(BUILDING_LOD_POLICY.fullMaxMeters)).toBe('full');
    expect(buildingLodAtDistance(100)).toBe('massing');
    expect(buildingLodAtDistance(300)).toBe('impostor');
    expect(buildingLodAtDistance(500)).toBe('culled');
  });
});
