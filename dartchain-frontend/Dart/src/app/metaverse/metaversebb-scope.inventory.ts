/**
 * Inventaire figé MetaVerseBB (audit 2026-08-20, étendu arène 2026-09-21).
 * Source de vérité pour les tests d’inventaire — ne pas importer depuis DartChain.
 */
export const METAVERSEBB_HOST_SELECTOR = 'app-three-floor';

export const METAVERSEBB_CHILD_SELECTORS = [
  'app-character',
  'app-city-scene',
  'app-joystick-move',
  'app-joystick-view',
  'app-placement-details-panel',
  'app-arena-hud',
] as const;

export const METAVERSEBB_SHARED_JOYSTICK_SELECTOR = 'app-virtual-joystick';

export const METAVERSEBB_LISTED_ELEMENT_COUNT = 42;

export const METAVERSEBB_EXCLUSIVE_COMPONENT_COUNT = 8;

export const METAVERSEBB_LISTED_UNUSED_COUNT = 0;
