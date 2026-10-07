import { isClickNotDrag, placementIdFromIntersections } from './placement-pick.util';

describe('placement-pick.util', () => {
  it('traite un micro-mouvement comme un clic, pas un drag orbite', () => {
    expect(isClickNotDrag({ x: 10, y: 10 }, { x: 14, y: 12 })).toBe(true);
    expect(isClickNotDrag({ x: 10, y: 10 }, { x: 40, y: 10 })).toBe(false);
  });

  it('remonte le placementId depuis le mesh ou son parent', () => {
    const child = { userData: {}, parent: { userData: { placementId: 'dev-placement-01' } } };
    expect(placementIdFromIntersections([{ object: child }])).toBe('dev-placement-01');
    expect(placementIdFromIntersections([{ object: { userData: {} } }])).toBeNull();
  });
});
