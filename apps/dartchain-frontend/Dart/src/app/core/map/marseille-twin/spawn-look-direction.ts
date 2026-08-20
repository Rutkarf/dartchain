import { MARSEILLE_SPAWN_ANCHOR } from './marseille-spawn-anchor';

/**
 * Direction de vue au spawn — documentation exclusive.
 * Ne mute pas CameraControlService (dépendance partagée).
 */
export const SPAWN_LOOK_DIRECTION = {
  characterHeadingRadians: MARSEILLE_SPAWN_ANCHOR.worldHeadingRadians,
  cameraYawRadians: Math.PI,
  waterDirection: { x: 0, z: 1 } as const,
  waterIsBehindAvatarWhenHeading0: true,
  applyAtRuntime: false,
} as const;
