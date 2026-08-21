import { MARSEILLE_SPAWN_ANCHOR } from './marseille-spawn-anchor';

/**
 * Direction de vue au spawn — documentation exclusive.
 * Ne mute pas CameraControlService (dépendance partagée).
 */
export const SPAWN_LOOK_DIRECTION = {
  characterHeadingRadians: MARSEILLE_SPAWN_ANCHOR.worldHeadingRadians,
  cameraYawRadians: 0,
  waterDirection: { x: 0, z: 1 } as const,
  /** Heading π : −Z = Canebière devant, +Z = mer derrière. */
  waterIsBehindAvatarWhenFacingCanebiere: true,
  applyAtRuntime: false,
} as const;
