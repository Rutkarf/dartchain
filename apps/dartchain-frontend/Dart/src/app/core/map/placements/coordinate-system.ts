/**
 * Version figée du repère monde Marseille (lot MB-1).
 * Toute ancre commerciale doit porter cette version — ne pas changer
 * worldScale / axes pour « zoomer » : 1 unité = 1 mètre.
 */
export const MARSEILLE_COORDINATE_SYSTEM_VERSION = 'marseille-local-v1' as const;

export type MarseilleCoordinateSystemVersion =
  typeof MARSEILLE_COORDINATE_SYSTEM_VERSION;

export const MARSEILLE_PLACEMENT_LINK_TOLERANCE_METERS = 5;

export interface WorldCoordinate {
  x: number;
  y: number;
  z: number;
  coordinateSystemVersion: MarseilleCoordinateSystemVersion;
}

export function toWorldCoordinate(
  x: number,
  y: number,
  z: number
): WorldCoordinate {
  return {
    x,
    y,
    z,
    coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
  };
}

export function isMarseilleLocalV1(version: string): boolean {
  return version === MARSEILLE_COORDINATE_SYSTEM_VERSION;
}
