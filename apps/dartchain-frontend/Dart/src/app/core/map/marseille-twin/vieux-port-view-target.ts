import { MARSEILLE_SPAWN_ANCHOR } from './marseille-spawn-anchor';

/**
 * Vue Vieux-Port depuis le spawn : mer au sud (+Z), pas un alignement survey.
 */
export const VIEUX_PORT_VIEW_TARGET = {
  id: 'vieux-port-water-south',
  relativeToSpawn: 'behind-avatar-when-heading-0',
  waterDirection: { x: 0, z: 1 },
  documentedHeadingRadians: MARSEILLE_SPAWN_ANCHOR.worldHeadingRadians,
  sourceQuality: 'APPROXIMATE',
} as const;
