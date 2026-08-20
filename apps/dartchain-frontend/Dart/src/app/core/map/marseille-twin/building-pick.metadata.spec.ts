import {
  DEFAULT_OVERLAY_PICK,
  overlayShouldBlockPlacementRaycast,
} from './building-pick.metadata';

describe('building-pick.metadata (ITER-015)', () => {
  it('empêche l overlay de voler le raycast placements', () => {
    expect(DEFAULT_OVERLAY_PICK.pickable).toBe(false);
    expect(overlayShouldBlockPlacementRaycast(DEFAULT_OVERLAY_PICK)).toBe(false);
  });
});
