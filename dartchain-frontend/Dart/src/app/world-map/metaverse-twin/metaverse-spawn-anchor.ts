import { METRO_SPAWN_ANCHOR } from '../map-configuration';
import { METAVERSE_GEO_ORIGIN } from '../geo-reference.config';
import { METAVERSE_COORDINATE_SYSTEM_VERSION } from '../placements/coordinate-system';
import type { GeoSourceQuality } from './source-quality';

/**
 * Ancre de spawn documentée — n’applique pas de nouveau transform runtime.
 * Le gameplay reste `METRO_SPAWN_ANCHOR` + `CharacterControlService`.
 */
export interface MetaverseSpawnAnchor {
  id: 'vieux-port-ombriere';
  sourceQuality: GeoSourceQuality;
  geographicCoordinate: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  worldPosition: { x: number; y: number; z: number };
  worldHeadingRadians: number;
  referenceLandmark: 'Ombrière du Vieux-Port';
  calibrationNotes: string;
  coordinateSystemVersion: string;
  /** false = ne pas déplacer les joueurs existants. */
  applyAtRuntime: false;
  runtimeBinding: 'METRO_SPAWN_ANCHOR';
}

const spawnWorld = {
  x: METRO_SPAWN_ANCHOR.mirror.x + METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.x,
  y: 0,
  z: METRO_SPAWN_ANCHOR.mirror.z + METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.z,
} as const;

export const METAVERSE_SPAWN_ANCHOR: MetaverseSpawnAnchor = {
  id: 'vieux-port-ombriere',
  sourceQuality: 'PROJECTED',
  geographicCoordinate: {
    latitude: METAVERSE_GEO_ORIGIN.latitude,
    longitude: METAVERSE_GEO_ORIGIN.longitude,
    altitude: METAVERSE_GEO_ORIGIN.altitude,
  },
  worldPosition: spawnWorld,
  /** Aligné sur METAVERSE_START_ORIENTATION.characterRotationY = π (Canebière / −Z). */
  worldHeadingRadians: Math.PI,
  referenceLandmark: 'Ombrière du Vieux-Port',
  calibrationNotes:
    'Origin geo = OSM way/200273945. Avatar XZ = just south of mirror (0, 5) on esplanade before water. Heading π faces Canebière (−Z); sea (+Z) behind. Canopy deck y=8.0. Not a survey monument.',
  coordinateSystemVersion: METAVERSE_COORDINATE_SYSTEM_VERSION,
  applyAtRuntime: false,
  runtimeBinding: 'METRO_SPAWN_ANCHOR',
};
