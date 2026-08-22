import { ThreeFloor } from './three-floor';
import {
  METAVERSEBB_CHILD_SELECTORS,
  METAVERSEBB_EXCLUSIVE_COMPONENT_COUNT,
  METAVERSEBB_HOST_SELECTOR,
  METAVERSEBB_LISTED_ELEMENT_COUNT,
  METAVERSEBB_LISTED_UNUSED_COUNT,
  METAVERSEBB_SHARED_JOYSTICK_SELECTOR,
} from './metaversebb-scope.inventory';

describe('MetaverseBB scope inventory', () => {
  it('fige le sélecteur hôte', () => {
    expect(METAVERSEBB_HOST_SELECTOR).toBe('app-three-floor');
  });

  it('fige les 7 composants exclusifs', () => {
    expect(METAVERSEBB_EXCLUSIVE_COMPONENT_COUNT).toBe(7);
    expect(METAVERSEBB_CHILD_SELECTORS).toHaveLength(5);
    expect(METAVERSEBB_SHARED_JOYSTICK_SELECTOR).toBe('app-virtual-joystick');
  });

  it('fige le contrat template de ThreeFloor (enfants directs)', () => {
    expect(ThreeFloor).toBeDefined();
    expect([...METAVERSEBB_CHILD_SELECTORS]).toEqual([
      'app-character',
      'app-city-scene',
      'app-joystick-move',
      'app-joystick-view',
      'app-placement-details-panel',
    ]);
  });

  it('confirme que la liste auditée n’a aucun élément unused', () => {
    expect(METAVERSEBB_LISTED_ELEMENT_COUNT).toBe(41);
    expect(METAVERSEBB_LISTED_UNUSED_COUNT).toBe(0);
  });
});
