import { MARSEILLE_SPAWN_ANCHOR } from './marseille-spawn-anchor';

/**
 * Vue Vieux-Port depuis le spawn : mer au sud (+Z), derrière l’avatar face Canebière (heading π).
 */
export const VIEUX_PORT_VIEW_TARGET = {
  id: 'vieux-port-water-south',
  relativeToSpawn: 'behind-avatar-when-facing-canebiere',
  waterDirection: { x: 0, z: 1 },
  documentedHeadingRadians: MARSEILLE_SPAWN_ANCHOR.worldHeadingRadians,
  sourceQuality: 'APPROXIMATE',
} as const;
