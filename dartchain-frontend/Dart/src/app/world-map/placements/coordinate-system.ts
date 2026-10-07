/**
 * Version figée du repère monde Metaverse (lot MB-1).
 * Toute ancre commerciale doit porter cette version — ne pas changer
 * worldScale / axes pour « zoomer » : 1 unité = 1 mètre.
 */
export const METAVERSE_COORDINATE_SYSTEM_VERSION = 'metaverse-local-v1' as const;

export type MetaverseCoordinateSystemVersion =
  typeof METAVERSE_COORDINATE_SYSTEM_VERSION;

export const METAVERSE_PLACEMENT_LINK_TOLERANCE_METERS = 5;

export interface WorldCoordinate {
  x: number;
  y: number;
  z: number;
  coordinateSystemVersion: MetaverseCoordinateSystemVersion;
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
    coordinateSystemVersion: METAVERSE_COORDINATE_SYSTEM_VERSION,
  };
}

export function isMetaverseLocalV1(version: string): boolean {
  return version === METAVERSE_COORDINATE_SYSTEM_VERSION;
}
