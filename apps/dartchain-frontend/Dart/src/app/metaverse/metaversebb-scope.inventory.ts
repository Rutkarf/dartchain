/**
 * Inventaire figé MetaVerseBB (audit 2026-08-20).
 * Source de vérité pour les tests d’inventaire — ne pas importer depuis DartChain.
 */
export const METAVERSEBB_HOST_SELECTOR = 'app-three-floor';

export const METAVERSEBB_CHILD_SELECTORS = [
  'app-character',
  'app-city-scene',
  'app-joystick-move',
  'app-joystick-view',
  'app-placement-details-panel',
] as const;

export const METAVERSEBB_SHARED_JOYSTICK_SELECTOR = 'app-virtual-joystick';

export const METAVERSEBB_LISTED_ELEMENT_COUNT = 41;

export const METAVERSEBB_EXCLUSIVE_COMPONENT_COUNT = 7;

export const METAVERSEBB_LISTED_UNUSED_COUNT = 0;
